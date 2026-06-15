const ApiError = require("../../utils/ApiError");
const adminService = require("../admin/admin.service");
const getPrisma = require("../../config/postgres");
const { idOrLegacyWhere } = require("../../utils/id");
const {
  combineIstDateAndTime,
  toUtcDateStart,
  isInBookingWindow,
  hasOverlap,
  getPickerYmdFromDateInput,
  getYmdInIst,
} = require("../../utils/time");
const { pickDominantSlotBooking } = require("../../utils/bookingSlotMap");

const prisma = process.env.DATABASE_URL ? getPrisma() : null;

const assertPrisma = () => {
  if (!prisma) throw new ApiError(500, "Postgres is not configured");
};

const resolveTeacherUuid = async (teacherId) => {
  const lookup = idOrLegacyWhere(String(teacherId || "").trim());
  if (!lookup) return null;
  const u = await prisma.user.findFirst({
    where: { AND: [lookup, { role: "teacher" }] },
    select: { id: true },
  });
  return u?.id ?? null;
};

const mapSlotInput = (date, slot) => {
  const startTime = combineIstDateAndTime(date, slot.startTime);
  const endTime = combineIstDateAndTime(date, slot.endTime);
  if (endTime <= startTime) {
    throw new ApiError(400, "Slot endTime must be later than startTime");
  }
  return { startTime, endTime, isBooked: false };
};

const getHhmmInIst = (instant) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  })
    .formatToParts(instant)
    .reduce((acc, part) => {
      if (part.type === "hour" || part.type === "minute") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});
  return `${parts.hour}:${parts.minute}`;
};

const assertTeacherSlotRules = async ({ dateInput, slot, bookingWindowDays }) => {
  const now = new Date();
  const pickerYmd = getPickerYmdFromDateInput(dateInput);
  const todayIstYmd = getYmdInIst(now);

  if (pickerYmd < todayIstYmd) {
    throw new ApiError(400, "Past dates are not allowed");
  }
  if (!isInBookingWindow(dateInput, bookingWindowDays)) {
    throw new ApiError(400, "Date is outside configured booking window");
  }

  if (slot.endTime <= slot.startTime) {
    throw new ApiError(400, "Slot endTime must be later than startTime");
  }

  if (pickerYmd === todayIstYmd) {
    const minHhmm = getHhmmInIst(new Date(now.getTime() + 60 * 60 * 1000));
    const slotStartHhmm = getHhmmInIst(slot.startTime);
    if (slotStartHhmm < minHhmm) {
      throw new ApiError(
        400,
        "For today (IST), slot start must be at least 1 hour after the current time",
      );
    }
  }
};

const toAvailabilityRowShape = (row) => ({
  _id: row.id,
  teacherId: row.teacherId,
  date: row.dateYmd,
  slots: (row.slots || []).map((s) => ({
    _id: s.id,
    startTime: s.startTime,
    endTime: s.endTime,
    isBooked: s.isBooked,
  })),
});

