const ApiError = require("../../utils/ApiError");
const env = require("../../config/env");
const logger = require("../../config/logger");
const { sendTeacherCredentials } = require("../notifications/email.service");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const getPrisma = require("../../config/postgres");
const { idOrLegacyWhere } = require("../../utils/id");

const SETTINGS_KEY = "BOOKING_WINDOW";

const isSmtpConfigured = () =>
  Boolean(
    String(env.smtp.host || "").trim() &&
      String(env.smtp.user || "").trim() &&
      String(env.smtp.pass || "").trim(),
  );

const generateTempPassword = (length = 12) => {
  const raw = crypto
    .randomBytes(length * 2)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "");
  return raw.slice(0, length);
};

const prisma = process.env.DATABASE_URL ? getPrisma() : null;

const toTeacherShape = (teacher) => {
  if (!teacher) return null;
  if (teacher._id) return teacher;
  return {
    _id: teacher.legacyMongoId || teacher.id,
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    role: teacher.role,
    grade: teacher.grade,
    display: teacher.display,
    batchId: teacher.batchId,
    batchName: teacher.batchName,
    createdAt: teacher.createdAt,
    updatedAt: teacher.updatedAt,
  };
};

const createTeacher = async (payload) => {
  if (!prisma) {
    throw new ApiError(500, "Postgres is not configured");
  }
  const email = payload.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "Email is already in use");
  }

  const plainPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  const teacher = await prisma.user.create({
    data: {
      name: payload.name,
      email,
      passwordHash,
      grade: payload.grade,
      display: payload.display,
      batchId: payload.batchId,
      batchName: payload.batchName,
      role: "teacher",
    },
  });

  let emailSent = false;
  try {
    emailSent = await sendTeacherCredentials({
      teacherName: teacher.name,
      teacherEmail: teacher.email,
      plainPassword,
      grade: teacher.grade,
      batchId: teacher.batchId,
      batchName: teacher.batchName,
      variant: "welcome",
    });
  } catch (error) {
    logger.warn(`Teacher credential email failed: ${error.message}`);
  }

  return {
    teacher,
    plainPassword,
    emailSent,
    smtpConfigured: isSmtpConfigured(),
  };
};

const createTeachersBulk = async (teachers) => {
  const created = [];
  const skipped = [];
  const failed = [];

  for (const row of teachers) {
    try {
      const result = await createTeacher(row);
      created.push({
        teacher: result.teacher,
        emailSent: result.emailSent,
        smtpConfigured: result.smtpConfigured,
      });
    } catch (error) {
      const email = String(row?.email || "").trim().toLowerCase();
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
    skipped,
    failed,
  };
};

const listTeachers = async () => {
  if (!prisma) throw new ApiError(500, "Postgres is not configured");
  const rows = await prisma.user.findMany({
    where: { role: "teacher" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      legacyMongoId: true,
      name: true,
      email: true,
      role: true,
      grade: true,
      display: true,
      batchId: true,
      batchName: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return rows.map(toTeacherShape);
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
  const updated = await prisma.user.findFirst({
    where: {
      AND: [idWhere, { role: "teacher" }],
    },
  });
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

  const updateResult = await prisma.user.updateMany({
    where: {
      AND: [idWhere, { role: "teacher" }],
    },
    data: {
      email,
      grade: payload.grade,
      display: payload.display,
      batchId: payload.batchId,
      batchName: payload.batchName,
    },
  });
  if (!updateResult.count) {
    throw new ApiError(404, "Teacher not found");
  }
  const teacher = await prisma.user.findFirst({
    where: {
      AND: [idWhere, { role: "teacher" }],
    },
  });
  return toTeacherShape(teacher);
};

const regenerateTeacherPassword = async (teacherId, sendEmail = true) => {
  if (!prisma) throw new ApiError(500, "Postgres is not configured");
  const idWhere = idOrLegacyWhere(teacherId);
  if (!idWhere) throw new ApiError(400, "Invalid teacher id");
  const teacher = await prisma.user.findFirst({
    where: {
      AND: [idWhere, { role: "teacher" }],
    },
  });
  if (!teacher) {
    throw new ApiError(404, "Teacher not found");
  }

  const plainPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  await prisma.user.update({
    where: { id: teacher.id },
    data: { passwordHash },
  });

  let emailSent = false;
  if (sendEmail) {
    try {
      emailSent = await sendTeacherCredentials({
        teacherName: teacher.name,
        teacherEmail: teacher.email,
        plainPassword,
        grade: teacher.grade,
        batchId: teacher.batchId,
        batchName: teacher.batchName,
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
