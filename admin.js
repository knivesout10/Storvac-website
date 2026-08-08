const express = require("express");
const db = require("../db");
const { signAdminToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const validUser = process.env.ADMIN_USERNAME;
  const validPass = process.env.ADMIN_PASSWORD;

  if (!validUser || !validPass) {
    return res.status(500).json({ error: "Admin credentials are not configured on the server (.env)." });
  }
  if (username !== validUser || password !== validPass) {
    return res.status(401).json({ error: "Incorrect admin username or password." });
  }
  res.json({ token: signAdminToken() });
});

// List all bookings, with optional filters: ?status=&q=(name/code/institution)
router.get("/bookings", requireAdmin, (req, res) => {
  const { status, q } = req.query;

  let sql = `
    SELECT b.*, u.name AS student_name, u.phone, u.email, u.institution, u.hall, u.room
    FROM bookings b JOIN users u ON u.id = b.user_id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += " AND b.status = ?";
    params.push(status);
  }
  if (q) {
    sql += ` AND (b.booking_code LIKE ? OR u.name LIKE ? OR u.institution LIKE ?)`;
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  sql += " ORDER BY b.created_at DESC";

  const rows = db.prepare(sql).all(...params);
  res.json({
    bookings: rows.map((row) => ({
      id: row.id,
      bookingCode: row.booking_code,
      studentName: row.student_name,
      phone: row.phone,
      email: row.email,
      institution: row.institution,
      hall: row.hall,
      room: row.room,
      items: JSON.parse(row.items_json),
      roomPickup: !!row.room_pickup,
      package: row.package,
      itemsSubtotal: row.items_subtotal,
      roomPickupFee: row.room_pickup_fee,
      totalAmount: row.total_amount,
      paymentMethod: row.payment_method,
      status: row.status,
      createdAt: row.created_at,
      paidAt: row.paid_at,
      collectedAt: row.collected_at,
    })),
  });
});

router.get("/summary", requireAdmin, (req, res) => {
  const active = db
    .prepare("SELECT COUNT(*) AS c FROM bookings WHERE status IN ('paid','ready')")
    .get().c;
  const collected = db.prepare("SELECT COUNT(*) AS c FROM bookings WHERE status = 'collected'").get().c;
  const revenue = db
    .prepare("SELECT COALESCE(SUM(total_amount),0) AS s FROM bookings WHERE status != 'pending' AND status != 'cancelled'")
    .get().s;
  res.json({ activeBookings: active, collectedBookings: collected, totalRevenue: revenue });
});

router.patch("/bookings/:id/collect", requireAdmin, (req, res) => {
  const { id } = req.params;
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  if (!booking) return res.status(404).json({ error: "Booking not found." });
  db.prepare("UPDATE bookings SET status = 'collected', collected_at = datetime('now') WHERE id = ?").run(id);
  res.json({ success: true });
});

router.patch("/bookings/:id/ready", requireAdmin, (req, res) => {
  const { id } = req.params;
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  if (!booking) return res.status(404).json({ error: "Booking not found." });
  db.prepare("UPDATE bookings SET status = 'ready' WHERE id = ?").run(id);
  res.json({ success: true });
});

module.exports = router;
