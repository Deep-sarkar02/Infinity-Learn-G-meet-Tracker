const publicService = require("./public.service");
const bookingService = require("../bookings/booking.service");

const lookupStudent = async (req, res) => {
  const data = await publicService.lookupStudent(req.body);
  res.status(200).json({ success: true, data });
};

const getOpenSlots = async (req, res) => {
  const data = await publicService.getOpenSlots(req.query);
  res.status(200).json({ success: true, data });
};

const bookOpenSlot = async (req, res) => {
  const {
    booking,
    parentWhatsAppQueued,
    parentWhatsAppResult,
    lsqProspectActivityDebug,
  } = await bookingService.bookSlotAsRoster(req.body);
  res.status(201).json({
    success: true,
    message: "Slot booked successfully",
    data: booking,
    parentWhatsAppQueued,
    parentWhatsAppResult,
    parentWhatsAppEvent: parentWhatsAppQueued ? "roster_booking_confirmed" : null,
    ...(lsqProspectActivityDebug !== undefined ? { lsqProspectActivityDebug } : {}),
    ...(lsqProspectActivityDebug !== undefined
      ? { debug: { lsqProspectActivity: lsqProspectActivityDebug } }
      : {}),
  });
};

const listOpenBookings = async (req, res) => {
  const bookings = await bookingService.listRosterBookings(
    req.query.rosterStudentId,
    req.query.mobile,
  );
  res.status(200).json({ success: true, data: bookings });
};

module.exports = {
  lookupStudent,
  getOpenSlots,
  bookOpenSlot,
  listOpenBookings,
};
