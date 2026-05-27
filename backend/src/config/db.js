const env = require("./env");
const logger = require("./logger");
const getPrisma = require("./postgres");
const { backfillTeacherBatchRouting } = require("../utils/teacherBatches");

const connectDB = async () => {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is required (Postgres runtime)");
  }

  const prisma = getPrisma();
  await prisma.$queryRaw`SELECT 1`;
  await backfillTeacherBatchRouting(prisma);
  logger.info("Postgres connected");
};

module.exports = connectDB;
