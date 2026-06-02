const rosterService = require("../roster/roster.service");
const adminService = require("../admin/admin.service");
const ApiError = require("../../utils/ApiError");
const getPrisma = require("../../config/postgres");
const { idOrLegacyWhere } = require("../../utils/id");
const {
  toUtcDateStart,
  isInBookingWindow,
  getPickerYmdFromDateInput,
  getYmdInIst,
} = require("../../utils/time");
const { pickDominantSlotBooking } = require("../../utils/bookingSlotMap");

const prisma = process.env.DATABASE_URL ? getPrisma() : null;

const assertPrisma = () => {
  if (!prisma) throw new ApiError(500, "Postgres is not configured");
};

const {
  teacherMatchesRoster,
  teacherBatchesInclude,
  teachersForRosterWhere,
} = require("../../utils/teacherBatches");

const getRecordId = (record) => record?.id || record?._id || null;

const withMongoLikeId = (record) => {
  if (!record) return null;
  return {
    ...record,
    _id: record._id || record.id,
  };
};

const getBookingWindow = async () => {
  const bookingWindowDays = await adminService.getBookingWindowDays();
  return { bookingWindowDays };
};

const lookupStudent = async ({ mobile }) => {
  const students = await rosterService.findByMobile(mobile);
  return {
    mobile: students[0].mobile,
    students: students.map((student) => ({
      id: student._id,
      name: student.name,
      mobile: student.mobile,
      grade: student.grade,
      display: student.display,
      batchId: student.batchId,
      batchName: student.batchName,
    })),
  };
};

const getOpenSlots = async ({ rosterStudentId, date }) => {
  const roster = await rosterService.findById(rosterStudentId);
  const rosterRecordId = String(getRecordId(roster));
  const targetDate = toUtcDateStart(date);
  const now = new Date();

  const targetYmd = getPickerYmdFromDateInput(date);
  if (targetYmd < getYmdInIst(now)) {
    throw new ApiError(400, "Past dates are not allowed");
  }

  const bookingWindowDays = await adminService.getBookingWindowDays();
  if (!isInBookingWindow(date, bookingWindowDays)) {
    throw new ApiError(400, "Date is outside configured booking window");
  }

  assertPrisma();
  const rosterLookup = idOrLegacyWhere(rosterRecordId);
    const rosterPg = rosterLookup
      ? await prisma.rosterStudent.findFirst({
          where: rosterLookup,
          select: { id: true },
        })
      : null;

    const candidateTeachers = await prisma.user.findMany({
      where: teachersForRosterWhere(roster),
      include: teacherBatchesInclude,
    });

    const teachers = candidateTeachers.filter((teacher) => teacherMatchesRoster(teacher, roster));

    if (!teachers.length) {
      return {
        roster: {
          id: rosterRecordId,
          name: roster.name,
          mobile: roster.mobile,
          grade: roster.grade,
          display: roster.display,
          batchId: roster.batchId,
          batchName: roster.batchName,
        },
        hasBookingToday: false,
        currentBooking: null,
        slots: [],
      };
    }

    const teacherMap = new Map(teachers.map((teacher) => [teacher.id, teacher]));
    const teacherIds = teachers.map((teacher) => teacher.id);

    const availabilityRows = await prisma.availability.findMany({
      where: {
        teacherId: { in: teacherIds },
        dateYmd: targetDate,
      },
      include: {
        slots: true,
      },
    });

    const bookings = await prisma.booking.findMany({
      where: {
        date: targetDate,
        status: { in: ["scheduled", "cancelled"] },
        teacherId: { in: teacherIds },
      },
      select: {
        id: true,
        teacherId: true,
        slotId: true,
        status: true,
        rosterStudentId: true,
        updatedAt: true,
      },
    });

    const bookingByTeacherSlot = new Map();
    bookings.forEach((booking) => {
      if (!booking.slotId) return;
      const key = `${booking.teacherId}|${booking.slotId}`;
      const prev = bookingByTeacherSlot.get(key);
      bookingByTeacherSlot.set(key, pickDominantSlotBooking(prev, booking));
    });

    const currentBooking = rosterPg
      ? await prisma.booking.findFirst({
          where: {
            rosterStudentId: rosterPg.id,
            date: targetDate,
            status: "scheduled",
          },
        })
      : null;

    const hasBookingToday = Boolean(currentBooking);
    const slotsMap = new Map();

    availabilityRows.forEach((row) => {
      const teacher = teacherMap.get(row.teacherId);
      if (!teacher) return;

      (row.slots || []).forEach((slot) => {
        if (new Date(slot.startTime) <= now) {
          return;
        }
        const key = `${new Date(slot.startTime).toISOString()}|${new Date(slot.endTime).toISOString()}`;
        if (!slotsMap.has(key)) {
          slotsMap.set(key, {
            startTime: new Date(slot.startTime).toISOString(),
            endTime: new Date(slot.endTime).toISOString(),
            teachers: [],
          });
        }

        const bookingKey = `${row.teacherId}|${slot.id}`;
        const booking = bookingByTeacherSlot.get(bookingKey);
        let slotState = "available";
        let bookingId = null;

        if (booking?.status === "scheduled") {
          if (rosterPg && String(booking.rosterStudentId) === String(rosterPg.id)) {
            slotState = "yours";
          } else {
            slotState = "taken";
          }
          bookingId = booking.id;
        } else if (booking?.status === "cancelled") {
          slotState = "cancelled";
          bookingId = booking.id;
        } else if (slot.isBooked) {
          slotState = "taken";
        }

        const canBook = !hasBookingToday && slotState === "available";

        slotsMap.get(key).teachers.push({
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherEmail: teacher.email,
          availabilityId: row.id,
          slotId: slot.id,
          slotState,
          bookingId,
          canBook,
        });
      });
    });

    const slots = Array.from(slotsMap.values()).sort(
      (a, b) => new Date(a.startTime) - new Date(b.startTime),
    );

    return {
      roster: {
        id: rosterRecordId,
        name: roster.name,
        mobile: roster.mobile,
        grade: roster.grade,
        display: roster.display,
        batchId: roster.batchId,
        batchName: roster.batchName,
      },
      hasBookingToday,
      currentBooking: withMongoLikeId(currentBooking),
      slots,
    };
};

module.exports = {
  getBookingWindow,
  lookupStudent,
  getOpenSlots,
};
