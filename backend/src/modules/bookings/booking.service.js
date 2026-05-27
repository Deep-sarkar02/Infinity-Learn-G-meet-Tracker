const ApiError = require("../../utils/ApiError");
const logger = require("../../config/logger");
const env = require("../../config/env");
const getPrisma = require("../../config/postgres");
const adminService = require("../admin/admin.service");
const {
  isInBookingWindow,
  toUtcDateStart,
  getYmdInIst,
  addCalendarDaysToYmd,
  getPickerYmdFromDateInput,
} = require("../../utils/time");
const { idOrLegacyWhere } = require("../../utils/id");
const { pickDominantSlotBooking } = require("../../utils/bookingSlotMap");

const IST_OFFSET = "+05:30";
const IST_WEEKDAY_TO_OFFSET = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
const {
  createGoogleMeetEvent,
  deleteGoogleCalendarEvent,
} = require("../integrations/google/googleCalendar.service");
const rosterService = require("../roster/roster.service");
const {
  sendRosterBookingConfirmedWhatsApp,
  isParentWhatsAppDispatchEligible,
} = require("../notifications/gupshupWhatsApp.service");
const {
  buildRosterBookingProspectActivityPayload,
  notifyRosterBookingProspectActivity,
} = require("../integrations/lsq/lsqProspectActivity.service");
const { teacherMatchesRoster, teacherBatchesInclude } = require("../../utils/teacherBatches");
const prisma = process.env.DATABASE_URL ? getPrisma() : null;

const assertPrisma = () => {
  if (!prisma) throw new ApiError(500, "Postgres is not configured");
};

/** Teacher cancel frees the slot row but leaves a cancelled booking; that slot must not be reused for booking/reschedule until superseded. */
const assertSlotNotClosedByTeacherCancellation = async (
  teacherId,
  slotRowId,
  sessionDate,
  message = "This slot is not available for booking.",
) => {
  const related = await prisma.booking.findMany({
    where: {
      teacherId,
      slotId: slotRowId,
      date: sessionDate,
      status: { in: ["scheduled", "cancelled"] },
    },
    select: { status: true, updatedAt: true },
  });
  let dominant = null;
  for (const b of related) {
    dominant = pickDominantSlotBooking(dominant, b);
  }
  if (dominant?.status === "cancelled") {
    throw new ApiError(409, message);
  }
};

const sameText = (a, b) =>
  String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

const mapPrismaBookingToMongoLike = (row) => ({
  ...row,
  _id: row.id,
  rosterStudentId: row.rosterStudent
    ? { ...row.rosterStudent, _id: row.rosterStudent.id }
    : row.rosterStudentId,
  studentId: row.student ? { ...row.student, _id: row.student.id } : row.studentId,
});

const resolveUserIdForPrisma = async (idOrLegacy, role) => {
  if (!prisma || !idOrLegacy) return null;
  const key = String(idOrLegacy);
  const lookup = idOrLegacyWhere(key);
  if (!lookup) return null;
  const row = await prisma.user.findFirst({
    where: {
      ...lookup,
      ...(role ? { role } : {}),
    },
    select: { id: true },
  });
  return row?.id ?? null;
};

const resolveRosterIdForPrisma = async (idOrLegacy) => {
  if (!prisma || !idOrLegacy) return null;
  const key = String(idOrLegacy);
  const lookup = idOrLegacyWhere(key);
  if (!lookup) return null;
  const row = await prisma.rosterStudent.findFirst({
    where: lookup,
    select: { id: true },
  });
  return row?.id ?? null;
};

const bookSlot = async ({ studentId, availabilityId, slotId }) => {
  assertPrisma();
  const studentPgId = await resolveUserIdForPrisma(studentId, "student");
  if (!studentPgId) {
    throw new ApiError(404, "Student not found");
  }
  const student = await prisma.user.findUnique({ where: { id: studentPgId } });
  if (!student || student.role !== "student") {
    throw new ApiError(404, "Student not found");
  }

  const availLookup = idOrLegacyWhere(String(availabilityId));
  if (!availLookup) throw new ApiError(404, "Availability not found");
  const availability = await prisma.availability.findFirst({
    where: availLookup,
    include: { slots: true },
  });
  if (!availability) {
    throw new ApiError(404, "Availability not found");
  }

  const teacher = await prisma.user.findFirst({
    where: { id: availability.teacherId, role: "teacher" },
    include: teacherBatchesInclude,
  });
  if (!teacher) {
    throw new ApiError(404, "Teacher not found");
  }

  const rosterLike = {
    grade: student.grade,
    display: student.display,
    batchId: student.batchId,
    batchName: student.batchName,
  };
  if (!teacherMatchesRoster(teacher, rosterLike)) {
    throw new ApiError(403, "Teacher is not assigned to this student's grade, channel, and batch");
  }

  const bookingWindowDays = await adminService.getBookingWindowDays();
  if (!isInBookingWindow(availability.dateYmd, bookingWindowDays)) {
    throw new ApiError(400, "Date is outside configured booking window");
  }

  const slotLookup = idOrLegacyWhere(String(slotId));
  if (!slotLookup) throw new ApiError(404, "Slot not found");
  const now = new Date();
  const slotRow = await prisma.availabilitySlot.findFirst({
    where: {
      AND: [
        slotLookup,
        { availabilityId: availability.id },
        { isBooked: false },
        { startTime: { gt: now } },
      ],
    },
  });
  if (!slotRow) {
    throw new ApiError(409, "Slot is already booked or unavailable");
  }
  if (toUtcDateStart(slotRow.startTime) < toUtcDateStart(now)) {
    throw new ApiError(400, "Cannot book past slots");
  }

  await assertSlotNotClosedByTeacherCancellation(teacher.id, slotRow.id, availability.dateYmd);

  const reserved = await prisma.availabilitySlot.updateMany({
    where: { id: slotRow.id, isBooked: false },
    data: { isBooked: true },
  });
  if (reserved.count !== 1) {
    throw new ApiError(409, "Slot is already booked or unavailable");
  }

  try {
    const { meetingLink, eventId } = await createGoogleMeetEvent({
      teacherEmail: teacher.email,
      studentEmail: student.email,
      startTime: slotRow.startTime,
      endTime: slotRow.endTime,
    });

    const booking = await prisma.booking.create({
      data: {
        studentId: studentPgId,
        rosterStudentId: null,
        teacherId: teacher.id,
        availabilityId: availability.id,
        slotId: slotRow.id,
        date: availability.dateYmd,
        startTime: slotRow.startTime,
        endTime: slotRow.endTime,
        meetingLink,
        googleCalendarEventId: eventId,
        status: "scheduled",
      },
    });
    await prisma.availabilitySlot.update({
      where: { id: slotRow.id },
      data: { bookingId: booking.id },
    });
    return { ...booking, _id: booking.id };
  } catch (error) {
    await prisma.availabilitySlot.update({
      where: { id: slotRow.id },
      data: { isBooked: false, bookingId: null },
    });
    throw error;
  }
};

