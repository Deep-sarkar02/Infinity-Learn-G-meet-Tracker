const Joi = require("joi");
const {
  normalizedMobile,
  contactEmail,
  objectIdString,
} = require("../../validation/commonSchemas");

const lookupStudentSchema = Joi.object({
  mobile: normalizedMobile,
});

const openSlotsQuerySchema = Joi.object({
  rosterStudentId: objectIdString,
  date: Joi.alternatives()
    .try(Joi.date().iso(), Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/))
    .required()
    .messages({
      "alternatives.match": "Date must be a valid ISO date (YYYY-MM-DD)",
    }),
});

const publicBookSchema = Joi.object({
  mobile: normalizedMobile,
  name: Joi.string().trim().min(1).max(120).required(),
  rosterStudentId: objectIdString,
  availabilityId: objectIdString,
  slotId: objectIdString,
  contactEmail,
});

const cancelPublicBookingQuerySchema = Joi.object({
  mobile: normalizedMobile,
});

const listPublicBookingsQuerySchema = Joi.object({
  rosterStudentId: objectIdString,
  mobile: normalizedMobile,
});

module.exports = {
  lookupStudentSchema,
  openSlotsQuerySchema,
  publicBookSchema,
  listPublicBookingsQuerySchema,
};