const setTeacherAvailability = async (teacherId, payload) => {
  assertPrisma();
  const tid = await resolveTeacherUuid(teacherId);
  if (!tid) throw new ApiError(404, "Teacher not found");

  const bookingWindowDays = await adminService.getBookingWindowDays();
  const date = toUtcDateStart(payload.date);
  const now = new Date();
  const pickerYmd = getPickerYmdFromDateInput(payload.date);
  const todayIstYmd = getYmdInIst(now);

  if (pickerYmd < todayIstYmd) {
    throw new ApiError(400, "Past dates are not allowed");
  }

  if (!isInBookingWindow(payload.date, bookingWindowDays)) {
    throw new ApiError(400, "Date is outside configured booking window");
  }

  const mappedSlots = payload.slots.map((slot) => mapSlotInput(date, slot));
  const isTodayIst = pickerYmd === todayIstYmd;
  if (isTodayIst) {
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const hasTooSoonSlot = mappedSlots.some((slot) => slot.startTime < oneHourFromNow);
    if (hasTooSoonSlot) {
      throw new ApiError(
        400,
        "For today (IST), slot start must be at least 1 hour after the current time",
      );
    }
  }

  const incomingByKey = new Map();
  mappedSlots.forEach((slot) => {
    const key = `${slot.startTime.toISOString()}|${slot.endTime.toISOString()}`;
    if (!incomingByKey.has(key)) {
      incomingByKey.set(key, slot);
    }
  });
  const newSlots = Array.from(incomingByKey.values());

  if (hasOverlap(newSlots)) {
    throw new ApiError(400, "Overlapping slots are not allowed");
  }

  let availability = await prisma.availability.findUnique({
    where: {
      teacherId_dateYmd: {
        teacherId: tid,
        dateYmd: date,
      },
    },
    include: { slots: true },
  });

  if (!availability) {
    availability = await prisma.availability.create({
      data: {
        teacherId: tid,
        dateYmd: date,
      },
      include: { slots: true },
    });
  }

  const existingKeys = new Set(
    availability.slots.map(
      (slot) => `${new Date(slot.startTime).toISOString()}|${new Date(slot.endTime).toISOString()}`,
    ),
  );
  const freshSlots = newSlots.filter(
    (slot) => !existingKeys.has(`${slot.startTime.toISOString()}|${slot.endTime.toISOString()}`),
  );

  if (!freshSlots.length) {
    throw new ApiError(409, "This slot is already saved for the selected date");
  }

  const merged = [
    ...availability.slots.map((s) => ({
      startTime: new Date(s.startTime),
      endTime: new Date(s.endTime),
    })),
    ...freshSlots,
  ];
  if (hasOverlap(merged)) {
    throw new ApiError(400, "New slots overlap existing slots");
  }

  await prisma.availabilitySlot.createMany({
    data: freshSlots.map((slot) => ({
      availabilityId: availability.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isBooked: false,
    })),
  });

  const updated = await prisma.availability.findUnique({
    where: { id: availability.id },
    include: { slots: true },
  });
  return toAvailabilityRowShape(updated);
};

const updateTeacherSlot = async ({ teacherId, availabilityId, slotId, startTime, endTime }) => {
  assertPrisma();
  const tid = await resolveTeacherUuid(teacherId);
  if (!tid) throw new ApiError(404, "Teacher not found");

  const availLookup = idOrLegacyWhere(String(availabilityId));
  if (!availLookup) throw new ApiError(404, "Availability not found");

  const availability = await prisma.availability.findFirst({
    where: { AND: [availLookup, { teacherId: tid }] },
    include: { slots: true },
  });
  if (!availability) {
    throw new ApiError(404, "Availability not found");
  }

  const slotLookup = idOrLegacyWhere(String(slotId));
  if (!slotLookup) throw new ApiError(404, "Slot not found");

  const target = await prisma.availabilitySlot.findFirst({
    where: { AND: [slotLookup, { availabilityId: availability.id }] },
  });
  if (!target) {
    throw new ApiError(404, "Slot not found");
  }
  if (target.isBooked) {
    throw new ApiError(400, "Booked slot cannot be edited");
  }

  const bookingWindowDays = await adminService.getBookingWindowDays();
  const updatedSlot = mapSlotInput(availability.dateYmd, { startTime, endTime });
  await assertTeacherSlotRules({
    dateInput: availability.dateYmd,
    slot: updatedSlot,
    bookingWindowDays,
  });

  const siblings = availability.slots
    .filter((slot) => String(slot.id) !== String(target.id))
    .map((slot) => ({
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
    }));
  const merged = [...siblings, updatedSlot];
  if (hasOverlap(merged)) {
    throw new ApiError(400, "Updated slot overlaps existing slots");
  }

  await prisma.availabilitySlot.update({
    where: { id: target.id },
    data: {
      startTime: updatedSlot.startTime,
      endTime: updatedSlot.endTime,
    },
  });

  const next = await prisma.availability.findUnique({
    where: { id: availability.id },
    include: { slots: true },
  });
  return toAvailabilityRowShape(next);
};