const listStudentBookings = async (studentId) => {
  assertPrisma();
  const studentPgId = await resolveUserIdForPrisma(studentId, "student");
  if (!studentPgId) return [];
  const rows = await prisma.booking.findMany({
    where: { studentId: studentPgId },
    orderBy: { startTime: "asc" },
  });
  return rows.map((row) => ({ ...row, _id: row.id }));
};

const bookSlotAsRoster = async ({
  mobile,
  name,
  rosterStudentId,
  availabilityId,
  slotId,
  contactEmail,
}) => {
  assertPrisma();
  const roster = await rosterService.findById(rosterStudentId);
  if (roster.mobile !== rosterService.normalizeMobile(mobile)) {
    throw new ApiError(403, "Mobile number does not match roster record");
  }
  if (roster.nameLower !== rosterService.toNameLower(name)) {
    throw new ApiError(403, "Name does not match roster record");
  }

  const rosterPgId = await resolveRosterIdForPrisma(rosterStudentId);
  if (!rosterPgId) {
    throw new ApiError(404, "Roster student not found");
  }

  const availLookup = idOrLegacyWhere(String(availabilityId));
  if (!availLookup) throw new ApiError(404, "Availability not found");
  const availability = await prisma.availability.findFirst({
    where: availLookup,
    include: { slots: true },
  });
  if (!availability) {
    throw new ApiError(404, "Availability not found");
  }

  const targetDay = toUtcDateStart(availability.dateYmd);
  const duplicateDay = await prisma.booking.findFirst({
    where: {
      rosterStudentId: rosterPgId,
      date: targetDay,
      status: "scheduled",
    },
  });
  if (duplicateDay) {
    throw new ApiError(
      400,
      "You already have a booking on this day. Cancel it before booking another slot.",
    );
  }

  const teacher = await prisma.user.findFirst({
    where: { id: availability.teacherId, role: "teacher" },
    include: teacherBatchesInclude,
  });
  if (!teacher) {
    throw new ApiError(404, "Teacher not found");
  }
  if (!teacherMatchesRoster(teacher, roster)) {
    throw new ApiError(403, "This teacher is not mapped to your grade, channel, or batch");
  }

  const bookingWindowDays = await adminService.getBookingWindowDays();
  if (!isInBookingWindow(availability.dateYmd, bookingWindowDays)) {
    throw new ApiError(400, "Date is outside configured booking window");
  }

  const slotLookup = idOrLegacyWhere(String(slotId));
  if (!slotLookup) throw new ApiError(404, "Slot not found");
  const now = new Date();
  const slotRow = await prisma.availabilitySlot.findFirst({
    where: {
      AND: [
        slotLookup,
        { availabilityId: availability.id },
        { isBooked: false },
        { startTime: { gt: now } },
      ],
    },
  });
  if (!slotRow) {
    throw new ApiError(409, "Slot is already booked or unavailable");
  }

  await assertSlotNotClosedByTeacherCancellation(teacher.id, slotRow.id, targetDay);

  const reserved = await prisma.availabilitySlot.updateMany({
    where: { id: slotRow.id, isBooked: false },
    data: { isBooked: true },
  });
  if (reserved.count !== 1) {
    throw new ApiError(409, "Slot is already booked or unavailable");
  }

  const studentEmailForMeet = String(contactEmail).trim().toLowerCase();

  try {
    const { meetingLink, eventId } = await createGoogleMeetEvent({
      teacherEmail: teacher.email,
      studentEmail: studentEmailForMeet,
      startTime: slotRow.startTime,
      endTime: slotRow.endTime,
    });

    const booking = await prisma.booking.create({
      data: {
        studentId: null,
        rosterStudentId: rosterPgId,
        teacherId: teacher.id,
        availabilityId: availability.id,
        slotId: slotRow.id,
        date: targetDay,
        startTime: slotRow.startTime,
        endTime: slotRow.endTime,
        meetingLink,
        googleCalendarEventId: eventId,
        contactEmail: studentEmailForMeet,
        status: "scheduled",
      },
    });
    await prisma.availabilitySlot.update({
      where: { id: slotRow.id },
      data: { bookingId: booking.id },
    });

    const lsqBuilt = buildRosterBookingProspectActivityPayload({
      roster,
      teacher,
      booking,
      contactEmail: studentEmailForMeet,
    });

    const lsqNotifyArgs = {
      roster,
      teacher,
      booking,
      contactEmail: studentEmailForMeet,
      body: lsqBuilt.ok ? lsqBuilt.body : null,
    };

    /** When client debug is on, await LSQ so the response can include push success/failure (adds latency only in dev). */
    let lsqNotifyResult = null;
    if (lsqBuilt.ok) {
      if (env.lsqProspectActivity?.clientDebug) {
        lsqNotifyResult = await notifyRosterBookingProspectActivity(lsqNotifyArgs);
      } else {
        void notifyRosterBookingProspectActivity(lsqNotifyArgs);
      }
    }

    let lsqProspectActivityDebug;
    if (env.lsqProspectActivity?.clientDebug) {
      if (lsqBuilt.ok) {
        lsqProspectActivityDebug = {
          path: "ProspectActivity.svc/CreateCustom",
          method: "POST",
          postJson: lsqBuilt.body,
          lsqDispatchEnabled: Boolean(env.lsqProspectActivity?.enabled),
          notifyResult: lsqNotifyResult,
          note:
            "API keys and full URL stay on the server. With LSQ_PROSPECT_ACTIVITY_CLIENT_DEBUG=true, the server waits for LeadSquared before returning so notifyResult reflects the HTTP outcome.",
        };
      } else {
        lsqProspectActivityDebug = {
          skippedReason: lsqBuilt.reason,
          postJson: null,
        };
      }
    }

    let parentWhatsAppResult = {
      skipped: true,
      requested: false,
      ok: false,
      skippedReason: "whatsapp_not_eligible",
    };
    if (isParentWhatsAppDispatchEligible(roster.mobile)) {
      parentWhatsAppResult = await sendRosterBookingConfirmedWhatsApp({
        rosterMobile: roster.mobile,
        startTime: booking.startTime,
        endTime: booking.endTime,
        meetingLink: booking.meetingLink,
      });
    }
    const parentWhatsAppQueued = parentWhatsAppResult.ok === true;

    return {
      booking: { ...booking, _id: booking.id },
      parentWhatsAppQueued,
      parentWhatsAppResult,
      ...(lsqProspectActivityDebug !== undefined ? { lsqProspectActivityDebug } : {}),
    };
  } catch (error) {
    await prisma.availabilitySlot.update({
      where: { id: slotRow.id },
      data: { isBooked: false, bookingId: null },
    });
    throw error;
  }
};

