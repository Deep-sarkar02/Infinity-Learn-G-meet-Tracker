const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const permit = require("../../middleware/role.middleware");
const validate = require("../../middleware/validate.middleware");
const asyncHandler = require("../../utils/asyncHandler");
const availabilityController = require("./availability.controller");
const {
  setAvailabilitySchema,
  teacherCalendarQuerySchema,
  updateTeacherSlotParamsSchema,
  updateTeacherSlotSchema,
  deleteTeacherSlotParamsSchema,
  studentSlotsQuerySchema,
} = require("./availability.validation");

const router = express.Router();

router.post(
  "/teacher",
  authMiddleware,
  permit("teacher"),
  validate(setAvailabilitySchema),
  asyncHandler(availabilityController.setAvailability),
);

router.get(
  "/teacher",
  authMiddleware,
  permit("teacher"),
  validate(teacherCalendarQuerySchema, "query"),
  asyncHandler(availabilityController.getOwnCalendar),
);

router.patch(
  "/teacher/:availabilityId/slots/:slotId",
  authMiddleware,
  permit("teacher"),
  validate(updateTeacherSlotParamsSchema, "params"),
  validate(updateTeacherSlotSchema),
  asyncHandler(availabilityController.updateTeacherSlot),
);

router.delete(
  "/teacher/:availabilityId/slots/:slotId",
  authMiddleware,
  permit("teacher"),
  validate(deleteTeacherSlotParamsSchema, "params"),
  asyncHandler(availabilityController.deleteTeacherSlot),
);

router.get(
  "/student",
  authMiddleware,
  permit("student"),
  validate(studentSlotsQuerySchema, "query"),
  asyncHandler(availabilityController.getAvailableSlots),
);

module.exports = router;
