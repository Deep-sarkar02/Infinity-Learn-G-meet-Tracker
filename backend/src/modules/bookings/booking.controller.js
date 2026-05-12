const bookingService = require("./booking.service");

const bookSlot = async (req, res) => {
  const booking = await bookingService.bookSlot({
    studentId: req.user._id,
    ...req.body,
  });
  res.status(201).json({
    success: true,
    message: "Slot booked successfully",
    data: booking,
  });
};

const getStudentBookings = async (req, res) => {
  const bookings = await bookingService.listStudentBookings(req.user._id);
  res.status(200).json({
    success: true,
    data: bookings,
  });
};

const getTeacherPendingCompletion = async (req, res) => {
  const data = await bookingService.listTeacherPendingCompletion(req.user._id);
  res.status(200).json({ success: true, data });
};

const getTeacherBookingHistory = async (req, res) => {
  const data = await bookingService.listTeacherBookingHistory(req.user._id, req.query.window);
  res.status(200).json({ success: true, data });
};

const completeTeacherBooking = async (req, res) => {
  const outcome = req.body.outcome ?? "completed";
  await bookingService.completeBookingByTeacher(req.user._id, req.params.bookingId, outcome);
  const messages = {
    completed: "Session marked as completed",
    student_did_not_join: "Session marked: student did not join",
    teacher_did_not_join: "Session marked: teacher did not join",
  };
  res.status(200).json({
    success: true,
    message: messages[outcome] || "Session updated",
  });
};

const getTeacherRescheduleOptions = async (req, res) => {
  const data = await bookingService.listRescheduleOptionsForTeacher(
    req.user._id,
    req.params.bookingId,
  );
  res.status(200).json({ success: true, data });
};

const rescheduleTeacherBooking = async (req, res) => {
  const booking = await bookingService.rescheduleBookingByTeacher(
    req.user._id,
    req.params.bookingId,
    req.body,
  );
  res.status(200).json({
    success: true,
    message: "Booking rescheduled",
    data: booking,
  });
};

const cancelTeacherBooking = async (req, res) => {
  const booking = await bookingService.cancelBookingByTeacher(
    req.user._id,
    req.params.bookingId,
    req.body,
  );
  res.status(200).json({
    success: true,
    message: "Booking cancelled",
    data: booking,
  });
};

module.exports = {
  bookSlot,
  getStudentBookings,
  getTeacherPendingCompletion,
  getTeacherBookingHistory,
  completeTeacherBooking,
  getTeacherRescheduleOptions,
  rescheduleTeacherBooking,
  cancelTeacherBooking,
};