const listRosterBookings = async (rosterStudentId, mobile) => {
  assertPrisma();
  await rosterService.verifyMobile(rosterStudentId, mobile);
  const rosterPgId = await resolveRosterIdForPrisma(rosterStudentId);
  if (!rosterPgId) return [];
  const rows = await prisma.booking.findMany({
    where: { rosterStudentId: rosterPgId },
    orderBy: { startTime: "desc" },
    take: 50,
    include: {
      teacher: {
        select: { id: true, name: true, email: true },
      },
    },
  });
  return rows.map((row) => ({
    ...row,
    _id: row.id,
    teacherId: row.teacher
      ? {
          _id: row.teacher.id,
          name: row.teacher.name,
          email: row.teacher.email,
        }
      : row.teacherId,
  }));
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ADMIN_LIST_STATUS = new Set([
  "scheduled",
  "cancelled",
  "completed",
  "student_did_not_join",
  "teacher_did_not_join",
]);

const getIstMonthWindow = (monthYyyyMm) => {
  const month = String(monthYyyyMm ?? "").trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const from = new Date(`${month}-01T00:00:00${IST_OFFSET}`);
  const to = new Date(from);
  to.setMonth(to.getMonth() + 1);
  to.setMilliseconds(to.getMilliseconds() - 1);
  return {
    from,
    to,
    month,
    fromYmd: month,
    toYmd: getYmdInIst(to),
  };
};

const mapAdminBookingItemFromPrisma = (row) => {
  const roster = row.rosterStudent || null;
  const student = row.student || null;
  const learnerGrade = roster?.grade ?? student?.grade ?? null;
  const learnerName = roster?.name ?? student?.name ?? "Learner";
  const bookingKind = row.rosterStudentId ? "roster" : "student";
  return {
    _id: row.id,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    rescheduledAt: row.rescheduledAt,
    recordingUrl: row.recordingUrl,
    transcriptUrl: row.transcriptUrl,
    artifactsLastSyncedAt: row.artifactsLastSyncedAt,
    artifactsLastError: row.artifactsLastError,
    artifactsFetchAttempts: row.artifactsFetchAttempts,
    meetingLink: row.meetingLink,
    contactEmail: row.contactEmail,
    learnerName,
    learnerGrade,
    batchId: roster?.batchId ?? null,
    batchName: roster?.batchName ?? null,
    bookingKind,
    teacherName: row.teacher?.name ?? null,
    teacherEmail: row.teacher?.email ?? null,
    teacherGrade: row.teacher?.grade ?? null,
    googleCalendarEventId: row.googleCalendarEventId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const getSegmentForAdminBooking = (item) => {
  if (item.bookingKind === "student") {
    return {
      segmentKey: "student_app",
      batchLabel: "Logged-in student (app)",
      kind: "student",
      batchId: null,
    };
  }
  const batchId = item.batchId ?? "";
  return {
    segmentKey: `roster|${batchId}`,
    batchLabel: item.batchName || "Roster (no batch name)",
    kind: "roster",
    batchId: item.batchId ?? null,
  };
};

const listAllForAdmin = async ({
  grade,
  batchId,
  bookingKind,
  segmentKey,
  month,
  status,
  page: pageRaw,
  limit: limitRaw,
} = {}) => {
  const gradeTrim =
    grade !== undefined && grade !== null && String(grade).trim() !== ""
      ? String(grade).trim()
      : null;
  const batchTrim =
    batchId !== undefined && batchId !== null && String(batchId).trim() !== ""
      ? String(batchId).trim()
      : null;
  const kindTrim =
    bookingKind !== undefined && bookingKind !== null && String(bookingKind).trim() !== ""
      ? String(bookingKind).trim()
      : null;
  const segmentTrim =
    segmentKey !== undefined && segmentKey !== null && String(segmentKey).trim() !== ""
      ? String(segmentKey).trim()
      : null;

  const pageNum =
    pageRaw !== undefined && pageRaw !== null && String(pageRaw).trim() !== ""
      ? Math.max(1, parseInt(String(pageRaw), 10) || 1)
      : null;
  const limitParsed =
    limitRaw !== undefined && limitRaw !== null && String(limitRaw).trim() !== ""
      ? Math.min(500, Math.max(1, parseInt(String(limitRaw), 10) || 20))
      : 20;
  const usePagination = pageNum != null && !Number.isNaN(pageNum);
  const limit = usePagination ? limitParsed : null;
  const skip = usePagination ? (pageNum - 1) * limit : 0;

  const monthWindow = getIstMonthWindow(month);
  const statusTrim =
    status !== undefined && status !== null && String(status).trim() !== ""
      ? String(status).trim()
      : null;

  assertPrisma();
  const where = {};
  if (monthWindow) {
    where.startTime = { gte: monthWindow.from, lte: monthWindow.to };
  }
  if (statusTrim && ADMIN_LIST_STATUS.has(statusTrim)) {
    where.status = statusTrim;
  }
  const rows = await prisma.booking.findMany({
    where,
    orderBy: { startTime: "desc" },
    include: {
      teacher: { select: { name: true, email: true, grade: true } },
      rosterStudent: { select: { name: true, grade: true, batchId: true, batchName: true } },
      student: { select: { name: true, grade: true } },
    },
  });

  let items = rows.map(mapAdminBookingItemFromPrisma);
  if (segmentTrim) {
    if (segmentTrim === "student_app") {
      items = items.filter((item) => item.bookingKind === "student");
    } else if (segmentTrim.startsWith("roster|")) {
      const rest = segmentTrim.slice("roster|".length);
      items = items.filter((item) => item.bookingKind === "roster");
      if (rest === "") {
        items = items.filter((item) => !item.batchId);
      } else {
        const re = new RegExp(`^${escapeRegex(rest)}$`, "i");
        items = items.filter((item) => re.test(String(item.batchId || "")));
      }
    }
  } else {
    if (gradeTrim) items = items.filter((item) => item.learnerGrade === gradeTrim);
    if (batchTrim) {
      const re = new RegExp(`^${escapeRegex(batchTrim)}$`, "i");
      items = items.filter((item) => re.test(String(item.batchId || "")));
    }
    if (kindTrim === "student" || kindTrim === "roster") {
      items = items.filter((item) => item.bookingKind === kindTrim);
    }
  }

  const total = items.length;
  if (!usePagination) {
    return {
      items,
      total,
      page: 1,
      limit: total,
      totalPages: 1,
    };
  }
  const paged = items.slice(skip, skip + limit);
  return {
    items: paged,
    total,
    page: pageNum,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit) || 1),
  };
};

/**
 * Scheduled meetings only — counts by learner grade and by batch / booking channel for admin dashboard charts.
 */
const getBookingDashboardStats = async (month) => {
  assertPrisma();
  const monthWindow = getIstMonthWindow(month);
  const where = {};
  if (monthWindow) {
    where.startTime = { gte: monthWindow.from, lte: monthWindow.to };
  }
  const rows = await prisma.booking.findMany({
    where: {
      ...where,
      status: { in: ["scheduled", "cancelled"] },
    },
    include: {
      rosterStudent: { select: { grade: true, batchId: true, batchName: true } },
      student: { select: { grade: true } },
    },
    orderBy: { startTime: "desc" },
  });

  const scheduled = rows.filter((row) => row.status === "scheduled");
  const cancelledTotal = rows.length - scheduled.length;

  const byGradeMap = new Map();
  const byBatchMap = new Map();
  for (const row of scheduled) {
    const item = mapAdminBookingItemFromPrisma(row);
    const grade = item.learnerGrade || "Unknown";
    byGradeMap.set(grade, (byGradeMap.get(grade) || 0) + 1);

    const seg = getSegmentForAdminBooking(item);
    const existing = byBatchMap.get(seg.segmentKey) || {
      segmentKey: seg.segmentKey,
      batchName: seg.batchLabel,
      batchId: seg.batchId,
      kind: seg.kind,
      count: 0,
    };
    existing.count += 1;
    byBatchMap.set(seg.segmentKey, existing);
  }

  const byGrade = [...byGradeMap.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([grade, count]) => ({ grade, count }));
  const byBatch = [...byBatchMap.values()].sort((a, b) =>
    String(a.segmentKey).localeCompare(String(b.segmentKey)),
  );
  return {
    scheduledTotal: scheduled.length,
    cancelledTotal,
    month: monthWindow?.month ?? null,
    byGrade,
    byBatch,
  };
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_WEEKDAY_BATCH_SERIES = 10;

const getIstRollingWindowForStats = (calendarDays = 28) => {
  const now = new Date();
  const days = Math.min(90, Math.max(7, Number(calendarDays) || 28));
  const todayIst = getYmdInIst(now);
  const fromYmd = addCalendarDaysToYmd(todayIst, -(days - 1));
  const from = new Date(`${fromYmd}T00:00:00${IST_OFFSET}`);
  const to = new Date(`${todayIst}T23:59:59.999${IST_OFFSET}`);
  return { from, to, days, fromYmd, toYmd: todayIst };
};

const emptyWeekdayCounts = () => Array(7).fill(0);

const pivotWeekdayGradeRows = (rows) => {
  const byGrade = new Map();
  for (const row of rows) {
    const w = row?._id?.w;
    const g = row?._id?.g != null ? String(row._id.g) : "Unknown";
    const c = Number(row.count) || 0;
    if (w < 0 || w > 6 || !Number.isFinite(w)) continue;
    if (!byGrade.has(g)) byGrade.set(g, emptyWeekdayCounts());
    const arr = byGrade.get(g);
    arr[w] += c;
  }
  return [...byGrade.entries()]
    .map(([grade, counts]) => ({
      key: `g-${grade}`,
      label: grade === "Unknown" ? "Unknown grade" : `Grade ${grade}`,
      counts,
      total: counts.reduce((a, b) => a + b, 0),
    }))
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);
};

const pivotWeekdayBatchRows = (rows) => {
  const bySeg = new Map();
  for (const row of rows) {
    const w = row?._id?.w;
    const seg = row?._id?.s != null ? String(row._id.s) : "unknown";
    const c = Number(row.count) || 0;
    if (w < 0 || w > 6 || !Number.isFinite(w)) continue;
    if (!bySeg.has(seg)) {
      bySeg.set(seg, {
        key: seg,
        label: row.batchName || seg,
        kind: row.kind || null,
        rosterBatchId: row.rosterBatchId ?? null,
        counts: emptyWeekdayCounts(),
      });
    }
    const entry = bySeg.get(seg);
    if (!entry.label && row.batchName) entry.label = row.batchName;
    entry.counts[w] += c;
  }
  let list = [...bySeg.values()].map((s) => ({
    ...s,
    total: s.counts.reduce((a, b) => a + b, 0),
  }));
  list = list.filter((s) => s.total > 0).sort((a, b) => b.total - a.total);
  if (list.length <= MAX_WEEKDAY_BATCH_SERIES) {
    return list;
  }
  const head = list.slice(0, MAX_WEEKDAY_BATCH_SERIES - 1);
  const tail = list.slice(MAX_WEEKDAY_BATCH_SERIES - 1);
  const merged = emptyWeekdayCounts();
  let otherTotal = 0;
  for (const s of tail) {
    otherTotal += s.total;
    for (let i = 0; i < 7; i += 1) merged[i] += s.counts[i];
  }
  head.push({
    key: "__other_batches__",
    label: `Other batches (${tail.length})`,
    kind: null,
    rosterBatchId: null,
    counts: merged,
    total: otherTotal,
  });
  return head;
};

const totalsFromSeries = (series) => {
  const totals = emptyWeekdayCounts();
  for (const s of series) {
    for (let i = 0; i < 7; i += 1) totals[i] += s.counts[i] || 0;
  }
  return totals;
};

/**
 * Bookings per weekday (Mon–Sun, Asia/Kolkata) in a rolling IST window, split by learner grade and by batch/channel.
 * Excludes cancelled. Uses session startTime for the weekday bucket.
 */
const getBookingWeekdayStats = async ({ days: calendarDays = 28, month } = {}) => {
  assertPrisma();
  const monthWindow = getIstMonthWindow(month);
  const baseWindow = monthWindow || getIstRollingWindowForStats(calendarDays);
  const { from, to, days, fromYmd, toYmd } = baseWindow;

  const rows = await prisma.booking.findMany({
    where: {
      startTime: { gte: from, lte: to },
      status: { not: "cancelled" },
    },
    include: {
      rosterStudent: { select: { grade: true, batchId: true, batchName: true } },
      student: { select: { grade: true } },
    },
  });

  const gradeAgg = new Map();
  const batchAgg = new Map();
  for (const row of rows) {
    const weekdayShort = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
    }).format(new Date(row.startTime));
    const w = IST_WEEKDAY_TO_OFFSET[weekdayShort];
    if (w === undefined) continue;

    const item = mapAdminBookingItemFromPrisma(row);
    const g = item.learnerGrade || "Unknown";
    const gradeKey = `${w}\u001f${g}`;
    gradeAgg.set(gradeKey, (gradeAgg.get(gradeKey) || 0) + 1);

    const seg = getSegmentForAdminBooking(item);
    const batchKey = `${w}\u001f${seg.segmentKey}`;
    const prev = batchAgg.get(batchKey) || {
      w,
      s: seg.segmentKey,
      count: 0,
      batchName: seg.batchLabel,
      rosterBatchId: seg.batchId,
      kind: seg.kind,
    };
    prev.count += 1;
    batchAgg.set(batchKey, prev);
  }

  const gradeRows = [...gradeAgg.entries()].map(([key, count]) => {
    const sep = key.indexOf("\u001f");
    const wText = key.slice(0, sep);
    const g = key.slice(sep + 1);
    return { _id: { w: Number(wText), g }, count };
  });
  const batchRows = [...batchAgg.values()].map((v) => ({
    _id: { w: v.w, s: v.s },
    count: v.count,
    batchName: v.batchName,
    rosterBatchId: v.rosterBatchId,
    kind: v.kind,
  }));

  const gradeSeries = pivotWeekdayGradeRows(gradeRows);
  const batchSeries = pivotWeekdayBatchRows(batchRows);
  return {
    weekdays: [...WEEKDAY_LABELS],
    window: {
      month: monthWindow?.month ?? null,
      days,
      from: from.toISOString(),
      to: to.toISOString(),
      fromYmd,
      toYmd,
    },
    byGrade: {
      series: gradeSeries,
      totalsByWeekday: totalsFromSeries(gradeSeries),
    },
    byBatch: {
      series: batchSeries,
      totalsByWeekday: totalsFromSeries(batchSeries),
    },
  };
};

