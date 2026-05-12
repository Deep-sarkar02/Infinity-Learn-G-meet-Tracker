const availabilityService = require("./availability.service");
const adminService = require("../admin/admin.service");

const setAvailability = async (req, res) => {
  const availability = await availabilityService.setTeacherAvailability(
    req.user._id,
    req.body,
  );

  res.status(201).json({
    success: true,
    message: "Availability set successfully",
    data: availability,
  });
};

const updateTeacherSlot = async (req, res) => {
  const availability = await availabilityService.updateTeacherSlot({
    teacherId: req.user._id,
    availabilityId: req.params.availabilityId,
    slotId: req.params.slotId,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
  });
  res.status(200).json({
    success: true,
    message: "Slot updated successfully",
    data: availability,
  });
};

const deleteTeacherSlot = async (req, res) => {
  const availability = await availabilityService.deleteTeacherSlot({
    teacherId: req.user._id,
    availabilityId: req.params.availabilityId,
    slotId: req.params.slotId,
  });
  res.status(200).json({
    success: true,
    message: "Slot deleted successfully",
    data: availability,
  });
};

const getOwnCalendar = async (req, res) => {
  const [calendar, bookingWindowDays] = await Promise.all([
    availabilityService.getTeacherCalendar(req.user._id, req.query),
    adminService.getBookingWindowDays(),
  ]);
  res.status(200).json({
    success: true,
    data: {
      calendar,
      bookingWindowDays,
    },
  });
};

const getAvailableSlots = async (req, res) => {
  const result = await availabilityService.getSlotsForStudents(req.query);
  res.status(200).json({
    success: true,
    data: result,
  });
};

module.exports = {
  setAvailability,
  updateTeacherSlot,
  deleteTeacherSlot,
  getOwnCalendar,
  getAvailableSlots,
};
