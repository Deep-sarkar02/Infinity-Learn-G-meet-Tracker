import { normalizeMobile } from "./mobile";

const LIMITS = {
  userId: { min: 1, max: 120 },
  name: { min: 3, max: 120 },
  batchName: { min: 3, max: 120 },
  batchId: { min: 1, max: 120 },
};

export const ROSTER_DISPLAY_OPTIONS = [
  "CBSE",
  "HOTS",
  "HOPTS CHAMP",
  "EEP",
  "NEET",
  "FOUNDATION",
  "Jammu & Kashmir",
  "Tamil Nadu State Board",
  "Telangana",
  "ICSE",
];
export const TEACHER_DISPLAY_OPTIONS = [...ROSTER_DISPLAY_OPTIONS];

const LETTER_RE = /[\p{L}\p{M}]/u;
const HAS_DIGIT_RE = /\d/;
const PROPER_LABEL_CHARS_RE = /^[\p{L}\p{M}\s'.&,()/-]+$/u;

const properLabelError = (trimmed, minLen, maxLen, label) => {
  if (trimmed.length < minLen) {
    return `${label} must be at least ${minLen} characters`;
  }
  if (trimmed.length > maxLen) {
    return `${label} must be at most ${maxLen} characters`;
  }
  if (HAS_DIGIT_RE.test(trimmed)) {
    return `${label} cannot contain digits`;
  }
  if (!LETTER_RE.test(trimmed)) {
    return `${label} must include letters`;
  }
  if (!PROPER_LABEL_CHARS_RE.test(trimmed)) {
    return `${label} contains invalid characters`;
  }
  return null;
};

export const isValidTenDigitMobile = (digits) => /^[1-9]\d{9}$/.test(digits ?? "");

export const isGradeOneToTwelve = (raw) =>
  /^(12|11|10|[1-9])$/.test(String(raw ?? "").trim());

export const isAlphanumericBatchId = (raw) =>
  /^[a-zA-Z0-9]{1,80}$/.test(String(raw ?? "").trim());

/**
 * Client-side check aligned with backend Joi rules (authoritative on server).
 */
export const isValidContactEmail = (raw) => {
  const v = String(raw ?? "").trim();
  if (!v || v.length > 254) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return false;
  const [local, domain] = v.split("@");
  if (!local || !domain || !domain.includes(".")) return false;
  return true;
};

export const validateLookupForm = ({ mobile }) => {
  const errors = {};
  const digits = normalizeMobile(mobile);

  if (!isValidTenDigitMobile(digits)) {
    errors.mobile =
      "Enter a valid 10-digit mobile number (digits only, cannot start with 0)";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    values: { mobile: digits },
  };
};

/** Digits only, max 10 characters (for controlled phone input while typing). */
export const sanitizeRosterPhoneInput = (raw) => String(raw ?? "").replace(/\D/g, "").slice(0, 10);

const properLabelLiveError = (raw, minLen, maxLen, label) => {
  const trimmed = String(raw ?? "").trim();
  if (trimmed.length === 0) return null;
  if (HAS_DIGIT_RE.test(trimmed)) {
    return `${label} cannot contain digits`;
  }
  if (trimmed.length < minLen) {
    return `${label} must be at least ${minLen} characters`;
  }
  if (trimmed.length > maxLen) {
    return `${label} must be at most ${maxLen} characters`;
  }
  if (!LETTER_RE.test(trimmed)) {
    return `${label} must include letters`;
  }
  if (!PROPER_LABEL_CHARS_RE.test(trimmed)) {
    return `${label} contains invalid characters`;
  }
  return null;
};

const gradeLiveError = (raw) => {
  const g = String(raw ?? "").trim();
  if (!g) return null;
  if (!/^\d{1,2}$/.test(g)) {
    return "Grade must be a whole number from 1 to 12";
  }
  if (!isGradeOneToTwelve(g)) {
    return "Grade must be a whole number from 1 to 12";
  }
  return null;
};

const batchIdLiveError = (raw) => {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  if (t.length > LIMITS.batchId.max) {
    return `Batch ID must be at most ${LIMITS.batchId.max} characters`;
  }
  return null;
};

const rosterTextLiveError = (raw, label, max) => {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  if (t.length > max) return `${label} must be at most ${max} characters`;
  return null;
};

const mobileLiveError = (digitsRaw) => {
  const d = String(digitsRaw ?? "");
  if (!d) return null;
  if (d[0] === "0") {
    return "Phone cannot start with 0";
  }
  if (d.length < 10) {
    return "Enter all 10 digits";
  }
  if (!isValidTenDigitMobile(d)) {
    return "Enter a valid 10-digit mobile number (digits only, cannot start with 0)";
  }
  return null;
};

/**
 * Inline errors while typing (and optional required hints when touched / after submit).
 * `touched`: { name?: true, mobile?: true, ... }
 */
export const computeRosterFormErrors = (form, { touched = {}, submitAttempt = false } = {}) => {
  const errors = {};
  const userId = String(form.userId ?? "");
  const userIdTrim = userId.trim();
  const name = String(form.name ?? "");
  const nameTrim = name.trim();
  const mobileDigits = String(form.mobile ?? "");
  const gradeVal = String(form.grade ?? "").trim();
  const displayVal = String(form.display ?? "").trim();
  const batchIdVal = String(form.batchId ?? "").trim();
  const batchName = String(form.batchName ?? "");
  const batchNameTrim = batchName.trim();

  if (!userIdTrim && (touched.userId || submitAttempt)) {
    errors.userId = "User ID is required";
  } else {
    const userIdErr = rosterTextLiveError(userId, "User ID", LIMITS.userId.max);
    if (userIdErr) errors.userId = userIdErr;
  }

  if (!nameTrim && (touched.name || submitAttempt)) {
    errors.name = "Name is required";
  } else if (/\d/.test(name)) {
    errors.name = "Name cannot contain digits";
  } else {
    const nameErr = properLabelLiveError(name, LIMITS.name.min, LIMITS.name.max, "Name");
    if (nameErr) errors.name = nameErr;
  }

  if (!mobileDigits && (touched.mobile || submitAttempt)) {
    errors.mobile = "Phone is required";
  } else {
    const mErr = mobileLiveError(mobileDigits);
    if (mErr) errors.mobile = mErr;
  }

  if (!gradeVal && (touched.grade || submitAttempt)) {
    errors.grade = "Grade is required";
  } else {
    const gErr = gradeLiveError(form.grade);
    if (gErr) errors.grade = gErr;
  }

  if (!displayVal && (touched.display || submitAttempt)) {
    errors.display = "Display is required";
  } else if (displayVal && !ROSTER_DISPLAY_OPTIONS.includes(displayVal)) {
    errors.display = "Select a valid display option";
  }

  if (!batchIdVal && (touched.batchId || submitAttempt)) {
    errors.batchId = "Batch ID is required";
  } else {
    const bErr = batchIdLiveError(form.batchId);
    if (bErr) errors.batchId = bErr;
  }

  if (!batchNameTrim && (touched.batchName || submitAttempt)) {
    errors.batchName = "Batch name is required";
  } else {
    const bnErr = rosterTextLiveError(batchName, "Batch name", LIMITS.batchName.max);
    if (bnErr) errors.batchName = bnErr;
  }

  return errors;
};

export const validateRosterStudentForm = ({ userId, name, mobile, grade, display, batchId, batchName }) => {
  const errors = {};
  const userIdTrim = String(userId ?? "").trim();
  const nameTrim = String(name ?? "").trim();
  const gradeTrim = String(grade ?? "").trim();
  const displayTrim = String(display ?? "").trim();
  const batchIdTrim = String(batchId ?? "").trim();
  const batchNameTrim = String(batchName ?? "").trim();
  const digits = normalizeMobile(mobile);

  if (!userIdTrim) {
    errors.userId = "User ID is required";
  } else if (userIdTrim.length > LIMITS.userId.max) {
    errors.userId = `User ID must be at most ${LIMITS.userId.max} characters`;
  }

  if (!isValidTenDigitMobile(digits)) {
    errors.mobile =
      "Enter a valid 10-digit mobile number (digits only, cannot start with 0)";
  }

  const nameErr = properLabelError(
    nameTrim,
    LIMITS.name.min,
    LIMITS.name.max,
    "Name",
  );
  if (nameErr) errors.name = nameErr;

  if (!isGradeOneToTwelve(gradeTrim)) {
    errors.grade = "Grade must be a whole number from 1 to 12";
  }

  if (!ROSTER_DISPLAY_OPTIONS.includes(displayTrim)) {
    errors.display = "Select a valid display option";
  }

  if (!batchIdTrim) {
    errors.batchId = "Batch ID is required";
  } else if (batchIdTrim.length > LIMITS.batchId.max) {
    errors.batchId = `Batch ID must be at most ${LIMITS.batchId.max} characters`;
  }

  if (!batchNameTrim) {
    errors.batchName = "Batch name is required";
  } else if (batchNameTrim.length > LIMITS.batchName.max) {
    errors.batchName = `Batch name must be at most ${LIMITS.batchName.max} characters`;
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    values: {
      userId: userIdTrim,
      name: nameTrim,
      mobile: digits,
      grade: gradeTrim,
      display: displayTrim,
      batchId: batchIdTrim,
      batchName: batchNameTrim,
    },
  };
};

const teacherBatchNameErr = (raw) => {
  const v = String(raw ?? "").trim();
  if (!v) return "Batch name is required";
  if (v.length > 120) return "Batch name must be at most 120 characters";
  if (!/^[a-zA-Z0-9 ]+$/.test(v)) {
    return "Batch name must be alphanumeric (letters, numbers, and spaces only)";
  }
  return null;
};

export const computeTeacherFormErrors = (
  form,
  { touched = {}, submitAttempt = false, skipNameValidation = false } = {},
) => {
  const errors = {};
  const name = String(form.name ?? "");
  const nameTrim = name.trim();
  const email = String(form.email ?? "").trim();
  const grade = String(form.grade ?? "").trim();
  const display = String(form.display ?? "").trim();
  const batchId = String(form.batchId ?? "").trim();
  const batchName = String(form.batchName ?? "");

  if (!skipNameValidation) {
    if (!nameTrim && (touched.name || submitAttempt)) {
      errors.name = "Name is required";
    } else if (nameTrim) {
      const err = properLabelError(nameTrim, LIMITS.name.min, LIMITS.name.max, "Name");
      if (err) errors.name = err;
    }
  }

  if (!email && (touched.email || submitAttempt)) {
    errors.email = "Email is required";
  } else if (email && !isValidContactEmail(email)) {
    errors.email = "Enter a valid email address";
  }

  if (!grade && (touched.grade || submitAttempt)) {
    errors.grade = "Grade is required";
  } else if (grade && !isGradeOneToTwelve(grade)) {
    errors.grade = "Grade must be a whole number from 1 to 12";
  }

  if (!display && (touched.display || submitAttempt)) {
    errors.display = "Display is required";
  } else if (display && !TEACHER_DISPLAY_OPTIONS.includes(display)) {
    errors.display = "Select a valid display option";
  }

  if (!batchId && (touched.batchId || submitAttempt)) {
    errors.batchId = "Batch ID is required";
  } else if (batchId && !isAlphanumericBatchId(batchId)) {
    errors.batchId = "Batch ID must be letters and numbers only (no spaces or symbols)";
  }

  if ((touched.batchName || submitAttempt) && !String(batchName ?? "").trim()) {
    errors.batchName = "Batch name is required";
  } else if (String(batchName ?? "").trim()) {
    const err = teacherBatchNameErr(batchName);
    if (err) errors.batchName = err;
  }

  return errors;
};

export const validateTeacherForm = (
  { name, email, grade, display, batchId, batchName },
  { skipNameValidation = false } = {},
) => {
  const values = {
    name: String(name ?? "").trim(),
    email: String(email ?? "").trim().toLowerCase(),
    grade: String(grade ?? "").trim(),
    display: String(display ?? "").trim(),
    batchId: String(batchId ?? "").trim(),
    batchName: String(batchName ?? "").trim(),
  };

  const errors = computeTeacherFormErrors(values, {
    touched: {
      name: true,
      email: true,
      grade: true,
      display: true,
      batchId: true,
      batchName: true,
    },
    submitAttempt: true,
    skipNameValidation,
  });

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    values,
  };
};