const getTeacherHistoryTimeRange = (window) => {
  const now = new Date();
  if (window === "month") {
    const ymd = getYmdInIst(now);
    const [yStr, mStr] = ymd.split("-");
    const from = new Date(`${yStr}-${mStr}-01T00:00:00${IST_OFFSET}`);
    const to = new Date(from);
    to.setMonth(to.getMonth() + 1);
    to.setMilliseconds(to.getMilliseconds() - 1);
    return { from, to };
  }
  const ymdToday = getYmdInIst(now);
  const wdShort = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(now);
  const offset = IST_WEEKDAY_TO_OFFSET[wdShort];
  if (offset === undefined) {
    const from = new Date(`${ymdToday}T00:00:00${IST_OFFSET}`);
    const to = new Date(`${ymdToday}T23:59:59.999${IST_OFFSET}`);
    return { from, to };
  }
  const mondayYmd = addCalendarDaysToYmd(ymdToday, -offset);
  const sundayYmd = addCalendarDaysToYmd(mondayYmd, 6);
  const from = new Date(`${mondayYmd}T00:00:00${IST_OFFSET}`);
  const to = new Date(`${sundayYmd}T23:59:59.999${IST_OFFSET}`);
  return { from, to };
};

const serializeTeacherBooking = (b) => {
  const roster = b.rosterStudentId && typeof b.rosterStudentId === "object" ? b.rosterStudentId : null;
  const student = b.studentId && typeof b.studentId === "object" ? b.studentId : null;
  const learnerName = roster?.name || student?.name || "Learner";
  return {
    id: String(b._id),
    status: b.status,
    rescheduledAt: b.rescheduledAt ?? null,
    startTime: b.startTime,
    endTime: b.endTime,
    date: b.date,
    learnerName,
    learnerGrade: roster?.grade ?? student?.grade ?? null,
    learnerBatchId: roster?.batchId ?? null,
    learnerBatchName: roster?.batchName ?? null,
    learnerMobile: roster?.mobile ?? null,
    contactEmail: b.contactEmail || student?.email || null,
    bookingKind: b.rosterStudentId ? "roster" : "student",
    cancellationReason: b.cancellationReason || null,
  };
};

