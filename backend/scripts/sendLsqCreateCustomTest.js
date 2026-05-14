/**
 * One-off LeadSquared ProspectActivity.svc/CreateCustom POST (same JSON shape as open booking).
 *
 * Usage (from backend folder):
 *   npm run lsq:createcustom:test
 *   npm run lsq:createcustom:test -- 9876543210
 *
 * Uses: LSQ_PROSPECT_ACTIVITY_BASE_URL, ACCESS_KEY, SECRET_KEY, EVENT_ID (optional), PHONE_PREFIX (optional).
 * Does not require LSQ_PROSPECT_ACTIVITY_ENABLED=true (CLI always sends if keys are set).
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const env = require("../src/config/env");
const {
  buildCreateCustomUrl,
  interpretLsqCreateCustomResponse,
  buildRosterBookingProspectActivityPayload,
} = require("../src/modules/integrations/lsq/lsqProspectActivity.service");

const randSuffix = () => Math.random().toString(36).slice(2, 10);

async function main() {
  const cfg = env.lsqProspectActivity;
  const { baseUrl, accessKey, secretKey, timeoutMs } = cfg;
  if (!baseUrl || !accessKey || !secretKey) {
    console.error(
      "Missing LSQ_PROSPECT_ACTIVITY_BASE_URL, LSQ_PROSPECT_ACTIVITY_ACCESS_KEY, or LSQ_PROSPECT_ACTIVITY_SECRET_KEY in backend/.env",
    );
    process.exit(1);
  }

  const argPhone = process.argv[2];
  let rawMobile = argPhone ? String(argPhone).replace(/\D/g, "") : "";
  if (!rawMobile) {
    rawMobile = `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
  }
  if (!/^[1-9]\d{9}$/.test(rawMobile)) {
    console.error("Phone must be exactly 10 digits (India-style), first digit 1–9, or omit for random.");
    process.exit(1);
  }

  const suffix = randSuffix();
  /** Many tenants disallow future ActivityDateTime — use a short window ending “now”. */
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 60 * 1000);

  const roster = {
    mobile: rawMobile,
    name: `CLI Test ${suffix}`,
    grade: String(9 + Math.floor(Math.random() * 4)),
    display: "NEET",
    batchName: "CLI Random Batch",
    batchId: `cli-${suffix}`,
  };
  const teacher = { email: `teacher-${suffix}@example.com` };
  const booking = {
    startTime: start,
    endTime: end,
    id: "cli-test",
    meetingLink: "https://meet.google.com/ttx-nbnp-vwu",
  };
  const contactEmail = `student-${suffix}@example.com`;

  const built = buildRosterBookingProspectActivityPayload({
    roster,
    teacher,
    booking,
    contactEmail,
  });
  if (!built.ok) {
    console.error("Failed to build payload:", built.reason);
    process.exit(1);
  }

  const url = buildCreateCustomUrl(baseUrl, accessKey, secretKey);
  const ms = Math.max(1000, Math.min(120000, Number(timeoutMs) || 15000));
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);

  console.log("POST", url.split("?")[0], "(keys in query string)");
  console.log("Body:", JSON.stringify(built.body, null, 2));

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(built.body),
      signal: controller.signal,
    });
    const text = await res.text();
    const interpreted = interpretLsqCreateCustomResponse(res.ok, text);
    if (!res.ok) {
      console.error("HTTP", res.status, text.slice(0, 600));
      process.exit(1);
    }
    if (!interpreted.ok) {
      console.error("LeadSquared rejected:", interpreted.detail);
      console.error("Parsed:", JSON.stringify(interpreted.parsed, null, 2));
      process.exit(1);
    }
    console.log("OK — LeadSquared response:", JSON.stringify(interpreted.parsed, null, 2));
  } catch (e) {
    console.error(e?.name === "AbortError" ? `Request timed out after ${ms}ms` : e);
    process.exit(1);
  } finally {
    clearTimeout(t);
  }
}

main();
