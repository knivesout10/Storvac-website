const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "storvac.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  institution TEXT NOT NULL,
  hall TEXT NOT NULL,
  room TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_code TEXT UNIQUE,
  user_id INTEGER NOT NULL,
  items_json TEXT NOT NULL,
  room_pickup INTEGER NOT NULL DEFAULT 0,
  package TEXT NOT NULL,
  items_subtotal REAL NOT NULL,
  room_pickup_fee REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL,
  terms_accepted_at TEXT NOT NULL,
  payment_method TEXT,
  paystack_reference TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | ready | collected | cancelled
  created_at TEXT DEFAULT (datetime('now')),
  paid_at TEXT,
  collected_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

// Idempotent migration: adds room_pickup_fee to a bookings table created by
// an earlier version of this project, without touching existing rows.
const bookingColumns = db.prepare("PRAGMA table_info(bookings)").all().map((c) => c.name);
if (!bookingColumns.includes("room_pickup_fee")) {
  db.exec("ALTER TABLE bookings ADD COLUMN room_pickup_fee REAL NOT NULL DEFAULT 0");
}

module.exports = db;