const deleteTeacherSlot = async ({ teacherId, availabilityId, slotId }) => {
  assertPrisma();
  const tid = await resolveTeacherUuid(teacherId);
  if (!tid) throw new ApiError(404, "Teacher not found");

  const availLookup = idOrLegacyWhere(String(availabilityId));
  if (!availLookup) throw new ApiError(404, "Availability not found");

  const availability = await prisma.availability.findFirst({
    where: { AND: [availLookup, { teacherId: tid }] },
    include: { slots: true },
  });
  if (!availability) {
    throw new ApiError(404, "Availability not found");
  }

  const slotLookup = idOrLegacyWhere(String(slotId));
  if (!slotLookup) throw new ApiError(404, "Slot not found");

  const target = await prisma.availabilitySlot.findFirst({
    where: { AND: [slotLookup, { availabilityId: availability.id }] },
  });
  if (!target) {
    throw new ApiError(404, "Slot not found");
  }
  if (target.isBooked) {
    throw new ApiError(400, "Booked slot cannot be deleted");
  }

  await prisma.availabilitySlot.delete({ where: { id: target.id } });

  const next = await prisma.availability.findUnique({
    where: { id: availability.id },
    include: { slots: true },
  });
  return toAvailabilityRowShape(next);
};

const bookingToSlotPayload = (slot, b) => {
  const roster = b.rosterStudentId;
  const student = b.studentId;
  const learnerName = roster?.name || student?.name || "Learner";
  return {
    ...slot,
    booking: {
      id: String(b._id),
      status: b.status || "scheduled",
      rescheduledAt: b.rescheduledAt ?? null,
      cancellationReason: b.cancellationReason ?? null,
      learnerName,
      learnerUserId: roster?.userId ?? null,
      learnerGrade: roster?.grade ?? student?.grade ?? null,
      learnerBatchId: roster?.batchId ?? null,
      learnerBatchName: roster?.batchName ?? null,
      learnerMobile: roster?.mobile ?? null,
      contactEmail: b.contactEmail || student?.email || null,
      meetingLink: b.meetingLink || null,
      startTime: b.startTime,
      endTime: b.endTime,
    },
  };
};

/**
 * Teacher cancel clears `isBooked` on the slot so it can be rebooked, but the calendar should
 * still show the session as cancelled (not as an empty "open" slot).
 */
const attachBookingDetailsToSlots = (availabilityRows, bookingsByAvailSlot) =>
  availabilityRows.map((row) => ({
    ...row,
    slots: row.slots.map((slot) => {
      const key = `${String(row._id)}|${String(slot._id)}`;
      const b = bookingsByAvailSlot.get(key);

      if (slot.isBooked) {
        if (!b) {
          return { ...slot, booking: null };
        }
        return bookingToSlotPayload(slot, b);
      }

      if (b && b.status === "cancelled") {
        return bookingToSlotPayload(slot, b);
      }

      return { ...slot, booking: null };
    }),
  }));

