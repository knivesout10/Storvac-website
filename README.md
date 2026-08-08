# StorVac Logistics — Booking Website

A booking website for StorVac Logistics: students sign up, tick the items they
want stored, choose a storage package, accept the Terms & Conditions, and pay
by Mobile Money or card via Paystack. On successful payment they get a receipt
and a unique booking code. The owner has a separate Admin Dashboard to track
every booking and payment.

## What's inside

```
storvac/
├── server.js              Main Express app
├── db.js                  SQLite database setup (creates tables on first run)
├── data/items.js          Item price catalog, packages, room pickup fee schedule
├── utils/pricing.js       Server-side price calculation (source of truth)
├── utils/bookingCode.js   Generates booking codes like SV-7X4K9Q
├── middleware/auth.js     JWT auth for students and admin
├── routes/auth.js         Signup / login
├── routes/bookings.js     Catalog, price calc, payment initiate/verify, my bookings, track
├── routes/admin.js        Admin login, bookings list, mark ready/collected
└── public/                All frontend pages (plain HTML/CSS/JS, no build step)
```

## 1. Install requirements

You need [Node.js](https://nodejs.org) version 18 or later installed on your
computer.

Open a terminal in the `storvac` folder and run:

```bash
npm install
```

This downloads the few packages the site needs (Express, better-sqlite3,
bcryptjs, jsonwebtoken, dotenv).

## 2. Configure your environment

Copy `.env.example` to a new file named `.env`:

```bash
cp .env.example .env
```

Then open `.env` and fill in:

- **JWT_SECRET** — any long random string (used to sign login sessions).
  You can generate one with `openssl rand -hex 32`, or just mash the
  keyboard for 40+ characters.
- **PAYSTACK_PUBLIC_KEY** and **PAYSTACK_SECRET_KEY** — from your Paystack
  Dashboard → Settings → API Keys & Webhooks. Start with the **test** keys
  while you're setting things up; switch to **live** keys only when you're
  ready to accept real payments. Because your Paystack account is already
  linked to your Momo number, Paystack will settle every payment straight
  to you automatically — you don't need to do anything extra for that part.
- **ADMIN_USERNAME** and **ADMIN_PASSWORD** — whatever you want to log into
  the Admin Dashboard with. This is separate from student accounts.

**Never share your `.env` file or commit it to GitHub** — it holds your
secret Paystack key and admin password.

## 3. Run it locally

```bash
npm start
```

Then open **http://localhost:3000** in your browser. The database file
(`storvac.db`) is created automatically the first time you run the server —
no separate database setup needed.

- Book storage: `http://localhost:3000/book.html`
- Track a booking: `http://localhost:3000/track.html`
- Admin dashboard: `http://localhost:3000/admin-login.html`

## 4. How the pricing works (matches what you specified)

- Each ticked item has a flat storage price (see `ITEMS` in `data/items.js`).
- Standing Fan and Rice Cooker are free **only** if the total quantity of
  items ticked in the booking is 3 or more; otherwise they're charged at
  the "Other" bag rate (GHS 20). This lives in `BONUS_QUALIFYING_QTY` in
  `data/items.js` if you ever want to change the threshold.
- The **items subtotal** is multiplied by the package: ×1 for 1 month,
  ×1.5 for 1.5 months, ×2 for 2 months.
- **Room Pickup Service** is itemized rather than a flat fee (see
  `ROOM_PICKUP_RATES` in `data/items.js`):
  - Small Suitcase/Traveller or Small Check Bag — GHS 20 each
  - Big Suitcase/Traveller or Big Check Bag — GHS 25 each
  - Refrigerator (Small) — GHS 30, Refrigerator (Big) — GHS 40
  - Microwave — GHS 25
  - Any other item picked up alongside these adds one flat **GHS 10** to
    the trip total — charged once per booking, not per extra item
    (`OTHER_PICKUP_FLAT_FEE` in `data/items.js`). This also applies if a
    booking's pickup items are *only* miscellaneous ones with no set rate —
    worth confirming that's the behavior you want, since it wasn't fully
    spelled out; easy to change in `utils/pricing.js` if not.
  - The pickup total is added once, after the package multiplier — it is
    never itself multiplied by the package.
- All of this is calculated **server-side** in `utils/pricing.js`, so a
  student can't tamper with the total from their browser — the amount
  actually charged by Paystack always comes from the server's own
  calculation, not anything sent from the page.

If you ever change a price, only `data/items.js` needs editing — every page
and the payment amount will follow automatically.

## 5. How payment verification works (important for trust & security)

1. Student clicks **Pay Now** → the server creates a "pending" booking and a
   payment reference, and tells the browser the exact amount to charge.
2. The Paystack popup opens in the browser for Momo or card payment.
3. On success, the browser tells the server "payment succeeded, reference X."
4. The server does **not** trust that claim — it calls Paystack's own
   verify-transaction API directly with your secret key, checks the payment
   really succeeded and the amount matches the booking, and only then marks
   the booking paid and generates the booking code.

This is what stops someone from faking a successful payment message in their
browser to get free storage.

## 6. SMS receipts (via mNotify)

Phone number is now required at signup, and it's the main way students get
their booking code and receipt — the moment a payment is verified, the
server sends an SMS through **mNotify** with the amount paid, the package,
and the booking code. Email is optional; if a student does provide one, it's
still used for Paystack's own transaction record, but nothing is emailed to
them from the site itself right now.

To turn this on:

1. Your `.env` file already has `MNOTIFY_API_KEY` and `MNOTIFY_SENDER_ID`
   (`STORVAC LGX`) filled in — no setup needed here. **Because this zip now
   contains a live API key, treat it like a password: don't post it publicly,
   don't commit `.env` to a public GitHub repo (it's already excluded via
   `.gitignore`), and if it ever leaks, regenerate it from your mNotify
   dashboard.**