const listTeacherPendingCompletion = async (teacherId) => {
  assertPrisma();
  const teacherPgId = await resolveUserIdForPrisma(teacherId, "teacher");
  if (!teacherPgId) return [];
  const rows = await prisma.booking.findMany({
    where: {
      teacherId: teacherPgId,
      status: "scheduled",
      endTime: { lt: new Date() },
    },
    include: {
      rosterStudent: { select: { id: true, name: true, grade: true, batchId: true, batchName: true, mobile: true } },
      student: { select: { id: true, name: true, email: true, grade: true } },
    },
    orderBy: { endTime: "asc" },
  });
  return rows.map((row) => serializeTeacherBooking(mapPrismaBookingToMongoLike(row)));
};

const TEACHER_SESSION_OUTCOMES = new Set([
  "completed",
  "student_did_not_join",
  "teacher_did_not_join",
]);

const completeBookingByTeacher = async (teacherId, bookingId, outcome = "completed") => {
  assertPrisma();
  const teacherPgId = await resolveUserIdForPrisma(teacherId, "teacher");
  if (!teacherPgId) throw new ApiError(404, "Teacher not found");
  const bookingLookup = idOrLegacyWhere(String(bookingId));
  if (!bookingLookup) throw new ApiError(404, "Booking not found");
  const row = await prisma.booking.findFirst({
    where: { AND: [bookingLookup, { teacherId: teacherPgId }] },
    include: { student: { select: { email: true } } },
  });
  if (!row) {
    throw new ApiError(404, "Booking not found");
  }
  if (row.status !== "scheduled") {
    throw new ApiError(400, "This session is not awaiting completion");
  }
  if (row.endTime >= new Date()) {
    throw new ApiError(400, "You can record the outcome only after the scheduled end time");
  }
  if (!TEACHER_SESSION_OUTCOMES.has(outcome)) {
    throw new ApiError(400, "Invalid session outcome");
  }
  const updated = await prisma.booking.update({
    where: { id: row.id },
    data: { status: outcome },
    include: {
      rosterStudent: { select: { id: true, name: true, grade: true, batchId: true, batchName: true, mobile: true } },
      student: { select: { id: true, name: true, email: true, grade: true } },
    },
  });
  return mapPrismaBookingToMongoLike(updated);
};

