const getPrisma = require("../../../config/postgres");

const prisma = process.env.DATABASE_URL ? getPrisma() : null;

const isEnabled = () => Boolean(prisma);

/** Legacy no-ops — runtime writes go directly to Postgres via Prisma. */
const syncAvailabilityById = async () => {};

const syncBookingById = async () => {};

module.exports = {
  isEnabled,
  syncAvailabilityById,
  syncBookingById,
};
