const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const ApiError = require("../../utils/ApiError");
const env = require("../../config/env");
const getPrisma = require("../../config/postgres");

const prisma = env.databaseUrl ? getPrisma() : null;
const { teacherBatchesInclude, shapeTeacherBatchesForApi } = require("../../utils/teacherBatches");

const issueToken = (userId, role) =>
  jwt.sign({ role }, env.jwtSecret, {
    subject: String(userId),
    expiresIn: env.jwtExpiresIn,
  });

const formatAuthUser = (user) => {
  const batchFields =
    user.role === "teacher" ? shapeTeacherBatchesForApi(user) : { batches: [], batchId: user.batchId, batchName: user.batchName };
  return {
    id: user._id || user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    grade: user.grade,
    display: user.display,
    ...batchFields,
  };
};

const userSelectWithTeacherBatches = {
  id: true,
  legacyMongoId: true,
  name: true,
  email: true,
  passwordHash: true,
  role: true,
  grade: true,
  display: true,
  batchId: true,
  batchName: true,
  ...teacherBatchesInclude,
};

const login = async ({ email, password }) => {
  if (!prisma) {
    throw new ApiError(500, "Postgres is not configured");
  }
  const emailLower = String(email || "").toLowerCase();
  let user = null;
  let tokenSubject = null;

  const pgUser = await prisma.user.findUnique({
    where: { email: emailLower },
    select: userSelectWithTeacherBatches,
  });
  if (pgUser && (await bcrypt.compare(password, pgUser.passwordHash))) {
    user = {
      _id: pgUser.legacyMongoId || pgUser.id,
      id: pgUser.id,
      name: pgUser.name,
      email: pgUser.email,
      role: pgUser.role,
      grade: pgUser.grade,
      display: pgUser.display,
      batchId: pgUser.batchId,
      batchName: pgUser.batchName,
      teacherBatches: pgUser.teacherBatches,
    };
    tokenSubject = pgUser.id;
  }

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (user.role === "student") {
    throw new ApiError(
      403,
      "Student sign-in is disabled. Book sessions on the open booking page — no account required.",
    );
  }

  const token = issueToken(tokenSubject, user.role);
  return {
    user: formatAuthUser(user),
    token,
  };
};

module.exports = {
  login,
  formatAuthUser,
};
