const ApiError = require("./ApiError");

/** Fixed offset for India Standard Time (no DST). */
const IST_OFFSET = "+05:30";

const pad2 = (value) => String(value).padStart(2, "0");

const toUtcDateStart = (dateInput) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "Invalid date format");
  }
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
};

/**
 * Calendar YYYY-MM-DD from a stored picker value (frontend sends `YYYY-MM-DDT00:00:00.000Z`).
 */
const getPickerYmdFromDateInput = (dateInput) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "Invalid date format");
  }
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
};

const getYmdInIst = (instant) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(instant)
    .reduce((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const addCalendarDaysToYmd = (ymd, days) => {
  const anchor = new Date(`${ymd}T12:00:00${IST_OFFSET}`);
  if (Number.isNaN(anchor.getTime())) {
    throw new ApiError(400, "Invalid date");
  }
  anchor.setTime(anchor.getTime() + Number(days) * 86400000);
  return getYmdInIst(anchor);
};

/**
 * Combine picker calendar day + HH:mm interpreted as **IST wall time** → absolute Date (UTC instant).
 */
const combineIstDateAndTime = (dateInput, hhmm) => {
  const [hours, minutes] = String(hhmm).split(":").map(Number);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new ApiError(400, "Invalid time format, expected HH:mm");
  }
  const ymd = getPickerYmdFromDateInput(dateInput);
  return new Date(`${ymd}T${pad2(hours)}:${pad2(minutes)}:00${IST_OFFSET}`);
};

/** @deprecated Use combineIstDateAndTime for availability; kept for compatibility. */
const combineDateAndTimeToUtc = (dateInput, hhmm) => {
  const [hours, minutes] = String(hhmm).split(":").map(Number);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new ApiError(400, "Invalid time format, expected HH:mm");
  }
  const date = toUtcDateStart(dateInput);
  date.setUTCHours(hours, minutes, 0, 0);
  return date;
};

/**
 * Booking window: `windowDays` **calendar days** including today, in **Asia/Kolkata**.
 * Matches teacher UI: last selectable day = today + (windowDays - 1).
 */
const isInBookingWindow = (dateInput, windowDays) => {
  const now = new Date();
  const todayIst = getYmdInIst(now);
  const targetYmd = getPickerYmdFromDateInput(dateInput);
  if (targetYmd < todayIst) return false;
  const lastYmd = addCalendarDaysToYmd(todayIst, Math.max(Number(windowDays) - 1, 0));
  return targetYmd <= lastYmd;
};

const hasOverlap = (slots) => {
  const sorted = [...slots].sort((a, b) => a.startTime - b.startTime);
  for (let index = 1; index < sorted.length; index += 1) {
    const prev = sorted[index - 1];
    const current = sorted[index];
    if (current.startTime < prev.endTime) {
      return true;
    }
  }
  return false;
};

/** India Standard Time — used for user-facing email copy. */
const IST_ZONE = "Asia/Kolkata";

/**
 * Calendar line for transactional email (e.g. "Sat, 18 Apr 2026" in IST).
 * @param {Date|string|number} instant
 */
const formatEmailDateIst = (instant) => {
  const d = new Date(instant);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
};

/**
 * Time-of-day in IST, 24-hour HH:mm (e.g. "14:30").
 * @param {Date|string|number} instant
 */
const formatEmailTimeIst = (instant) => {
  const d = new Date(instant);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).format(d);
};

/** LeadSquared `ActivityDateTime` — IST wall clock as `YYYY-MM-DD HH:mm:ss` (no offset). */
const formatLsqActivityDateTimeIst = (instant) => {
  const d = new Date(instant);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const m = {};
  for (const p of parts) {
    if (p.type !== "literal") m[p.type] = p.value;
  }
  return `${m.year}-${m.month}-${m.day} ${m.hour}:${m.minute}:${m.second}`;
};

/**
 * LeadSquared `ActivityDateTime` as UTC `YYYY-MM-DD HH:mm:ss` (no `Z` suffix).
 * Many tenants parse naive datetimes as UTC; sending IST digits caused MXFutureDateTimeActivityNotAllowedException.
 */
const formatLsqActivityDateTimeUtc = (instant) => {
  const d = new Date(instant);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 19).replace("T", " ");
};

/** LeadSquared custom date string in IST — `DD-MM-YYYY` (e.g. `10-05-2026`). */
const formatLsqDateDdMmYyyyIst = (instant) => {
  const d = new Date(instant);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(d);
  const m = {};
  for (const p of parts) {
    if (p.type !== "literal") m[p.type] = p.value;
  }
  return `${m.day}-${m.month}-${m.year}`;
};

/** Short 12h time in IST for LeadSquared custom fields (e.g. `2:30 pm`). */
const formatLsqTime12hIst = (instant) => {
  const d = new Date(instant);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(d)
    .replace(/\u202f/g, " ")
    .trim()
    .toLowerCase();
};

module.exports = {
  toUtcDateStart,
  combineDateAndTimeToUtc,
  combineIstDateAndTime,
  getPickerYmdFromDateInput,
  getYmdInIst,
  addCalendarDaysToYmd,
  isInBookingWindow,
  hasOverlap,
  formatEmailDateIst,
  formatEmailTimeIst,
  formatLsqActivityDateTimeIst,
  formatLsqActivityDateTimeUtc,
  formatLsqDateDdMmYyyyIst,
  formatLsqTime12hIst,
};
