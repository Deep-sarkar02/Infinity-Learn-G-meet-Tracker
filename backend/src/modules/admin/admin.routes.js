const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const permit = require("../../middleware/role.middleware");
const validate = require("../../middleware/validate.middleware");
const asyncHandler = require("../../utils/asyncHandler");
const adminController = require("./admin.controller");
const {
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
} = require("./admin.validation");

const router = express.Router();

router.use(authMiddleware, permit("admin"));

router.get("/teachers", asyncHandler(adminController.listTeachers));

router.get(
  "/teachers/today-slot-stats",
  asyncHandler(adminController.getTeachersTodaySlotStats),
);

router.post(
  "/teachers",
  validate(createTeacherSchema),
  asyncHandler(adminController.createTeacher),
);
router.post(
  "/teachers/bulk",
  validate(teacherBulkSchema),
  asyncHandler(adminController.bulkCreateTeachers),
);
router.patch(
  "/teachers/:teacherId/grade",
  validate(assignGradeSchema),
  asyncHandler(adminController.assignTeacherGrade),
);
router.patch(
  "/teachers/:teacherId",
  validate(updateTeacherDetailsSchema),
  asyncHandler(adminController.updateTeacherDetails),
);
router.post(
  "/teachers/:teacherId/regenerate-password",
  validate(regenerateTeacherPasswordSchema),
  asyncHandler(adminController.regenerateTeacherPassword),
);
router.post(
  "/teachers/:teacherId/view-password",
  validate(viewTeacherPasswordSchema),
  asyncHandler(adminController.viewTeacherPassword),
);
router.patch(
  "/booking-window",
  validate(configureBookingWindowSchema),
  asyncHandler(adminController.configureBookingWindow),
);
router.get("/booking-window", asyncHandler(adminController.getBookingWindow));

router.post(
  "/roster-students/bulk",
  validate(rosterBulkSchema),
  asyncHandler(adminController.bulkImportRoster),
);

router.get(
  "/roster-students",
  validate(rosterStudentsQuerySchema, "query"),
  asyncHandler(adminController.listRosterStudents),
);

router.get(
  "/bookings/dashboard-stats",
  validate(dashboardStatsQuerySchema, "query"),
  asyncHandler(adminController.getBookingDashboardStats),
);

router.get(
  "/bookings/weekday-stats",
  validate(weekdayStatsQuerySchema, "query"),
  asyncHandler(adminController.getBookingWeekdayStats),
);

router.get(
  "/bookings/slot-stats",
  validate(slotStatsQuerySchema, "query"),
  asyncHandler(adminController.getMentorSlotStats),
);

router.get(
  "/bookings/slot-stats/:teacherId/report",
  validate(mentorSlotReportParamsSchema, "params"),
  validate(slotStatsQuerySchema, "query"),
  asyncHandler(adminController.getMentorSlotReport),
);

router.get(
  "/bookings",
  validate(adminBookingsQuerySchema, "query"),
  asyncHandler(adminController.listBookings),
);

router.get(
  "/lsq-artifacts-sync-telemetry",
  asyncHandler(adminController.getLsqArtifactsSyncTelemetryHandler),
);

router.patch(
  "/bookings/:bookingId/media",
  validate(updateBookingMediaParamsSchema, "params"),
  validate(updateBookingMediaBodySchema),
  asyncHandler(adminController.patchBookingMedia),
);

module.exports = router;
