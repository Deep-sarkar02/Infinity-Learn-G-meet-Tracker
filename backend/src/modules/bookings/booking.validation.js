const Joi = require("joi");
const { objectIdString } = require("../../validation/commonSchemas");

const bookSlotSchema = Joi.object({
  availabilityId: Joi.string().hex().length(24).required(),
  slotId: Joi.string().hex().length(24).required(),
});

const teacherBookingHistoryQuerySchema = Joi.object({
  window: Joi.string().valid("week", "month", "all").optional().default("all"),
});

const teacherCompleteBookingParamsSchema = Joi.object({
  bookingId: objectIdString,
});

const teacherCompleteBookingBodySchema = Joi.object({
  outcome: Joi.string()
    .valid("completed", "student_did_not_join", "teacher_did_not_join")
    .default("completed"),
}).default({});

const teacherBookingIdParamsSchema = Joi.object({
  bookingId: objectIdString,
});

const teacherRescheduleBodySchema = Joi.object({
  availabilityId: objectIdString,
  slotId: objectIdString,
});

const teacherCancelBodySchema = Joi.object({
  reason: Joi.string().trim().max(500).allow("").optional(),
});

module.exports = {
  bookSlotSchema,
  teacherBookingHistoryQuerySchema,
  teacherCompleteBookingParamsSchema,
  teacherCompleteBookingBodySchema,
  teacherBookingIdParamsSchema,
  teacherRescheduleBodySchema,
  teacherCancelBodySchema,
};