2. `utils/sms.js` handles the actual sending, and `routes/bookings.js` calls
   it right after a payment is confirmed.

If an SMS ever fails to send (bad network, low mNotify credit, etc.), it's
logged on the server but **never blocks the booking itself** — the booking
and payment are already saved before the SMS is attempted, so a student
never loses a paid booking because a text didn't go through. Worth checking
your mNotify credit balance occasionally so messages don't silently stop
sending.

If you'd like actual email receipts added on top of this later, that's a
separate small addition (e.g. via Resend or SendGrid) — just let me know.

## 7. Deploying it live (recommended: Railway)

For a small site like this, **[Railway](https://railway.app)** is the
simplest option — it hosts Node.js apps directly from a GitHub repo, gives
you a free starter tier, and supports a small **persistent volume**, which
you'll want so your SQLite database (`storvac.db`) doesn't get wiped every
time the app restarts.

Rough steps:

1. Push this `storvac` folder to a new GitHub repository.
2. On Railway, choose "Deploy from GitHub repo" and select it.
3. In Railway's project settings, add the same variables from your `.env`
   file (JWT_SECRET, PAYSTACK_PUBLIC_KEY, PAYSTACK_SECRET_KEY,
   ADMIN_USERNAME, ADMIN_PASSWORD, MNOTIFY_API_KEY, MNOTIFY_SENDER_ID)
   under "Variables."
4. Add a small persistent volume mounted at the project folder (Railway
   calls this a "Volume") so `storvac.db` survives restarts and deploys.
5. Railway will give you a live URL (e.g. `storvac-production.up.railway.app`)
   — you can later connect your own domain to it in the same settings page.

Once you're comfortable with everything, switch `PAYSTACK_PUBLIC_KEY` and
`PAYSTACK_SECRET_KEY` in Railway's variables from test to live keys, and
you're taking real payments.

## 8. Things you may want to add later

- Email receipts (see Section 6)
- SMS notifications when a booking is marked "Ready for Pickup"
- Hall/Hostel as a dropdown per institution instead of free text
- Ability to edit a booking's item list from the admin panel
- Export bookings to Excel/CSV from the admin dashboard

None of these are required to launch — the site works fully without them.
