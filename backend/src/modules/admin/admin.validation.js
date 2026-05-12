const Joi = require("joi");
const {
  normalizedMobile,
  personName,
  grade,
  batchId,
  batchName,
  objectIdString,
} = require("../../validation/commonSchemas");

const httpUrlOrEmpty = Joi.alternatives().try(
  Joi.valid(null, ""),
  Joi.string().trim().max(2048).uri({ scheme: ["http", "https"] }),
);

const rosterDisplaySchema = Joi.string()
  .trim()
  .valid(
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
  )
  .required()
  .messages({
    "any.only": "Display must be one of the configured dropdown options",
    "string.empty": "Display is required",
  });

const rosterFreeText = (label) =>
  Joi.string().trim().min(1).max(120).required().messages({
    "string.empty": `${label} is required`,
    "string.max": `${label} must be at most 120 characters`,
  });

const createTeacherSchema = Joi.object({
  name: personName,
  email: Joi.string().trim().email().required(),
  grade,
  display: rosterDisplaySchema,
  batchId,
  batchName: Joi.string()
    .trim()
    .min(1)
    .max(120)
    .pattern(/^[a-zA-Z0-9 ]+$/)
    .required()
    .messages({
      "string.pattern.base":
        "Batch name must be alphanumeric (letters, numbers, and spaces only)",
      "string.empty": "Batch name is required",
    }),
});

const teacherBulkSchema = Joi.object({
  teachers: Joi.array().items(createTeacherSchema).min(1).required(),
});

const assignGradeSchema = Joi.object({
  grade,
});

/** Update teacher profile (name is not editable via this endpoint). */
const updateTeacherDetailsSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  grade,
  display: rosterDisplaySchema,
  batchId,
  batchName: Joi.string()
    .trim()
    .min(1)
    .max(120)
    .pattern(/^[a-zA-Z0-9 ]+$/)
    .required()
    .messages({
      "string.pattern.base":
        "Batch name must be alphanumeric (letters, numbers, and spaces only)",
      "string.empty": "Batch name is required",
    }),
});

const configureBookingWindowSchema = Joi.object({
  bookingWindowDays: Joi.number().integer().min(1).max(60).required(),
});

const rosterStudentRowSchema = Joi.object({
  userId: rosterFreeText("User ID"),
  name: personName,
  mobile: normalizedMobile,
  grade,
  display: rosterDisplaySchema,
  batchId: rosterFreeText("Batch ID"),
  batchName: rosterFreeText("Batch name"),
});

const rosterBulkSchema = Joi.object({
  students: Joi.array().items(rosterStudentRowSchema).min(1).required(),
});

const rosterStudentsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).max(10_000).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  grade: Joi.string()
    .trim()
    .pattern(/^(12|11|10|[1-9])$/)
    .optional()
    .allow(""),
  display: Joi.string()
    .trim()
    .valid(
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
    )
    .optional()
    .allow(""),
});

const monthYyyyMmSchema = Joi.string()
  .trim()
  .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
  .optional()
  .allow("");

const dashboardStatsQuerySchema = Joi.object({
  month: monthYyyyMmSchema,
});

const weekdayStatsQuerySchema = Joi.object({
  days: Joi.number().integer().min(7).max(90).optional().default(28),
  month: monthYyyyMmSchema,
});

const adminBookingsQuerySchema = Joi.object({
  grade: Joi.string()
    .trim()
    .pattern(/^(12|11|10|[1-9])$/)
    .optional()
    .allow(""),
  batchId: Joi.string()
    .trim()
    .max(80)
    .pattern(/^[a-zA-Z0-9]*$/)
    .optional()
    .allow(""),
  /** Filter by how the booking was created: logged-in student vs open roster portal */
  bookingKind: Joi.string().valid("student", "roster").optional().allow(""),
  /** Dashboard drill-down: `student_app` or `roster|<batchId>` (empty batch: `roster|`) */
  segmentKey: Joi.string().trim().max(120).optional().allow(""),
  /** When set with `limit`, results are paginated (1-based). Omit both for full list (e.g. dashboard drill-down). */
  page: Joi.number().integer().min(1).max(10_000).optional(),
  /** Page size when `page` is set. Max 500. */
  limit: Joi.number().integer().min(1).max(500).optional(),
  month: monthYyyyMmSchema,
  status: Joi.string()
    .valid(
      "scheduled",
      "cancelled",
      "completed",
      "student_did_not_join",
      "teacher_did_not_join",
    )
    .optional()
    .allow(""),
});

const regenerateTeacherPasswordSchema = Joi.object({
  sendEmail: Joi.boolean().optional().default(true),
});

const updateBookingMediaParamsSchema = Joi.object({
  bookingId: objectIdString,
});

const updateBookingMediaBodySchema = Joi.object({
  recordingUrl: httpUrlOrEmpty.optional(),
  transcriptUrl: httpUrlOrEmpty.optional(),
})
  .or("recordingUrl", "transcriptUrl")
  .messages({
    "object.missing": "Provide at least one of recordingUrl or transcriptUrl",
  });

module.exports = {
  createTeacherSchema,
  teacherBulkSchema,
  assignGradeSchema,
  updateTeacherDetailsSchema,
  configureBookingWindowSchema,
  rosterBulkSchema,
  rosterStudentsQuerySchema,
  dashboardStatsQuerySchema,
  adminBookingsQuerySchema,
  weekdayStatsQuerySchema,
  regenerateTeacherPasswordSchema,
  updateBookingMediaParamsSchema,
  updateBookingMediaBodySchema,
};
