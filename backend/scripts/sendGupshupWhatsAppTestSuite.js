/**
 * Sends one booking-confirmation template (same helper as roster open-booking confirm).
 *
 * Usage (from backend):
 *   npm run gupshup:test:all -- 8910369548
 *
 * Forces GUPSHUP_ENABLED for this process only (so .env can stay false for normal dev).
 * Optional: GUPSHUP_TEST_LINK_URL in backend/.env for Meet URL (template param 4).
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
process.env.GUPSHUP_ENABLED = "true";

const { sendRosterBookingConfirmedWhatsApp } = require("../src/modules/notifications/gupshupWhatsApp.service");
const env = require("../src/config/env");

async function main() {
  const raw = process.argv[2];
  if (!raw) {
    console.error("Usage: npm run gupshup:test:all -- <10-digit India mobile or 91...>");
    setImmediate(() => process.exit(1));
    return;
  }

  const { apiKey, waSource, srcName, templateName } = env.gupshup;
  if (!apiKey || !waSource || !srcName || !templateName) {
    console.error(
      "Set GUPSHUP_API_KEY, GUPSHUP_WA_SOURCE, GUPSHUP_SRC_NAME, and GUPSHUP_TEMPLATE_NAME in backend/.env",
    );
    setImmediate(() => process.exit(1));
    return;
  }

  const link =
    String(process.env.GUPSHUP_TEST_LINK_URL || "").trim() ||
    "https://meet.link/abc123";

  const base = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  base.setMinutes(0, 0, 0);
  const confirmedStart = new Date(base);
  const confirmedEnd = new Date(confirmedStart.getTime() + 120 * 60 * 1000);

  console.info(`Confirmation (${templateName}) …`, confirmedStart.toISOString());
  const result = await sendRosterBookingConfirmedWhatsApp({
    rosterMobile: raw,
    startTime: confirmedStart,
    endTime: confirmedEnd,
    meetingLink: link,
  });
  console.info(JSON.stringify(result, null, 2));
  console.info("Done. Check WhatsApp and backend logs for Gupshup HTTP errors.");
  setImmediate(() => process.exit(result.ok ? 0 : 1));
}

main().catch((e) => {
  console.error(e);
  setImmediate(() => process.exit(1));
});