const listTeacherBookingHistory = async (teacherId, window = "week") => {
  assertPrisma();
  const w = window === "month" ? "month" : "week";
  const { from, to } = getTeacherHistoryTimeRange(w);
  const teacherPgId = await resolveUserIdForPrisma(teacherId, "teacher");
  const rows = teacherPgId
    ? await prisma.booking.findMany({
        where: {
          teacherId: teacherPgId,
          startTime: { gte: from, lte: to },
        },
        include: {
          rosterStudent: { select: { id: true, name: true, grade: true, batchId: true, batchName: true, mobile: true } },
          student: { select: { id: true, name: true, email: true, grade: true } },
        },
        orderBy: { startTime: "desc" },
      })
    : [];
  return {
    window: w,
    from: from.toISOString(),
    to: to.toISOString(),
    bookings: rows.map((row) => serializeTeacherBooking(mapPrismaBookingToMongoLike(row))),
  };
};

const listRescheduleOptionsForTeacher = async (teacherId, bookingId) => {
  assertPrisma();
  const teacherPgId = await resolveUserIdForPrisma(teacherId, "teacher");
  if (!teacherPgId) throw new ApiError(404, "Teacher not found");
  const bookingLookup = idOrLegacyWhere(String(bookingId));
  if (!bookingLookup) throw new ApiError(404, "Booking not found");
  const booking = await prisma.booking.findFirst({
    where: { AND: [bookingLookup, { teacherId: teacherPgId }] },
  });
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }
  if (booking.status !== "scheduled") {
    throw new ApiError(400, "Only scheduled bookings can be rescheduled");
  }
  if (booking.startTime <= new Date()) {
    throw new ApiError(400, "Rescheduling is only allowed before the session starts");
  }

  const bookingWindowDays = await adminService.getBookingWindowDays();
  const now = new Date();
  const todayIst = getYmdInIst(now);
  const lastYmd = addCalendarDaysToYmd(todayIst, Math.max(Number(bookingWindowDays) - 1, 0));
  const minDate = toUtcDateStart(new Date(`${todayIst}T00:00:00.000Z`));
  const maxDate = toUtcDateStart(new Date(`${lastYmd}T00:00:00.000Z`));
  const bookingDayStart = toUtcDateStart(booking.date);
  const rangeStart =
    bookingDayStart.getTime() > minDate.getTime() ? bookingDayStart : minDate;

  if (rangeStart.getTime() > maxDate.getTime()) {
    return [];
  }

  const rows = await prisma.availability.findMany({
    where: {
      teacherId: teacherPgId,
      dateYmd: { gte: rangeStart, lte: maxDate },
    },
    orderBy: { dateYmd: "asc" },
    include: { slots: { orderBy: { startTime: "asc" } } },
  });

  const bookingSessionYmd = getPickerYmdFromDateInput(booking.date);
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  const allSlotIds = rows.flatMap((row) => (row.slots || []).map((s) => s.id));
  const slotBookingRows = allSlotIds.length
    ? await prisma.booking.findMany({
        where: {
          teacherId: teacherPgId,
          slotId: { in: allSlotIds },
          status: { in: ["scheduled", "cancelled"] },
        },
        select: { slotId: true, status: true, updatedAt: true },
      })
    : [];
  const dominantBySlotId = new Map();
  for (const b of slotBookingRows) {
    const sid = String(b.slotId);
    dominantBySlotId.set(sid, pickDominantSlotBooking(dominantBySlotId.get(sid) ?? null, b));
  }

  const out = [];
  for (const row of rows) {
    if (getPickerYmdFromDateInput(row.dateYmd) < bookingSessionYmd) {
      /* cannot move session to an earlier calendar day than the current booking */
    } else if (!isInBookingWindow(row.dateYmd, bookingWindowDays)) {
      /* skip dates outside admin booking window */
    } else {
      const rowYmd = getPickerYmdFromDateInput(row.dateYmd);
      const sameDayAsBooking = rowYmd === bookingSessionYmd;
      const slots = [];
      for (const slot of row.slots || []) {
        const isCurrent =
          String(row.id) === String(booking.availabilityId) &&
          String(slot.id) === String(booking.slotId);
        const slotStart = new Date(slot.startTime);
        if (slotStart <= oneHourFromNow) {
          /* must start more than 1 hour from now */
        } else if (sameDayAsBooking && slotStart <= new Date(booking.endTime)) {
          /* same calendar day: new slot must start after the current session ends */
        } else if (
          !isCurrent &&
          !slot.isBooked &&
          dominantBySlotId.get(String(slot.id))?.status !== "cancelled"
        ) {
          slots.push({
            slotId: String(slot.id),
            startTime: slot.startTime,
            endTime: slot.endTime,
          });
        }
      }
      if (slots.length) {
        out.push({
          availabilityId: String(row.id),
          date: row.dateYmd,
          slots,
        });
      }
    }
  }
  return out;
};