const getTeacherCalendar = async (teacherId, query) => {
  assertPrisma();
  const tid = await resolveTeacherUuid(teacherId);
  if (!tid) throw new ApiError(404, "Teacher not found");

  const dateFilter = {};
  if (query.from || query.to) {
    dateFilter.dateYmd = {};
    if (query.from) dateFilter.dateYmd.gte = toUtcDateStart(query.from);
    if (query.to) dateFilter.dateYmd.lte = toUtcDateStart(query.to);
  }

  const rows = await prisma.availability.findMany({
    where: { teacherId: tid, ...dateFilter },
    orderBy: { dateYmd: "asc" },
    include: { slots: { orderBy: { startTime: "asc" } } },
  });

  const availabilityRows = rows.map(toAvailabilityRowShape);

  const bookings = await prisma.booking.findMany({
    where: {
      teacherId: tid,
      status: {
        in: [
          "scheduled",
          "cancelled",
          "completed",
          "student_did_not_join",
          "teacher_did_not_join",
        ],
      },
    },
    include: {
      rosterStudent: { select: { userId: true, name: true, grade: true, batchId: true, batchName: true, mobile: true } },
      student: { select: { name: true, email: true, grade: true } },
    },
  });

  const byKey = new Map();
  for (const b of bookings) {
    if (!b.availabilityId || !b.slotId) continue;
    const key = `${String(b.availabilityId)}|${String(b.slotId)}`;
    const prev = byKey.get(key);
    byKey.set(key, pickDominantSlotBooking(prev, b));
  }

  const bookingsByAvailSlot = new Map();
  for (const [key, b] of byKey) {
    const roster = b.rosterStudent
      ? { ...b.rosterStudent, _id: b.rosterStudent.id }
      : null;
    const student = b.student ? { ...b.student, _id: b.student.id } : null;
    bookingsByAvailSlot.set(key, {
      _id: b.id,
      status: b.status,
      rescheduledAt: b.rescheduledAt,
      cancellationReason: b.cancellationReason,
      contactEmail: b.contactEmail,
      meetingLink: b.meetingLink,
      startTime: b.startTime,
      endTime: b.endTime,
      updatedAt: b.updatedAt,
      rosterStudentId: roster,
      studentId: student,
    });
  }

  return attachBookingDetailsToSlots(availabilityRows, bookingsByAvailSlot);
};

const getSlotsForStudents = async ({ grade, date }) => {
  assertPrisma();
  const targetDate = toUtcDateStart(date);
  const now = new Date();
  const bookingWindowDays = await adminService.getBookingWindowDays();

  const targetYmd = getPickerYmdFromDateInput(date);
  if (targetYmd < getYmdInIst(now)) {
    throw new ApiError(400, "Past dates are not allowed");
  }
  if (!isInBookingWindow(date, bookingWindowDays)) {
    throw new ApiError(400, "Date is outside configured booking window");
  }

  const teachers = await prisma.user.findMany({
    where: { role: "teacher", grade: String(grade).trim() },
    select: { id: true, name: true, email: true, grade: true },
  });

  if (teachers.length === 0) {
    return [];
  }

  const teacherMap = new Map(teachers.map((teacher) => [String(teacher.id), teacher]));
  const teacherIds = teachers.map((t) => t.id);

  const availabilityRows = await prisma.availability.findMany({
    where: {
      teacherId: { in: teacherIds },
      dateYmd: targetDate,
    },
    include: { slots: true },
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
      updatedAt: true,
    },
  });

  const bookingByTeacherSlot = new Map();
  for (const b of bookings) {
    if (!b.slotId) continue;
    const key = `${b.teacherId}|${b.slotId}`;
    const prev = bookingByTeacherSlot.get(key);
    bookingByTeacherSlot.set(key, pickDominantSlotBooking(prev, b));
  }

  const slotsMap = new Map();

  availabilityRows.forEach((row) => {
    const teacher = teacherMap.get(String(row.teacherId));
    if (!teacher) return;

    row.slots
      .filter((slot) => {
        if (new Date(slot.startTime) <= now) return false;
        if (slot.isBooked) return false;
        const b = bookingByTeacherSlot.get(`${row.teacherId}|${slot.id}`);
        if (b?.status === "cancelled") return false;
        return true;
      })
      .forEach((slot) => {
        const key = `${new Date(slot.startTime).toISOString()}|${new Date(slot.endTime).toISOString()}`;
        if (!slotsMap.has(key)) {
          slotsMap.set(key, {
            startTime: new Date(slot.startTime).toISOString(),
            endTime: new Date(slot.endTime).toISOString(),
            teachers: [],
          });
        }

        slotsMap.get(key).teachers.push({
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherEmail: teacher.email,
          availabilityId: row.id,
          slotId: slot.id,
        });
      });
  });

  return Array.from(slotsMap.values()).sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime),
  );
};

module.exports = {
  setTeacherAvailability,
  updateTeacherSlot,
  deleteTeacherSlot,
  getTeacherCalendar,
  getSlotsForStudents,
};
