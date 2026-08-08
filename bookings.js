const express = require("express");
const https = require("https");
const db = require("../db");
const { calculateTotal } = require("../utils/pricing");
const { generateBookingCode } = require("../utils/bookingCode");
const { requireStudent } = require("../middleware/auth");
const { ITEMS, PACKAGES, ROOM_PICKUP_RATES, OTHER_PICKUP_FLAT_FEE } = require("../data/items");
const { sendSms } = require("../utils/sms");

const router = express.Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Public: item catalog + packages, for rendering the booking form
router.get("/catalog", (req, res) => {
  res.json({
    items: ITEMS,
    packages: PACKAGES,
    roomPickupRates: ROOM_PICKUP_RATES,
    otherPickupFlatFee: OTHER_PICKUP_FLAT_FEE,
  });
});

// Public-ish: live price preview as the student ticks boxes (no auth needed to preview)
router.post("/calculate", (req, res) => {
  try {
    const { items, roomPickup, package: pkg } = req.body;
    const breakdown = calculateTotal(items, roomPickup, pkg);
    res.json(breakdown);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Student must be logged in + have accepted terms to initiate a booking.
// This creates a "pending" booking row and a Paystack transaction reference,
// then returns what the frontend needs to open the Paystack Inline popup.
router.post("/initiate", requireStudent, async (req, res) => {
  try {
    const { items, roomPickup, package: pkg, termsAccepted, email } = req.body;

    if (!termsAccepted) {
      return res.status(400).json({ error: "You must accept the Terms & Conditions to continue." });
    }

    // Email is optional on the site (SMS is the main receipt channel), but Paystack's
    // transaction API requires a syntactically valid email. If the student didn't give
    // one, use a placeholder tied to their account — it's never used to actually email them.
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
    const payerEmail = (email && email.trim()) || user.email || `${user.phone}@storvac.local`;

    const breakdown = calculateTotal(items, roomPickup, pkg);
    if (breakdown.total <= 0) {
      return res.status(400).json({ error: "Total must be greater than zero." });
    }

    const reference = `SV_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

    db.prepare(
      `INSERT INTO bookings
        (booking_code, user_id, items_json, room_pickup, package, items_subtotal, room_pickup_fee, total_amount,
         terms_accepted_at, paystack_reference, status)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, 'pending')`
    ).run(
      req.userId,
      JSON.stringify(breakdown.lines),
      breakdown.roomPickup ? 1 : 0,
      pkg,
      breakdown.itemsSubtotal,
      breakdown.pickupFee,
      breakdown.total,
      reference
    );

    // Amount to Paystack must be in the smallest currency unit (pesewas for GHS)
    res.json({
      reference,
      amountPesewas: Math.round(breakdown.total * 100),
      amount: breakdown.total,
      email: payerEmail,
      breakdown,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not start booking." });
  }
});

// After the Paystack popup reports success, the frontend calls this with the
// reference. We NEVER trust the frontend's word alone — we verify server-side
// with Paystack directly, using the secret key, before marking anything paid.
router.post("/verify", requireStudent, async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ error: "Missing payment reference." });

    const booking = db
      .prepare("SELECT * FROM bookings WHERE paystack_reference = ? AND user_id = ?")
      .get(reference, req.userId);
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    if (booking.status === "paid" || booking.status === "ready" || booking.status === "collected") {
      return res.json({ alreadyVerified: true, booking: formatBooking(booking) });
    }

    const verification = await verifyWithPaystack(reference);

    if (verification.data.status !== "success") {
      return res.status(400).json({ error: "Payment was not successful." });
    }

    const paidPesewas = verification.data.amount;
    const expectedPesewas = Math.round(booking.total_amount * 100);
    if (paidPesewas !== expectedPesewas) {
      return res.status(400).json({ error: "Paid amount does not match booking total." });
    }

    const bookingCode = generateBookingCode();
    const channel = verification.data.channel; // 'mobile_money' | 'card' | etc.

    db.prepare(
      `UPDATE bookings SET status = 'paid', booking_code = ?, payment_method = ?, paid_at = datetime('now')
       WHERE id = ?`
    ).run(bookingCode, channel, booking.id);

    const updated = db.prepare("SELECT * FROM bookings WHERE id = ?").get(booking.id);

    // Send the booking code by SMS — this is the primary receipt channel.
    // Never let an SMS failure block the response; the booking is already saved.
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
    if (user && user.phone) {
      const smsText =
        `StorVac Logistics: Payment received, GHS ${updated.total_amount.toFixed(2)}. ` +
        `Your booking code is ${bookingCode}. Package: ${PACKAGES[updated.package].label}. ` +
        `Keep this code safe — you'll need it for pickup.`;
      sendSms(user.phone, smsText); // fire-and-forget, does not block the response
    }

    res.json({ booking: formatBooking(updated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not verify payment. Please contact support with your reference." });
  }
});

router.get("/mine", requireStudent, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.userId);
  res.json({ bookings: rows.map(formatBooking) });
});

// Public lookup by booking code — intentionally returns limited info
router.get("/track/:code", (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const row = db.prepare("SELECT * FROM bookings WHERE booking_code = ?").get(code);
  if (!row) return res.status(404).json({ error: "No booking found with that code." });
  const user = db.prepare("SELECT name, hall, room FROM users WHERE id = ?").get(row.user_id);
  res.json({ booking: { ...formatBooking(row), studentName: user.name, hall: user.hall, room: user.room } });
});

function formatBooking(row) {
  return {
    id: row.id,
    bookingCode: row.booking_code,
    items: JSON.parse(row.items_json),
    roomPickup: !!row.room_pickup,
    package: row.package,
    packageLabel: PACKAGES[row.package] ? PACKAGES[row.package].label : row.package,
    itemsSubtotal: row.items_subtotal,
    roomPickupFee: row.room_pickup_fee,
    totalAmount: row.total_amount,
    paymentMethod: row.payment_method,
    status: row.status,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    collectedAt: row.collected_at,
  };
}

function verifyWithPaystack(reference) {
  return new Promise((resolve, reject) => {
    if (!PAYSTACK_SECRET_KEY) {
      return reject(new Error("PAYSTACK_SECRET_KEY is not set in .env"));
    }
    const options = {
      hostname: "api.paystack.co",
      path: `/transaction/verify/${encodeURIComponent(reference)}`,
      method: "GET",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    };
    const req = https.request(options, (r) => {
      let data = "";
      r.on("data", (chunk) => (data += chunk));
      r.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

module.exports = router;
