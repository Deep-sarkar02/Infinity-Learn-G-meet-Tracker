/**
 * Gupshup WhatsApp template id for roster booking confirmation only (`template.id` in /template/msg).
 * Set GUPSHUP_TEMPLATE_NAME in backend/.env (often a UUID from Gupshup).
 */
const trim = (v) => (typeof v === "string" ? v.trim() : "");

const DEFAULT_BOOKING_CONFIRMED = "";

const templateBookingConfirmed =
  trim(process.env.GUPSHUP_TEMPLATE_NAME) || DEFAULT_BOOKING_CONFIRMED;

module.exports = {
  DEFAULT_BOOKING_CONFIRMED,
  templateBookingConfirmed,
};
