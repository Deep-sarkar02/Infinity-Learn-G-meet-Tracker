const env = require("../../../config/env");
const logger = require("../../../config/logger");
const {
  formatLsqActivityDateTimeUtc,
  formatLsqDateDdMmYyyyIst,
  formatLsqTime12hIst,
} = require("../../../utils/time");

function buildCreateCustomUrl(baseUrl, accessKey, secretKey) {
  let b = String(baseUrl || "").trim().replace(/\/+$/, "");
  /** Env sometimes mistakenly includes the full path; we append it below. */
  b = b.replace(/\/ProspectActivity\.svc\/CreateCustom$/i, "");
  b = b.replace(/\/ProspectActivity\.svc$/i, "");
  b = b.replace(/\/+$/, "");
  const ak = encodeURIComponent(String(accessKey || "").trim());
  const sk = encodeURIComponent(String(secretKey || "").trim());
  return `${b}/ProspectActivity.svc/CreateCustom?accessKey=${ak}&secretKey=${sk}`;
}

/**
 * LeadSquared often returns HTTP 200 with JSON `{ Status: "Error", ... }` — treat that as failure.
 * @returns {{ ok: true, parsed?: object } | { ok: false, detail: string, parsed?: object }}
 */
function interpretLsqCreateCustomResponse(httpOk, rawText) {
  const text = String(rawText ?? "");
  const trimmed = text.trim();
  if (!httpOk) {
    try {
      const j = JSON.parse(trimmed);
      return { ok: false, detail: text.slice(0, 800), parsed: j };
    } catch {
      return { ok: false, detail: text.slice(0, 800) };
    }
  }
  if (!trimmed) {
    return { ok: true, parsed: null };
  }
  try {
    const j = JSON.parse(trimmed);
    const status = String(j.Status ?? j.status ?? "").trim();
    if (status && status.toLowerCase() !== "success") {
      const msg =
        typeof j.Message === "string"
          ? j.Message
          : j.Message != null && typeof j.Message === "object"
            ? JSON.stringify(j.Message)
            : j.ExceptionMessage ||
              j.ExceptionType ||
              j.Error ||
              trimmed.slice(0, 500);
      return { ok: false, detail: String(msg).slice(0, 800), parsed: j };
    }
    return { ok: true, parsed: j };
  } catch {
    const lower = trimmed.toLowerCase();
    if (lower.includes('"status":"error"') || lower.includes("<html")) {
      return { ok: false, detail: trimmed.slice(0, 800) };
    }
    return { ok: true, parsed: { _nonJson: trimmed.slice(0, 300) } };
  }
}

/**
 * Builds the JSON body for LeadSquared `ProspectActivity.svc/CreateCustom` (roster booking).
 * Does not check API keys or enabled flag.
 *
 * @returns {{ ok: true, body: object } | { ok: false, reason: string }}
 */
function buildRosterBookingProspectActivityPayload({ roster, teacher, booking, contactEmail }) {
  const cfg = env.lsqProspectActivity;
  const start = booking?.startTime ? new Date(booking.startTime) : null;
  const end = booking?.endTime ? new Date(booking.endTime) : null;
  if (!start || Number.isNaN(start.getTime())) {
    return { ok: false, reason: "invalid_booking_startTime" };
  }

  const rawPhone = String(roster?.mobile || "").replace(/\D/g, "");
  const phonePrefix = String(cfg?.phonePrefix || "").replace(/\D/g, "");
  /** LeadSquared often matches leads on full mobile with country code (e.g. 91 + 10 digits). */
  const phone =
    phonePrefix && /^[1-9]\d{9}$/.test(rawPhone) ? `${phonePrefix}${rawPhone}` : rawPhone;
  const firstName = String(roster?.name || "").trim() || "Student";
  const grade = roster?.grade != null && roster?.grade !== "" ? String(roster.grade) : "";

  /** LSQ often parses naive ActivityDateTime as UTC — use UTC digits; never send a future instant. */
  const nowMs = Date.now();
  const preferredMs = cfg.useSessionStartForActivityDateTime ? start.getTime() : nowMs;
  const activityInstant = new Date(Math.min(preferredMs, nowMs));
  const activityDateTime = formatLsqActivityDateTimeUtc(activityInstant);
  const dateDdMmYyyy = formatLsqDateDdMmYyyyIst(start);
  const fromTime = formatLsqTime12hIst(start);
  const toTime = end && !Number.isNaN(end.getTime()) ? formatLsqTime12hIst(end) : "";

  const teacherEmail = String(teacher?.email || "").trim();
  const studentMeetEmail = String(contactEmail || "").trim();
  const meetingLink = String(booking?.meetingLink || "").trim();

  /** Matches LeadSquared CreateCustom: LeadDetails = Attribute/Value array; Fields live under Activity. */
  const body = {
    LeadDetails: [
      { Attribute: "Phone", Value: phone },
      { Attribute: "FirstName", Value: firstName },
      { Attribute: "mx_Grade", Value: grade },
      { Attribute: "SearchBy", Value: "Phone" },
    ],
    Activity: {
      ActivityEvent: Number(cfg?.eventId) || 223,
      ActivityNote: "",
      ActivityDateTime: activityDateTime,
      Fields: [
        { SchemaName: "mx_Custom_1", Value: String(roster?.name || "").trim() },
        { SchemaName: "mx_Custom_2", Value: grade },
        { SchemaName: "mx_Custom_3", Value: teacherEmail },
        { SchemaName: "mx_Custom_4", Value: studentMeetEmail },
        { SchemaName: "mx_Custom_5", Value: dateDdMmYyyy },
        { SchemaName: "mx_Custom_6", Value: fromTime },
        { SchemaName: "mx_Custom_7", Value: String(roster?.display || "").trim() },
        { SchemaName: "mx_Custom_8", Value: String(roster?.batchName || "").trim() },
        { SchemaName: "mx_Custom_9", Value: String(roster?.batchId || "").trim() },
        { SchemaName: "mx_Custom_10", Value: toTime },
        { SchemaName: "mx_Custom_11", Value: meetingLink },
      ],
    },
  };

  return { ok: true, body };
}

