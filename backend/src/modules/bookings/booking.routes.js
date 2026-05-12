const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const permit = require("../../middleware/role.middleware");
const validate = require("../../middleware/validate.middleware");
const asyncHandler = require("../../utils/asyncHandler");
const bookingController = require("./booking.controller");
const {
  bookSlotSchema,
  teacherBookingHistoryQuerySchema,
  teacherCompleteBookingParamsSchema,
  teacherCompleteBookingBodySchema,
  teacherBookingIdParamsSchema,
  teacherRescheduleBodySchema,
  teacherCancelBodySchema,
} = require("./booking.validation");

const router = express.Router();

router.get(
  "/teacher/pending-completion",
  authMiddleware,
  permit("teacher"),
  asyncHandler(bookingController.getTeacherPendingCompletion),
);

router.get(
  "/teacher/history",
  authMiddleware,
  permit("teacher"),
  validate(teacherBookingHistoryQuerySchema, "query"),
  asyncHandler(bookingController.getTeacherBookingHistory),
);

router.get(
  "/teacher/:bookingId/reschedule-options",
  authMiddleware,
  permit("teacher"),
  validate(teacherBookingIdParamsSchema, "params"),
  asyncHandler(bookingController.getTeacherRescheduleOptions),
);

router.patch(
  "/teacher/:bookingId/reschedule",
  authMiddleware,
  permit("teacher"),
  validate(teacherBookingIdParamsSchema, "params"),
  validate(teacherRescheduleBodySchema, "body"),
  asyncHandler(bookingController.rescheduleTeacherBooking),
);

router.patch(
  "/teacher/:bookingId/cancel",
  authMiddleware,
  permit("teacher"),
  validate(teacherBookingIdParamsSchema, "params"),
  (req, _res, next) => {
    if (req.body === undefined || req.body === null) {
      req.body = {};
    }
    next();
  },
  validate(teacherCancelBodySchema, "body"),
  asyncHandler(bookingController.cancelTeacherBooking),
);

router.patch(
  "/teacher/:bookingId/complete",
  authMiddleware,
  permit("teacher"),
  validate(teacherCompleteBookingParamsSchema, "params"),
  validate(teacherCompleteBookingBodySchema, "body"),
  asyncHandler(bookingController.completeTeacherBooking),
);

router.post(
  "/",
  authMiddleware,
  permit("student"),
  validate(bookSlotSchema),
  asyncHandler(bookingController.bookSlot),
);

router.get(
  "/me",
  authMiddleware,
  permit("student"),
  asyncHandler(bookingController.getStudentBookings),
);

module.exports = router;