const cancelBookingByTeacher = async (teacherId, bookingId, { reason } = {}) => {
  assertPrisma();
  const teacherPgId = await resolveUserIdForPrisma(teacherId, "teacher");
  if (!teacherPgId) throw new ApiError(404, "Teacher not found");
  const bookingLookup = idOrLegacyWhere(String(bookingId));
  if (!bookingLookup) throw new ApiError(404, "Booking not found");
  const row = await prisma.booking.findFirst({
    where: { AND: [bookingLookup, { teacherId: teacherPgId }] },
    include: {
      student: { select: { email: true } },
      rosterStudent: { select: { id: true, name: true, grade: true, batchId: true, batchName: true, mobile: true } },
    },
  });
  if (!row) {
    throw new ApiError(404, "Booking not found");
  }
  if (row.status !== "scheduled") {
    throw new ApiError(400, "Only scheduled bookings can be cancelled");
  }
  if (row.startTime <= new Date()) {
    throw new ApiError(400, "Cancellations are only allowed before the session starts");
  }
  const trimmed =
    reason != null && String(reason).trim() ? String(reason).trim().slice(0, 500) : null;

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: row.id },
      data: { status: "cancelled", cancellationReason: trimmed },
    });
    if (row.slotId) {
      await tx.availabilitySlot.update({
        where: { id: row.slotId },
        data: { isBooked: false, bookingId: null },
      });
    }
  });

  try {
    await deleteGoogleCalendarEvent(row.googleCalendarEventId);
  } catch (err) {
    logger.warn(`Calendar delete on cancel failed: ${err.message}`);
  }

  const updated = await prisma.booking.findUnique({
    where: { id: row.id },
    include: {
      rosterStudent: { select: { id: true, name: true, grade: true, batchId: true, batchName: true, mobile: true } },
      student: { select: { id: true, name: true, email: true, grade: true } },
    },
  });
  return mapPrismaBookingToMongoLike(updated);
};

