const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is not set in .env — using an insecure default for local dev only.");
}
const SECRET = JWT_SECRET || "dev-only-insecure-secret-change-me";

function signStudentToken(user) {
  return jwt.sign({ sub: user.id, role: "student" }, SECRET, { expiresIn: "30d" });
}

function signAdminToken() {
  return jwt.sign({ role: "admin" }, SECRET, { expiresIn: "12h" });
}

function requireStudent(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Please log in." });
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.role !== "student") return res.status(403).json({ error: "Not authorized." });
    req.userId = payload.sub;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Session expired, please log in again." });
  }
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Admin login required." });
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.role !== "admin") return res.status(403).json({ error: "Not authorized." });
    next();
  } catch (e) {
    return res.status(401).json({ error: "Session expired, please log in again." });
  }
}

module.exports = { signStudentToken, signAdminToken, requireStudent, requireAdmin };
