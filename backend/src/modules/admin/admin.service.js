const ApiError = require("../../utils/ApiError");
const env = require("../../config/env");
const logger = require("../../config/logger");
const {
  sendTeacherCredentials,
  isTeacherCredentialEmailConfigured,
} = require("../notifications/email.service");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const getPrisma = require("../../config/postgres");
const { idOrLegacyWhere } = require("../../utils/id");

const SETTINGS_KEY = "BOOKING_WINDOW";

/** API field name kept for compatibility — means SES teacher-mail env is ready. */
const isSmtpConfigured = () => isTeacherCredentialEmailConfigured();

const generateTempPassword = (length = 12) => {
  const raw = crypto
    .randomBytes(length * 2)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "");
  return raw.slice(0, length);
};

const prisma = process.env.DATABASE_URL ? getPrisma() : null;
const {
  normalizeTeacherBatchesInput,
  replaceTeacherBatches,
  migrateLegacyTeacherBatches,
  backfillTeacherBatchRouting,
  teacherBatchesInclude,
  shapeTeacherBatchesForApi,
  formatBatchesForEmail,
  primaryRoutingFromList,
  listAssignmentsForTeacher,
  dedupeBatches,
  mergeAssignmentLists,
} = require("../../utils/teacherBatches");

const toTeacherShape = (teacher) => {
  if (!teacher) return null;
  const batchFields = shapeTeacherBatchesForApi(teacher);
  return {
    _id: teacher.legacyMongoId || teacher.id,
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    role: teacher.role,
    ...batchFields,
    createdAt: teacher.createdAt,
    updatedAt: teacher.updatedAt,
  };
};

const loadTeacherWithBatches = async (idWhere) => {
  const teacher = await prisma.user.findFirst({
    where: { AND: [idWhere, { role: "teacher" }] },
    include: teacherBatchesInclude,
  });
  return teacher;
};

const appendAssignmentsToTeacher = async (teacherId, payload) => {
  const incoming = normalizeTeacherBatchesInput(payload);
  if (!incoming.length) {
    throw new ApiError(400, "At least one assignment (grade, channel, batch) is required");
  }
  const current = await loadTeacherWithBatches({ id: teacherId });
  if (!current) {
    throw new ApiError(404, "Teacher not found");
  }
  const existingAssignments = listAssignmentsForTeacher(current);
  const merged = mergeAssignmentLists(existingAssignments, incoming);
  const addedCount = Math.max(0, merged.length - existingAssignments.length);
  await replaceTeacherBatches(prisma, teacherId, merged);
  const name = String(payload.name ?? "").trim();
  if (name) {
    await prisma.user.update({ where: { id: teacherId }, data: { name } });
  }
  return {
    teacher: await loadTeacherWithBatches({ id: teacherId }),
    addedCount,
  };
};

const createTeacher = async (payload) => {
  if (!prisma) {
    throw new ApiError(500, "Postgres is not configured");
  }
  const email = payload.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing?.role === "teacher") {
    const { teacher: teacherWithBatches, addedCount } = await appendAssignmentsToTeacher(existing.id, payload);
    return {
      teacher: toTeacherShape(teacherWithBatches),
      plainPassword: null,
      emailSent: false,
      smtpConfigured: isSmtpConfigured(),
      assignmentAdded: addedCount > 0,
      assignmentsAddedCount: addedCount,
    };
  }
  if (existing) {
    throw new ApiError(409, "Email is already in use by a non-teacher account");
  }

  const batches = normalizeTeacherBatchesInput(payload);
  if (!batches.length) {
    throw new ApiError(400, "At least one assignment (grade, channel, batch) is required");
  }
  const primary = primaryRoutingFromList(batches);

  const plainPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  const teacher = await prisma.user.create({
    data: {
      name: payload.name,
      email,
      passwordHash,
      role: "teacher",
      grade: primary.grade,
      display: primary.display,
      batchId: primary.batchId,
      batchName: primary.batchName,
    },
  });
  await replaceTeacherBatches(prisma, teacher.id, batches);
  const teacherWithBatches = await loadTeacherWithBatches({ id: teacher.id });
  const shaped = shapeTeacherBatchesForApi(teacherWithBatches);

  let emailSent = false;
  try {
    emailSent = await sendTeacherCredentials({
      teacherName: teacherWithBatches.name,
      teacherEmail: teacherWithBatches.email,
      plainPassword,
      grade: shaped.grade,
      batchId: shaped.batchId,
      batchName: shaped.batchName,
      variant: "welcome",
    });
  } catch (error) {
    logger.warn(`Teacher credential email failed: ${error.message}`);
  }

  return {
    teacher: toTeacherShape(teacherWithBatches),
    plainPassword,
    emailSent,
    smtpConfigured: isSmtpConfigured(),
    assignmentAdded: false,
  };
};

