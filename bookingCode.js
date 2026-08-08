const crypto = require("crypto");

// Generates a code like SV-7X4K9Q — unambiguous characters only (no 0/O, 1/I)
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateBookingCode() {
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `SV-${code}`;
}

module.exports = { generateBookingCode };
