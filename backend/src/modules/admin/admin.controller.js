const adminService = require("./admin.service");
const rosterService = require("../roster/roster.service");
const bookingService = require("../bookings/booking.service");
const { getLsqArtifactsSyncTelemetry } = require("../integrations/lsq/lsqArtifacts.sync");

const formatTeacher = (teacher) => ({
  id: teacher._id || teacher.id,
  name: teacher.name,
  email: teacher.email,
  role: teacher.role,
  grade: teacher.grade,
  display: teacher.display,
  batchId: teacher.batchId,
  batchName: teacher.batchName,
});

const createTeacher = async (req, res) => {
  const result = await adminService.createTeacher(req.body);
  res.status(201).json({
    success: true,
    message: "Teacher created successfully",
    data: {
      teacher: formatTeacher(result.teacher),
      generatedPassword: result.plainPassword,
      emailSent: result.emailSent,
      smtpConfigured: result.smtpConfigured,
    },
  });
};

const bulkCreateTeachers = async (req, res) => {
  const result = await adminService.createTeachersBulk(req.body.teachers);
  res.status(201).json({
    success: true,
    message: "Teacher rows processed",
    data: {
      created: result.created.map((row) => ({
        teacher: formatTeacher(row.teacher),
        emailSent: row.emailSent,
        smtpConfigured: row.smtpConfigured,
      })),
      skipped: result.skipped,
      failed: result.failed,
    },
  });
};

const listTeachers = async (_req, res) => {
  const teachers = await adminService.listTeachers();
  res.status(200).json({
    success: true,
    data: teachers.map(formatTeacher),
  });
};

const assignTeacherGrade = async (req, res) => {
  const teacher = await adminService.assignGradeToTeacher(
    req.params.teacherId,
    req.body.grade,
  );
  res.status(200).json({
    success: true,
    message: "Teacher grade updated",
    data: formatTeacher(teacher),
  });
};

const updateTeacherDetails = async (req, res) => {
  const teacher = await adminService.updateTeacherDetails(req.params.teacherId, req.body);
  res.status(200).json({
    success: true,
    message: "Teacher updated",
    data: formatTeacher(teacher),
  });
};

const configureBookingWindow = async (req, res) => {
  const settings = await adminService.configureBookingWindow(
    req.body.bookingWindowDays,
  );
  res.status(200).json({
    success: true,
    message: "Booking window configured",
    data: settings,
  });
};

const getBookingWindow = async (_req, res) => {
  const bookingWindowDays = await adminService.getBookingWindowDays();
  res.status(200).json({
    success: true,
    data: {
      bookingWindowDays,
    },
  });
};

const bulkImportRoster = async (req, res) => {
  const result = await rosterService.createMany(req.body.students);
  res.status(201).json({
    success: true,
    message: "Roster students processed",
    data: result,
  });
};

const listRosterStudents = async (req, res) => {
  const students = await rosterService.listForAdmin(req.query);
  res.status(200).json({
    success: true,
    data: students,
  });
};

const listBookings = async (req, res) => {
  const rows = await bookingService.listAllForAdmin(req.query);
  res.status(200).json({
    success: true,
    data: rows,
  });
};

const getLsqArtifactsSyncTelemetryHandler = (_req, res) => {
  res.status(200).json({
    success: true,
    data: getLsqArtifactsSyncTelemetry(),
  });
};

const patchBookingMedia = async (req, res) => {
  const booking = await bookingService.updateBookingMedia(req.params.bookingId, req.body);
  res.status(200).json({
    success: true,
    message: "Recording / transcript links updated",
    data: {
      id: booking._id,
      recordingUrl: booking.recordingUrl,
      transcriptUrl: booking.transcriptUrl,
    },
  });
};

const getBookingDashboardStats = async (req, res) => {
  const data = await bookingService.getBookingDashboardStats(req.query.month);
  res.status(200).json({
    success: true,
    data,
  });
};

const getBookingWeekdayStats = async (req, res) => {
  const days = req.query.days ?? 28;
  const data = await bookingService.getBookingWeekdayStats({
    days,
    month: req.query.month,
  });
  res.status(200).json({
    success: true,
    data,
  });
};

const regenerateTeacherPassword = async (req, res) => {
  const result = await adminService.regenerateTeacherPassword(
    req.params.teacherId,
    req.body.sendEmail,
  );
  res.status(200).json({
    success: true,
    message: "Teacher password regenerated",
    data: {
      teacher: formatTeacher(result.teacher),
      generatedPassword: result.plainPassword,
      emailSent: result.emailSent,
      smtpConfigured: result.smtpConfigured,
    },
  });
};

module.exports = {
  createTeacher,
  bulkCreateTeachers,
  listTeachers,
  assignTeacherGrade,
  updateTeacherDetails,
  getBookingWindow,
  configureBookingWindow,
  bulkImportRoster,
  listRosterStudents,
  listBookings,
  getLsqArtifactsSyncTelemetryHandler,
  patchBookingMedia,
  getBookingDashboardStats,
  getBookingWeekdayStats,
  regenerateTeacherPassword,
};