const createTeachersBulk = async (teachers) => {
  const created = [];
  const assignmentsAdded = [];
  const skipped = [];
  const failed = [];
  const rows = Array.isArray(teachers) ? teachers : [];

  for (const row of rows) {
    const email = String(row?.email || "").trim().toLowerCase();
    try {
      const batches = dedupeBatches(normalizeTeacherBatchesInput(row));
      if (!batches.length) {
        skipped.push({
          email,
          reason: "At least one complete assignment is required",
        });
        continue;
      }
      const result = await createTeacher({
        ...row,
        batches,
        email,
      });
      const item = {
        teacher: result.teacher,
        emailSent: result.emailSent,
        smtpConfigured: result.smtpConfigured,
        assignmentsAddedCount: result.assignmentsAddedCount ?? 0,
      };
      if (result.assignmentAdded) {
        assignmentsAdded.push(item);
      } else {
        if (item.assignmentsAddedCount === 0 && result.plainPassword === null) {
          skipped.push({
            email,
            reason: "Teacher is already linked with the same grade/channel/batch assignment",
          });
        } else {
          created.push(item);
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 409) {
        skipped.push({
          email,
          reason: error.message,
        });
      } else {
        failed.push({
          email,
          reason: error?.message || "Unexpected error",
        });
      }
    }
  }

  return {
    created,
    assignmentsAdded,
    skipped,
    failed,
  };
};

const listTeachers = async () => {
  if (!prisma) throw new ApiError(500, "Postgres is not configured");
  const rows = await prisma.user.findMany({
    where: { role: "teacher" },
    orderBy: { createdAt: "desc" },
    include: teacherBatchesInclude,
  });
  await migrateLegacyTeacherBatches(prisma, rows);
  await backfillTeacherBatchRouting(prisma);
  const refreshed = await prisma.user.findMany({
    where: { role: "teacher" },
    orderBy: { createdAt: "desc" },
    include: teacherBatchesInclude,
  });
  return refreshed.map(toTeacherShape);
};

const assignGradeToTeacher = async (teacherId, grade) => {
  if (!prisma) throw new ApiError(500, "Postgres is not configured");
  const idWhere = idOrLegacyWhere(teacherId);
  if (!idWhere) throw new ApiError(400, "Invalid teacher id");
  const teacher = await prisma.user.updateMany({
    where: {
      AND: [idWhere, { role: "teacher" }],
    },
    data: { grade },
  });
  if (!teacher.count) {
    throw new ApiError(404, "Teacher not found");
  }
  const updated = await loadTeacherWithBatches(idWhere);
  return toTeacherShape(updated);
};

const updateTeacherDetails = async (teacherId, payload) => {
  if (!prisma) throw new ApiError(500, "Postgres is not configured");
  const idWhere = idOrLegacyWhere(teacherId);
  if (!idWhere) throw new ApiError(400, "Invalid teacher id");
  const email = payload.email.toLowerCase();
  const taken = await prisma.user.findFirst({
    where: {
      email,
      role: "teacher",
      NOT: idWhere,
    },
  });
  if (taken) {
    throw new ApiError(409, "Email is already in use");
  }

  const batches = normalizeTeacherBatchesInput(payload);
  if (!batches.length) {
    throw new ApiError(400, "At least one batch is required");
  }
  const primary = primaryRoutingFromList(batches);

  const existing = await prisma.user.findFirst({
    where: { AND: [idWhere, { role: "teacher" }] },
    select: { id: true },
  });
  if (!existing) {
    throw new ApiError(404, "Teacher not found");
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: {
      email,
      grade: primary.grade,
      display: primary.display,
      batchId: primary.batchId,
      batchName: primary.batchName,
    },
  });
  await replaceTeacherBatches(prisma, existing.id, batches);
  const teacher = await loadTeacherWithBatches({ id: existing.id });
  return toTeacherShape(teacher);
};

const regenerateTeacherPassword = async (teacherId, sendEmail = true) => {
  if (!prisma) throw new ApiError(500, "Postgres is not configured");
  const idWhere = idOrLegacyWhere(teacherId);
  if (!idWhere) throw new ApiError(400, "Invalid teacher id");
  const teacher = await loadTeacherWithBatches(idWhere);
  if (!teacher) {
    throw new ApiError(404, "Teacher not found");
  }

  const plainPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  await prisma.user.update({
    where: { id: teacher.id },
    data: { passwordHash },
  });

  const emailBatches = formatBatchesForEmail(shapeTeacherBatchesForApi(teacher).batches);

  let emailSent = false;
  if (sendEmail) {
    try {
      emailSent = await sendTeacherCredentials({
        teacherName: teacher.name,
        teacherEmail: teacher.email,
        plainPassword,
        grade: teacher.grade,
        batchId: emailBatches.batchId,
        batchName: emailBatches.batchName,
        variant: "update",
      });
    } catch (error) {
      logger.warn(`Teacher password regenerate email failed: ${error.message}`);
    }
  }

  return {
    teacher: toTeacherShape(teacher),
    plainPassword,
    emailSent,
    smtpConfigured: isSmtpConfigured(),
  };
};

const configureBookingWindow = async (bookingWindowDays) => {
  if (!prisma) throw new ApiError(500, "Postgres is not configured");
  return prisma.appSetting.upsert({
    where: { key: SETTINGS_KEY },
    update: { bookingWindowDays },
    create: { key: SETTINGS_KEY, bookingWindowDays },
  });
};

const getBookingWindowDays = async () => {
  if (!prisma) throw new ApiError(500, "Postgres is not configured");
  const pg = await prisma.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
  return pg?.bookingWindowDays ?? env.bookingWindowDays;
};

module.exports = {
  createTeacher,
  createTeachersBulk,
  listTeachers,
  assignGradeToTeacher,
  updateTeacherDetails,
  regenerateTeacherPassword,
  configureBookingWindow,
  getBookingWindowDays,
};