const rescheduleBookingByTeacher = async (teacherId, bookingId, { availabilityId, slotId }) => {
  assertPrisma();
  const teacherPgId = await resolveUserIdForPrisma(teacherId, "teacher");
  if (!teacherPgId) throw new ApiError(404, "Teacher not found");
  const teacher = await prisma.user.findFirst({
    where: { id: teacherPgId, role: "teacher" },
  });
  if (!teacher) {
    throw new ApiError(404, "Teacher not found");
  }

  const bookingLookup = idOrLegacyWhere(String(bookingId));
  if (!bookingLookup) throw new ApiError(404, "Booking not found");
  const booking = await prisma.booking.findFirst({
    where: { AND: [bookingLookup, { teacherId: teacherPgId }] },
    include: { student: { select: { email: true } } },
  });
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }
  if (booking.status !== "scheduled") {
    throw new ApiError(400, "Only scheduled bookings can be rescheduled");
  }
  if (booking.startTime <= new Date()) {
    throw new ApiError(400, "Rescheduling is only allowed before the session starts");
  }

  const oldSlotId = booking.slotId;
  if (!booking.availabilityId || !oldSlotId) {
    throw new ApiError(400, "Booking is missing availability details");
  }

  const targetAvailLookup = idOrLegacyWhere(String(availabilityId));
  if (!targetAvailLookup) throw new ApiError(404, "Target availability not found");
  const targetAvail = await prisma.availability.findFirst({
    where: { AND: [targetAvailLookup, { teacherId: teacherPgId }] },
    include: { slots: true },
  });
  if (!targetAvail) {
    throw new ApiError(404, "Target availability not found");
  }
  const bookingWindowDays = await adminService.getBookingWindowDays();
  if (!isInBookingWindow(targetAvail.dateYmd, bookingWindowDays)) {
    throw new ApiError(400, "Target date is outside the booking window");
  }

  const bookingSessionYmd = getPickerYmdFromDateInput(booking.date);
  const targetSessionYmd = getPickerYmdFromDateInput(targetAvail.dateYmd);
  if (targetSessionYmd < bookingSessionYmd) {
    throw new ApiError(
      400,
      "You can only reschedule to the same day or a later date, not to an earlier day",
    );
  }

  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const slotLookup = idOrLegacyWhere(String(slotId));
  if (!slotLookup) throw new ApiError(404, "Target slot not found");
  const targetSlotRow = await prisma.availabilitySlot.findFirst({
    where: { AND: [slotLookup, { availabilityId: targetAvail.id }] },
  });
  if (!targetSlotRow) {
    throw new ApiError(404, "Target slot not found");
  }
  if (targetSlotRow.isBooked) {
    throw new ApiError(409, "That slot is already booked");
  }
  const targetStart = new Date(targetSlotRow.startTime);
  if (targetStart <= oneHourFromNow) {
    throw new ApiError(
      400,
      "The new slot must start more than one hour from the current time",
    );
  }
  if (targetSessionYmd === bookingSessionYmd && targetStart <= new Date(booking.endTime)) {
    throw new ApiError(
      400,
      "On the same day, choose a slot that starts after your current session ends",
    );
  }

  if (
    String(booking.availabilityId) === String(targetAvail.id) &&
    String(oldSlotId) === String(targetSlotRow.id)
  ) {
    throw new ApiError(400, "Select a different slot than the current one");
  }

  const newDay = toUtcDateStart(targetAvail.dateYmd);
  await assertSlotNotClosedByTeacherCancellation(
    teacherPgId,
    targetSlotRow.id,
    newDay,
    "You cannot reschedule into a slot that was cancelled.",
  );

  if (booking.rosterStudentId) {
    const conflict = await prisma.booking.findFirst({
      where: {
        rosterStudentId: booking.rosterStudentId,
        date: newDay,
        status: "scheduled",
        NOT: { id: booking.id },
      },
    });
    if (conflict) {
      throw new ApiError(400, "This learner already has another booking on the target day");
    }
  }

  await prisma.availabilitySlot.update({
    where: { id: oldSlotId },
    data: { isBooked: false, bookingId: null },
  });

  const reserved = await prisma.availabilitySlot.updateMany({
    where: {
      id: targetSlotRow.id,
      isBooked: false,
      startTime: { gt: oneHourFromNow },
    },
    data: { isBooked: true },
  });

  if (reserved.count !== 1) {
    await prisma.availabilitySlot.update({
      where: { id: oldSlotId },
      data: { isBooked: true, bookingId: booking.id },
    });
    throw new ApiError(409, "Selected slot was just taken");
  }

  const studentEmailForMeet = String(
    booking.contactEmail || booking.student?.email || teacher.email,
  )
    .trim()
    .toLowerCase();

  try {
    try {
      await deleteGoogleCalendarEvent(booking.googleCalendarEventId);
    } catch (err) {
      logger.warn(`Calendar delete on reschedule failed: ${err.message}`);
    }

    const { meetingLink, eventId } = await createGoogleMeetEvent({
      teacherEmail: teacher.email,
      studentEmail: studentEmailForMeet,
      startTime: targetSlotRow.startTime,
      endTime: targetSlotRow.endTime,
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        availabilityId: targetAvail.id,
        slotId: targetSlotRow.id,
        date: newDay,
        startTime: targetSlotRow.startTime,
        endTime: targetSlotRow.endTime,
        meetingLink,
        googleCalendarEventId: eventId,
        rescheduledAt: new Date(),
      },
    });

    await prisma.availabilitySlot.update({
      where: { id: targetSlotRow.id },
      data: { bookingId: booking.id },
    });

    const full = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        rosterStudent: { select: { id: true, name: true, grade: true, batchId: true, batchName: true, mobile: true } },
        student: { select: { id: true, name: true, email: true, grade: true } },
      },
    });
    return mapPrismaBookingToMongoLike(full);
  } catch (err) {
    await prisma.availabilitySlot.update({
      where: { id: targetSlotRow.id },
      data: { isBooked: false, bookingId: null },
    });
    await prisma.availabilitySlot.update({
      where: { id: oldSlotId },
      data: { isBooked: true, bookingId: booking.id },
    });
    throw err;
  }
};

const normalizeOptionalUrl = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return String(value).trim();
};

const updateBookingMedia = async (bookingId, { recordingUrl, transcriptUrl }) => {
  assertPrisma();
  const whereLookup = idOrLegacyWhere(bookingId);
  const booking = whereLookup
    ? await prisma.booking.findFirst({ where: whereLookup })
    : null;
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }
  const data = {};
  const r = normalizeOptionalUrl(recordingUrl);
  const t = normalizeOptionalUrl(transcriptUrl);
  if (r !== undefined) data.recordingUrl = r;
  if (t !== undefined) data.transcriptUrl = t;
  if (!Object.keys(data).length) {
    return { ...booking, _id: booking.id };
  }
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data,
  });
  return { ...updated, _id: updated.id };
};

module.exports = {
  bookSlot,
  listStudentBookings,
  bookSlotAsRoster,
  listRosterBookings,
  listAllForAdmin,
  getBookingDashboardStats,
  getBookingWeekdayStats,
  updateBookingMedia,
  listTeacherPendingCompletion,
  completeBookingByTeacher,
  listTeacherBookingHistory,
  listRescheduleOptionsForTeacher,
  cancelBookingByTeacher,
  rescheduleBookingByTeacher,
};
