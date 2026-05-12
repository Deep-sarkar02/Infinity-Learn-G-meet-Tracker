/**
 * One-off Gupshup template send using backend/.env (same shape as app booking WhatsApp).
 *
 * Usage (from backend folder):
 *   npm run gupshup:test -- 9876543210
 *   npm run gupshup:test -- 919876543210
 *
 * Requires: GUPSHUP_ENABLED=true, GUPSHUP_API_KEY, GUPSHUP_WA_SOURCE,
 * optional GUPSHUP_SRC_NAME (recommended), approved template (4 params). POST …/template/msg.
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const env = require("../src/config/env");
const { normalizeMobile } = require("../src/utils/mobile");

const toGupshupIndiaDestination = (rawMobile) => {
  const ten = normalizeMobile(rawMobile);
  if (!ten || !/^[1-9]\d{9}$/.test(ten)) return null;
  return `91${ten}`;
};

async function main() {
  const raw = process.argv[2];
  if (!raw) {
    console.error("Usage: npm run gupshup:test -- <10-digit India mobile or 91...>");
    process.exit(1);
  }

  const destination = toGupshupIndiaDestination(raw);
  if (!destination) {
    console.error("Invalid India mobile: need 10 digits (first digit 1–9), or 91 + those 10 digits.");
    process.exit(1);
  }

  const { enabled, apiKey, waSource, srcName, templateName, apiUrl } = env.gupshup;
  if (!enabled) {
    console.error("Set GUPSHUP_ENABLED=true in backend/.env");
    process.exit(1);
  }
  if (!apiKey || !waSource) {
    console.error("Set GUPSHUP_API_KEY and GUPSHUP_WA_SOURCE in backend/.env");
    process.exit(1);
  }
  if (!srcName) {
    console.error("Set GUPSHUP_SRC_NAME to your WhatsApp app name (Gupshup dashboard / API src.name).");
    process.exit(1);
  }

  const sampleStart = new Date(Date.now() + 86400000);
  const sampleEnd = new Date(sampleStart.getTime() + 45 * 60 * 1000);
  const fmtDate = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(sampleStart);
  const fmtTime = (d) =>
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);

  const paramsList = [
    fmtDate,
    fmtTime(sampleStart),
    fmtTime(sampleEnd),
    (process.env.GUPSHUP_TEST_LINK_URL || "").trim() ||
      "Sample Meet link — set GUPSHUP_TEST_LINK_URL in .env for a real URL test.",
  ];
  const templateJson = JSON.stringify({ id: templateName, params: paramsList });

  const params = new URLSearchParams();
  params.set("channel", "whatsapp");
  params.set("source", waSource.replace(/\D/g, ""));
  params.set("destination", destination);
  if (srcName) params.set("src.name", srcName);
  params.set("template", templateJson);

  if (typeof fetch !== "function") {
    console.error("Node 18+ required (global fetch).");
    process.exit(1);
  }

  console.info(`POST ${apiUrl} template "${templateName}" (${paramsList.length} params) → …${destination.slice(-4)}`);
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      apikey: apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const text = await res.text();
  console.info(`HTTP ${res.status}`);
  console.info(text.slice(0, 2000));
  const code = res.ok ? 0 : 1;
  setImmediate(() => process.exit(code));
}

main().catch((e) => {
  console.error(e);
  setImmediate(() => process.exit(1));
});
