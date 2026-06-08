import { normalizeMobile } from "./mobile";
import {
  BATCH_ID_MAX,
  BATCH_NAME_MAX,
  batchIdError,
  batchNameError,
  isValidBatchId,
} from "./batchFields";

const LIMITS = {
  userId: { min: 1, max: 120 },
  name: { min: 3, max: 120 },
  batchName: { min: 1, max: BATCH_NAME_MAX },
  batchId: { min: 1, max: BATCH_ID_MAX },
};

export const ROSTER_DISPLAY_OPTIONS = [
  "CBSE",
  "HOTS",
  "HOPTS CHAMP",
  "EEP",
  "NEET",
  "JEE",
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

/** @deprecated Use `isValidBatchId` from `batchFields.js` */
export const isAlphanumericBatchId = isValidBatchId;

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

const rosterBatchNameLiveError = (raw) => {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  return batchNameError(t);
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
    const bnErr = rosterBatchNameLiveError(batchName);
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

const teacherBatchNameErr = (raw) => batchNameError(raw);

const normalizeFormBatches = (form) => {
  const topGrade = String(form.grade ?? "").trim();
  const topDisplay = String(form.display ?? "").trim();
  if (Array.isArray(form.batches) && form.batches.length) {
    return form.batches.map((b) => ({
      grade: String(b?.grade ?? topGrade).trim(),
      display: String(b?.display ?? topDisplay).trim(),
      batchId: String(b?.batchId ?? ""),
      batchName: String(b?.batchName ?? ""),
    }));
  }
  const batchId = String(form.batchId ?? "").trim();
  const batchName = String(form.batchName ?? "").trim();
  if (topGrade && topDisplay && batchId && batchName) {
    return [{ grade: topGrade, display: topDisplay, batchId, batchName }];
  }
  if (batchId || batchName || topGrade || topDisplay) {
    return [{ grade: topGrade, display: topDisplay, batchId, batchName }];
  }
  return [{ grade: "", display: "", batchId: "", batchName: "" }];
};

export const computeTeacherFormErrors = (
  form,
  { touched = {}, submitAttempt = false, skipNameValidation = false } = {},
) => {
  const errors = {};
  const name = String(form.name ?? "");
  const nameTrim = name.trim();
  const email = String(form.email ?? "").trim();
  const batchRows = normalizeFormBatches(form);

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

  let completeCount = 0;
  batchRows.forEach((row, index) => {
    const grade = String(row.grade ?? "").trim();
    const display = String(row.display ?? "").trim();
    const batchId = String(row.batchId ?? "").trim();
    const batchName = String(row.batchName ?? "").trim();
    const rowTouched =
      touched[`batches.${index}.grade`] ||
      touched[`batches.${index}.display`] ||
      touched[`batches.${index}.batchId`] ||
      touched[`batches.${index}.batchName`] ||
      touched.batches ||
      submitAttempt;

    if (!grade && rowTouched) {
      errors[`batches.${index}.grade`] = "Grade is required";
    } else if (grade && !isGradeOneToTwelve(grade)) {
      errors[`batches.${index}.grade`] = "Grade must be a whole number from 1 to 12";
    }

    if (!display && rowTouched) {
      errors[`batches.${index}.display`] = "Channel is required";
    } else if (display && !TEACHER_DISPLAY_OPTIONS.includes(display)) {
      errors[`batches.${index}.display`] = "Select a valid channel";
    }

    if (!batchId && rowTouched) {
      errors[`batches.${index}.batchId`] = "Batch ID is required";
    } else if (batchId) {
      const bErr = batchIdError(batchId);
      if (bErr) errors[`batches.${index}.batchId`] = bErr;
    }

    if (!batchName && rowTouched) {
      errors[`batches.${index}.batchName`] = "Batch name is required";
    } else if (batchName) {
      const err = teacherBatchNameErr(batchName);
      if (err) errors[`batches.${index}.batchName`] = err;
    }

    if (
      grade &&
      display &&
      batchId &&
      batchName &&
      isGradeOneToTwelve(grade) &&
      TEACHER_DISPLAY_OPTIONS.includes(display) &&
      isValidBatchId(batchId) &&
      !teacherBatchNameErr(batchName)
    ) {
      completeCount += 1;
    }
  });

  if (completeCount === 0 && (touched.batches || submitAttempt)) {
    errors.batches = "Add at least one complete assignment (grade, channel, batch ID and name)";
  }

  return errors;
};

export const validateTeacherForm = (
  form,
  { skipNameValidation = false } = {},
) => {
  const batchRows = normalizeFormBatches(form);
  const completeBatches = batchRows
    .map((b) => ({
      grade: String(b.grade ?? "").trim(),
      display: String(b.display ?? "").trim(),
      batchId: String(b.batchId ?? "").trim(),
      batchName: String(b.batchName ?? "").trim(),
    }))
    .filter((b) => b.grade && b.display && b.batchId && b.batchName);

  const values = {
    name: String(form.name ?? "").trim(),
    email: String(form.email ?? "").trim().toLowerCase(),
    batches: completeBatches,
    grade: completeBatches[0]?.grade ?? "",
    display: completeBatches[0]?.display ?? "",
    batchId: completeBatches[0]?.batchId ?? "",
    batchName: completeBatches[0]?.batchName ?? "",
  };

  const touchedAll = { name: true, email: true, batches: true };
  batchRows.forEach((_, index) => {
    touchedAll[`batches.${index}.grade`] = true;
    touchedAll[`batches.${index}.display`] = true;
    touchedAll[`batches.${index}.batchId`] = true;
    touchedAll[`batches.${index}.batchName`] = true;
  });

  const errors = computeTeacherFormErrors(
    { ...form, batches: batchRows },
    {
      touched: touchedAll,
      submitAttempt: true,
      skipNameValidation,
    },
  );

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    values,
  };
};