/**
 * Posts LeadSquared CreateCustom for a roster / open booking.
 * Does not throw. Returns a small status object (for dev client debug when awaited).
 *
 * @param {{ roster: object, teacher: object, booking: object, contactEmail: string, body?: object | null }} args
 * If `body` is provided (from {@link buildRosterBookingProspectActivityPayload}), it is used as POST JSON; otherwise it is built here.
 * @returns {Promise<
 *   | { skipped: true, reason: string }
 *   | { skipped: false, ok: true, httpStatus: number, lsqResponse?: object | null }
 *   | { skipped: false, ok: false, httpStatus?: number, detail?: string, lsqResponse?: object | null }
 * >}
 */
async function notifyRosterBookingProspectActivity({ roster, teacher, booking, contactEmail, body: bodyArg }) {
  const cfg = env.lsqProspectActivity;
  if (!cfg?.enabled) {
    return { skipped: true, reason: "lsq_disabled" };
  }

  const baseUrl = cfg.baseUrl;
  const accessKey = cfg.accessKey;
  const secretKey = cfg.secretKey;
  if (!baseUrl || !accessKey || !secretKey) {
    logger.warn(
      "[lsqProspectActivity] LSQ_PROSPECT_ACTIVITY_ENABLED=true but base URL or keys missing; skipping CreateCustom",
    );
    return { skipped: true, reason: "missing_credentials" };
  }

  let body = bodyArg;
  if (!body || typeof body !== "object") {
    const built = buildRosterBookingProspectActivityPayload({ roster, teacher, booking, contactEmail });
    if (!built.ok) {
      logger.warn(`[lsqProspectActivity] skip CreateCustom: ${built.reason}`);
      return { skipped: true, reason: built.reason };
    }
    body = built.body;
  }

  if (cfg.serverLogPayload) {
    logger.info(`[lsqProspectActivity] CreateCustom POST body: ${JSON.stringify(body)}`);
  }

  const url = buildCreateCustomUrl(baseUrl, accessKey, secretKey);
  const timeoutMs = Math.max(1000, Math.min(120000, Number(cfg.timeoutMs) || 15000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    const looksLikeInvalidLsqKeys =
      res.status === 401 ||
      /MXInvalidUserDetailsException|Invalid User Details/i.test(text);
    if (!res.ok) {
      logger.warn(
        `[lsqProspectActivity] CreateCustom HTTP ${res.status} ${res.statusText}: ${text.slice(0, 500)}`,
      );
      if (looksLikeInvalidLsqKeys) {
        logger.warn(
          "[lsqProspectActivity] LeadSquared rejected API keys (401 / Invalid User Details). " +
            "Confirm LSQ_PROSPECT_ACTIVITY_ACCESS_KEY and LSQ_PROSPECT_ACTIVITY_SECRET_KEY. " +
            "If you use Docker Compose env_file and a key contains $, Compose strips it unless you escape: use $$ for each literal $ in backend/.env (see docker-compose.yml top comment).",
        );
      }
      const bad = interpretLsqCreateCustomResponse(false, text);
      return {
        skipped: false,
        ok: false,
        httpStatus: res.status,
        detail: bad.detail,
        lsqResponse: bad.parsed,
      };
    }

    const interpreted = interpretLsqCreateCustomResponse(true, text);
    if (!interpreted.ok) {
      logger.warn(
        `[lsqProspectActivity] CreateCustom LSQ rejected (HTTP ${res.status}): ${interpreted.detail}`,
      );
      const detail = String(interpreted.detail || "");
      const parsed = interpreted.parsed;
      const ex = parsed && typeof parsed === "object" ? String(parsed.ExceptionType || "") : "";
      if (/MXInvalidUserDetailsException|Invalid User Details/i.test(detail + ex)) {
        logger.warn(
          "[lsqProspectActivity] LeadSquared rejected API keys. " +
            "If keys look correct, check Docker Compose: escape $ as $$ in LSQ_PROSPECT_ACTIVITY_* keys in backend/.env.",
        );
      }
      return {
        skipped: false,
        ok: false,
        httpStatus: res.status,
        detail: interpreted.detail,
        lsqResponse: interpreted.parsed,
      };
    }

    logger.info(
      `[lsqProspectActivity] CreateCustom OK for roster booking ${booking?.id || ""}: ${text.slice(0, 200)}`,
    );
    return { skipped: false, ok: true, httpStatus: res.status, lsqResponse: interpreted.parsed };
  } catch (e) {
    const msg = e?.name === "AbortError" ? `timeout after ${timeoutMs}ms` : e?.message || String(e);
    logger.warn(`[lsqProspectActivity] CreateCustom failed: ${msg}`);
    return { skipped: false, ok: false, detail: msg };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  buildCreateCustomUrl,
  interpretLsqCreateCustomResponse,
  buildRosterBookingProspectActivityPayload,
  notifyRosterBookingProspectActivity,
};
