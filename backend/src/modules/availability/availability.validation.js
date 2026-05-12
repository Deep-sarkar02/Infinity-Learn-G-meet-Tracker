const Joi = require("joi");
const { objectIdString } = require("../../validation/commonSchemas");

const setAvailabilitySchema = Joi.object({
  date: Joi.date().iso().required(),
  slots: Joi.array()
    .items(
      Joi.object({
        startTime: Joi.string()
          .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
          .required(),
        endTime: Joi.string()
          .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
          .required(),
      }),
    )
    .min(1)
    .required(),
});

const teacherCalendarQuerySchema = Joi.object({
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
});

const updateTeacherSlotParamsSchema = Joi.object({
  availabilityId: objectIdString,
  slotId: objectIdString,
});

const updateTeacherSlotSchema = Joi.object({
  startTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required(),
  endTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required(),
});

const deleteTeacherSlotParamsSchema = Joi.object({
  availabilityId: objectIdString,
  slotId: objectIdString,
});

const studentSlotsQuerySchema = Joi.object({
  grade: Joi.string().trim().required(),
  date: Joi.date().iso().required(),
});

module.exports = {
  setAvailabilitySchema,
  teacherCalendarQuerySchema,
  updateTeacherSlotParamsSchema,
  updateTeacherSlotSchema,
  deleteTeacherSlotParamsSchema,
  studentSlotsQuerySchema,
};
