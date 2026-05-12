const env = require("../../config/env");
const logger = require("../../config/logger");
const waCopy = require("../../config/gupshupWhatsApp.copy");
const { normalizeMobile } = require("../../utils/mobile");

const IST_ZONE = "Asia/Kolkata";

/** Log once if sends run without GUPSHUP_SRC_NAME (noisy otherwise). */
let loggedMissingGupshupSrcName = false;

/** Booking confirmation param 1 — e.g. "6 May 2026" (IST). */
const formatWaDateConfirmParam = (instant) => {
  const d = new Date(instant);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
};

/** Booking confirmation params 2–3 — e.g. "10:30 AM" (IST). */
const formatWaTimeConfirmParam = (instant) => {
  const d = new Date(instant);
  if (Number.isNaN(d.getTime())) return "";
  const s = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return s.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
};

/** Gupshup expects digits only, India: 91 + 10-digit mobile. */
const toGupshupIndiaDestination = (rawMobile) => {
  const ten = normalizeMobile(rawMobile);
  if (!ten || !/^[1-9]\d{9}$/.test(ten)) return null;
  return `91${ten}`;
};

/**
 * True when booking confirmation WhatsApp should be attempted (roster mobile + config).
 * Requires GUPSHUP_SRC_NAME — matches Gupshup template/msg expectations.
 */
const isParentWhatsAppDispatchEligible = (rosterMobile) => {
  if (!env.gupshup.enabled) return false;
  const { apiKey, waSource, srcName } = env.gupshup;
  if (!apiKey || !waSource || !srcName) return false;
  return Boolean(toGupshupIndiaDestination(rosterMobile));
};

/** Gupshup `/template/msg` expects `{"id":"<template id>","params":["…"]}` */
const buildGupshupTemplateFormPayload = (templateId, bodyTexts) =>
  JSON.stringify({
    id: templateId,
    params: bodyTexts.map((text) => String(text ?? "").slice(0, 1024)),
  });

/** Result returned to API clients for browser console / debugging (safe to expose). */
const skipWa = (skippedReason) => ({
  skipped: true,
  requested: false,
  ok: false,
  skippedReason,
});

/**
 * POST https://api.gupshup.io/wa/api/v1/template/msg
 * Headers: Content-Type application/x-www-form-urlencoded, apikey
 * Body: channel, source, destination, src.name (when set), template JSON
 *
 * @returns {Promise<{ skipped: boolean, requested: boolean, ok: boolean, skippedReason?: string, httpStatus?: number, messageId?: string, detail?: string, destinationLast4?: string, templateUsed?: string }>}
 */
const sendGupshupTemplateToRoster = async ({ templateName, rosterMobile, bodyTexts }) => {
  if (!env.gupshup.enabled) {
    logger.warn(
      "Gupshup WhatsApp skipped — set GUPSHUP_ENABLED=true in backend/.env and restart the API",
    );
    return skipWa("gupshup_disabled");
  }
  const { apiKey, waSource, srcName, apiUrl } = env.gupshup;
  if (!apiKey || !waSource) {
    logger.warn("Gupshup WhatsApp: enabled but GUPSHUP_API_KEY or GUPSHUP_WA_SOURCE is empty");
    return skipWa("missing_api_credentials");
  }
  const destination = toGupshupIndiaDestination(rosterMobile);
  if (!destination) {
    logger.warn("Gupshup WhatsApp: skip — roster mobile is not a valid 10-digit India number");
    return skipWa("invalid_roster_mobile");
  }

  const params = new URLSearchParams();
  params.set("channel", "whatsapp");
  params.set("source", waSource.replace(/\D/g, ""));
  params.set("destination", destination);
  if (srcName) {
    params.set("src.name", srcName);
  } else if (!loggedMissingGupshupSrcName) {
    loggedMissingGupshupSrcName = true;
    logger.warn(
      "Gupshup WhatsApp: GUPSHUP_SRC_NAME is empty — sending without src.name (set it if template sends fail)",
    );
  }
  params.set("template", buildGupshupTemplateFormPayload(templateName, bodyTexts));

  try {
    if (typeof fetch !== "function") {
      logger.warn("Gupshup WhatsApp: global fetch is not available (use Node 18+)");
      return skipWa("fetch_not_available");
    }
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      const detail = bodyText.slice(0, 240);
      logger.warn(
        `Gupshup WhatsApp API HTTP ${res.status} (template="${templateName}", …${destination.slice(-4)}): ${bodyText.slice(0, 800)}`,
      );
      return {
        skipped: false,
        requested: true,
        ok: false,
        httpStatus: res.status,
        detail,
        destinationLast4: destination.slice(-4),
        templateUsed: templateName,
      };
    }
    let messageId = "";
    try {
      const j = JSON.parse(bodyText);
      messageId = j.messageId || j.message_id || j.id || "";
    } catch (_) {
      /* non-JSON body */
    }
    logger.info(
      messageId
        ? `Gupshup WhatsApp OK messageId=${messageId} template="${templateName}" params=${bodyTexts.length} …${destination.slice(-4)}`
        : `Gupshup WhatsApp OK HTTP ${res.status} template="${templateName}" body=${bodyText.slice(0, 400)}`,
    );
    return {
      skipped: false,
      requested: true,
      ok: true,
      httpStatus: res.status,
      messageId: messageId || undefined,
      detail: messageId ? undefined : bodyText.slice(0, 160),
      destinationLast4: destination.slice(-4),
      templateUsed: templateName,
    };
  } catch (err) {
    logger.warn(`Gupshup WhatsApp request failed: ${err.message}`);
    return {
      skipped: false,
      requested: true,
      ok: false,
      detail: String(err.message || err).slice(0, 240),
      destinationLast4: destination.slice(-4),
      templateUsed: templateName,
    };
  }
};

/**
 * Roster booking confirmed — only WhatsApp path we support.
 * params: [ session date IST, start time IST, end time IST, Meet link ]
 */
const sendRosterBookingConfirmedWhatsApp = async ({ rosterMobile, startTime, endTime, meetingLink }) => {
  const { templateName } = env.gupshup;
  if (!templateName) {
    logger.warn("Gupshup WhatsApp: GUPSHUP_TEMPLATE_NAME is empty — skip confirmation template send");
    return skipWa("missing_template_id");
  }
  const dateText = formatWaDateConfirmParam(startTime);
  const startText = formatWaTimeConfirmParam(startTime);
  const endText = formatWaTimeConfirmParam(endTime);
  const rawLink = String(meetingLink || "").trim();
  const linkText = rawLink || waCopy.confirmMeetLinkFallback;
  return sendGupshupTemplateToRoster({
    templateName,
    rosterMobile,
    bodyTexts: [dateText, startText, endText, linkText],
  });
};

module.exports = {
  sendRosterBookingConfirmedWhatsApp,
  isParentWhatsAppDispatchEligible,
};
