const ApiError = require("../../utils/ApiError");
const { normalizeMobile } = require("../../utils/mobile");
const getPrisma = require("../../config/postgres");
const { idOrLegacyWhere } = require("../../utils/id");

const toNameLower = (name) => name.trim().toLowerCase();
const prisma = process.env.DATABASE_URL ? getPrisma() : null;

const rosterIdentityWhere = (doc) => ({
  userId: doc.userId,
  mobile: doc.mobile,
  grade: doc.grade,
  display: doc.display,
  batchId: doc.batchId,
  batchName: doc.batchName,
});

const skipPayload = (doc) => ({
  userId: doc.userId,
  mobile: doc.mobile,
  name: doc.name,
  grade: doc.grade,
  display: doc.display,
  batchId: doc.batchId,
  batchName: doc.batchName,
});

/** Duplicate if same mobile+name, or same userId+phone+grade+display+batchId+batchName. */
const findDuplicateRosterStudent = async (doc) => {
  const byMobileName = await prisma.rosterStudent.findUnique({
    where: {
      mobile_nameLower: {
        mobile: doc.mobile,
        nameLower: doc.nameLower,
      },
    },
  });
  if (byMobileName) return byMobileName;
  return prisma.rosterStudent.findFirst({
    where: rosterIdentityWhere(doc),
  });
};

const toRosterShape = (row) => ({
  _id: row.legacyMongoId || row.id,
  id: row.id,
  legacyMongoId: row.legacyMongoId || null,
  userId: row.userId,
  name: row.name,
  nameLower: row.nameLower,
  mobile: row.mobile,
  grade: row.grade,
  display: row.display,
  batchId: row.batchId,
  batchName: row.batchName,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const createMany = async (students) => {
  if (!prisma) {
    throw new ApiError(500, "Postgres is not configured");
  }
  const created = [];
  const skipped = [];
  for (const row of students) {
    const mobile = normalizeMobile(row.mobile);
    if (!mobile || !/^[1-9]\d{9}$/.test(mobile)) {
      throw new ApiError(400, "Invalid mobile number in roster");
    }
    const doc = {
      userId: String(row.userId).trim(),
      name: row.name.trim(),
      nameLower: toNameLower(row.name),
      mobile,
      grade: String(row.grade).trim(),
      display: String(row.display).trim(),
      batchId: String(row.batchId).trim(),
      batchName: String(row.batchName).trim(),
    };
    try {
      const existing = await findDuplicateRosterStudent(doc);
      if (existing) {
        skipped.push(skipPayload(doc));
      } else {
        const pg = await prisma.rosterStudent.create({
          data: {
            userId: doc.userId,
            name: doc.name,
            nameLower: doc.nameLower,
            mobile: doc.mobile,
            grade: doc.grade,
            display: doc.display,
            batchId: doc.batchId,
            batchName: doc.batchName,
          },
        });
        created.push(toRosterShape(pg));
      }
    } catch (error) {
      if (error?.code === "P2002") {
        skipped.push(skipPayload(doc));
      } else {
        throw error;
      }
    }
  }
  return { created, skipped };
};

const listAll = async () => {
  if (!prisma) return RosterStudent.find().sort({ name: 1 });
  const rows = await prisma.rosterStudent.findMany({
    orderBy: [{ name: "asc" }, { batchName: "asc" }, { grade: "asc" }],
  });
  return rows.map(toRosterShape);
};

const listForAdmin = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);

  const filters = {};
  if (query.grade) {
    filters.grade = String(query.grade).trim();
  }
  if (query.display) {
    filters.display = String(query.display).trim();
  }
  const searchTrim =
    query.search !== undefined && query.search !== null && String(query.search).trim() !== ""
      ? String(query.search).trim()
      : "";

  const skip = (safePage - 1) * safeLimit;
  const where = {};
  if (filters.grade) where.grade = filters.grade;
  if (filters.display) where.display = filters.display;
  if (searchTrim) {
    where.OR = [
      { name: { contains: searchTrim, mode: "insensitive" } },
      { userId: { contains: searchTrim, mode: "insensitive" } },
      { mobile: { contains: searchTrim, mode: "insensitive" } },
      { batchId: { contains: searchTrim, mode: "insensitive" } },
      { batchName: { contains: searchTrim, mode: "insensitive" } },
    ];
  }
  if (!prisma) {
    throw new ApiError(500, "Postgres is not configured");
  }
  const [total, items] = await Promise.all([
    prisma.rosterStudent.count({ where }),
    prisma.rosterStudent.findMany({
      where,
      orderBy: [{ name: "asc" }, { batchName: "asc" }, { grade: "asc" }],
      skip,
      take: safeLimit,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  return {
    items: items.map(toRosterShape),
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
      hasPrev: safePage > 1,
      hasNext: safePage < totalPages,
    },
  };
};

const findByMobileAndName = async (mobile, name) => {
  const normalizedMobile = normalizeMobile(mobile);
  const nameLower = toNameLower(name);
  if (!prisma) {
    throw new ApiError(500, "Postgres is not configured");
  }
  const student = await prisma.rosterStudent.findFirst({
    where: {
    mobile: normalizedMobile,
    nameLower,
    },
  });
  if (!student) {
    throw new ApiError(404, "No student found for this mobile and name");
  }
  return toRosterShape(student);
};

const findByMobile = async (mobile) => {
  const normalizedMobile = normalizeMobile(mobile);
  if (!prisma) {
    const students = await RosterStudent.find({
      mobile: normalizedMobile,
    }).sort({ name: 1, batchName: 1, grade: 1 });
    if (!students.length) {
      throw new ApiError(404, "No student found for this mobile number");
    }
    return students;
  }
  const students = await prisma.rosterStudent.findMany({
    where: { mobile: normalizedMobile },
    orderBy: [{ name: "asc" }, { batchName: "asc" }, { grade: "asc" }],
  });

  if (!students.length) {
    throw new ApiError(404, "No student found for this mobile number");
  }
  return students.map(toRosterShape);
};

const findByUserId = async (userId) => {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    throw new ApiError(400, "User ID is required");
  }
  if (!prisma) {
    throw new ApiError(500, "Postgres is not configured");
  }
  const students = await prisma.rosterStudent.findMany({
    where: { userId: normalizedUserId },
    orderBy: [{ name: "asc" }, { batchName: "asc" }, { grade: "asc" }],
  });
  if (!students.length) {
    throw new ApiError(404, "No student found for this ID");
  }
  return students.map(toRosterShape);
};

const findById = async (id) => {
  if (!prisma) {
    throw new ApiError(500, "Postgres is not configured");
  }
  const idText = String(id || "").trim();
  const lookup = idOrLegacyWhere(idText);
  if (!lookup) {
    throw new ApiError(404, "Student not found");
  }
  const student = await prisma.rosterStudent.findFirst({
    where: lookup,
  });
  if (!student) {
    throw new ApiError(404, "Student not found");
  }
  return toRosterShape(student);
};

const verifyMobile = async (studentId, mobile) => {
  const student = await findById(studentId);
  if (!student) {
    throw new ApiError(404, "Student not found");
  }
  if (student.mobile !== normalizeMobile(mobile)) {
    throw new ApiError(403, "Mobile number does not match this booking");
  }
  return student;
};

module.exports = {
  createMany,
  listAll,
  listForAdmin,
  findByMobileAndName,
  findByMobile,
  findByUserId,
  findById,
  verifyMobile,
  normalizeMobile,
  toNameLower,
};
