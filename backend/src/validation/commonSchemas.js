const Joi = require("joi");
const { normalizeMobile } = require("../utils/mobile");
const { isUuid } = require("../utils/id");

const LETTER_RE = /[\p{L}\p{M}]/u;
const HAS_DIGIT_RE = /\d/;
const PROPER_LABEL_CHARS_RE = /^[\p{L}\p{M}\s'.&,()/-]+$/u;

const properLabel = (fieldLabel) =>
  Joi.string()
    .trim()
    .min(3)
    .max(120)
    .required()
    .custom((value, helpers) => {
      if (HAS_DIGIT_RE.test(value)) {
        return helpers.error("any.invalid", {
          message: `${fieldLabel} cannot contain digits`,
        });
      }
      if (!LETTER_RE.test(value)) {
        return helpers.error("any.invalid", {
          message: `${fieldLabel} must include letters`,
        });
      }
      if (!PROPER_LABEL_CHARS_RE.test(value)) {
        return helpers.error("any.invalid", {
          message: `${fieldLabel} contains invalid characters`,
        });
      }
      return value;
    }, `proper label (${fieldLabel})`)
    .messages({
      "string.min": `${fieldLabel} must be at least 3 characters`,
      "string.max": `${fieldLabel} must be at most 120 characters`,
      "string.empty": `${fieldLabel} is required`,
    });

const normalizedMobile = Joi.string()
  .trim()
  .required()
  .custom((value, helpers) => {
    const digits = normalizeMobile(value);
    if (!digits || !/^[1-9]\d{9}$/.test(digits)) {
      return helpers.error("any.invalid", {
        message:
          "Enter a valid 10-digit mobile number (digits only, cannot start with 0)",
      });
    }
    return digits;
  }, "normalize mobile");

const personName = properLabel("Name");

const grade = Joi.string()
  .trim()
  .pattern(/^(12|11|10|[1-9])$/)
  .required()
  .messages({
    "string.pattern.base": "Grade must be a whole number from 1 to 12",
    "string.empty": "Grade is required",
  });

/** Roster / LMS batch identifier (UUID, slug, e.g. ff6a8182-ee25-4e40-88fd-34fb7e0b5f3a). */
const BATCH_ID_MAX = 120;
const batchId = Joi.string()
  .trim()
  .min(1)
  .max(BATCH_ID_MAX)
  .pattern(/^[a-zA-Z0-9_-]+$/)
  .required()
  .messages({
    "string.pattern.base":
      "Batch ID may use letters, numbers, hyphens, and underscores (e.g. UUID)",
    "string.max": `Batch ID must be at most ${BATCH_ID_MAX} characters`,
    "string.empty": "Batch ID is required",
  });

/** Schedule / roster label (e.g. Icse-6-3||4-8||M-satsun||7 Pm - 8 Pm||Apr). */
const BATCH_NAME_MAX = 500;
const batchName = Joi.string()
  .trim()
  .min(1)
  .max(BATCH_NAME_MAX)
  .pattern(/^[\p{L}\p{N}\s|:\-.,()/&_]+$/u)
  .required()
  .messages({
    "string.pattern.base": "Batch name contains unsupported characters",
    "string.max": `Batch name must be at most ${BATCH_NAME_MAX} characters`,
    "string.empty": "Batch name is required",
  });

const contactEmail = Joi.string()
  .trim()
  .email({ tlds: { allow: false } })
  .max(254)
  .required()
  .messages({
    "string.email": "Enter a valid email address",
    "string.max": "Email is too long",
    "string.empty": "Email is required",
  });

/** Mongo ObjectId (24 hex) or Postgres UUID — used for route/body ids after DB migration. */
const objectIdString = Joi.string()
  .trim()
  .required()
  .custom((value, helpers) => {
    const v = String(value).trim();
    if (/^[a-fA-F0-9]{24}$/.test(v) || isUuid(v)) {
      return v;
    }
    return helpers.error("any.invalid", { message: "Invalid id format" });
  }, "objectId or uuid")
  .messages({
    "any.invalid": "Invalid id format",
  });

module.exports = {
  normalizedMobile,
  personName,
  grade,
  batchId,
  batchName,
  BATCH_ID_MAX,
  BATCH_NAME_MAX,
  contactEmail,
  objectIdString,
};
