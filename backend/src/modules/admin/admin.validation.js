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
    "JEE",
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

const teacherBatchRowSchema = Joi.object({
  grade,
  display: rosterDisplaySchema,
  batchId,
  batchName,
});

const createTeacherSchema = Joi.object({
  name: personName,
  email: Joi.string().trim().email().required(),
  batches: Joi.array().items(teacherBatchRowSchema).min(1).max(30).optional(),
  grade: grade.optional(),
  display: rosterDisplaySchema.optional(),
  batchId: batchId.optional(),
  batchName: batchName.optional(),
})
  .or("batches", "batchId")
  .messages({
    "object.missing":
      "Provide batches (assignments with grade, channel, batch) or legacy batchId with batchName",
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
  batches: Joi.array().items(teacherBatchRowSchema).min(1).max(30).optional(),
  grade: grade.optional(),
  display: rosterDisplaySchema.optional(),
  batchId: batchId.optional(),
  batchName: batchName.optional(),
})
  .or("batches", "batchId")
  .messages({
    "object.missing": "Provide batches (assignments) or legacy batchId with batchName",
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
  search: Joi.string().trim().max(120).optional().allow(""),
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
      "JEE",
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

const slotStatsQuerySchema = Joi.object({
  month: monthYyyyMmSchema,
  week: Joi.number().integer().min(1).max(6).optional(),
});

const mentorSlotReportParamsSchema = Joi.object({
  teacherId: objectIdString,
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
  fromYmd: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .allow(""),
  toYmd: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .allow(""),
  teacherId: Joi.string().trim().max(80).optional().allow(""),
  search: Joi.string().trim().max(120).optional().allow(""),
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

const viewTeacherPasswordSchema = Joi.object({
  adminPassword: Joi.string().required(),
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
  slotStatsQuerySchema,
  mentorSlotReportParamsSchema,
  adminBookingsQuerySchema,
  weekdayStatsQuerySchema,
  regenerateTeacherPasswordSchema,
  viewTeacherPasswordSchema,
  updateBookingMediaParamsSchema,
  updateBookingMediaBodySchema,
};
