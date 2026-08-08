const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { signStudentToken } = require("../middleware/auth");

const router = express.Router();

const INSTITUTIONS = [
  "University of Ghana",
  "UPSA",
  "Knutsford University College",
  "Wisconsin University College",
];

router.get("/institutions", (req, res) => {
  res.json({ institutions: INSTITUTIONS });
});

router.post("/signup", async (req, res) => {
  try {
    const { name, phone, email, password, institution, hall, room } = req.body;

    if (!name || !password || !institution || !hall || !room) {
      return res.status(400).json({ error: "Please fill in all required fields." });
    }
    if (!phone) {
      return res.status(400).json({ error: "A phone number is required — booking codes and receipts are sent by SMS." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }
    if (!INSTITUTIONS.includes(institution)) {
      return res.status(400).json({ error: "Please select a valid institution." });
    }

    const existing = db
      .prepare("SELECT id FROM users WHERE (phone IS NOT NULL AND phone = ?) OR (email IS NOT NULL AND email = ?)")
      .get(phone || null, email || null);
    if (existing) {
      return res.status(409).json({ error: "An account with this phone number or email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const info = db
      .prepare(
        `INSERT INTO users (name, phone, email, password_hash, institution, hall, room)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(name, phone || null, email || null, passwordHash, institution, hall, room);

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    const token = signStudentToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, phone: user.phone, email: user.email, institution, hall, room },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong creating your account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier = phone or email
    if (!identifier || !password) {
      return res.status(400).json({ error: "Enter your phone/email and password." });
    }

    const user = db
      .prepare("SELECT * FROM users WHERE phone = ? OR email = ?")
      .get(identifier, identifier);

    if (!user) return res.status(401).json({ error: "No account found with that phone/email." });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Incorrect password." });

    const token = signStudentToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        institution: user.institution,
        hall: user.hall,
        room: user.room,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong logging you in." });
  }
});

module.exports = router;
