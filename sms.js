const https = require("https");

const MNOTIFY_API_KEY = process.env.MNOTIFY_API_KEY;
const MNOTIFY_SENDER_ID = process.env.MNOTIFY_SENDER_ID || "StorVac"; // max 11 characters

/**
 * Sends an SMS via mNotify's Quick SMS API.
 * phone: local Ghana format works best, e.g. "0244000000"
 * message: the text to send
 * Resolves to true/false — never throws, so a failed SMS never blocks
 * a booking or payment from completing. Errors are logged server-side.
 */
function sendSms(phone, message) {
  return new Promise((resolve) => {
    if (!MNOTIFY_API_KEY) {
      console.warn("MNOTIFY_API_KEY is not set in .env — skipping SMS send.");
      return resolve(false);
    }
    if (!phone) {
      console.warn("No phone number on file — skipping SMS send.");
      return resolve(false);
    }

    const payload = JSON.stringify({
      recipient: [phone],
      sender: MNOTIFY_SENDER_ID,
      message,
      is_schedule: false,
      schedule_date: "",
    });

    const options = {
      hostname: "api.mnotify.com",
      path: `/api/sms/quick?key=${encodeURIComponent(MNOTIFY_API_KEY)}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === "success") {
            resolve(true);
          } else {
            console.error("mNotify SMS failed:", parsed);
            resolve(false);
          }
        } catch (e) {
          console.error("mNotify SMS response was not valid JSON:", data);
          resolve(false);
        }
      });
    });

    req.on("error", (err) => {
      console.error("mNotify SMS request error:", err.message);
      resolve(false);
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { sendSms };
