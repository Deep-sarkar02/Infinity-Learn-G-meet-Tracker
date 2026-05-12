/**
 * Run LSQ artifact fetch for one booking.
 * Does not require LSQ_SYNC_ENABLED=true.
 *
 *   node scripts/syncLsqArtifacts.js <booking-uuid>
 *   node scripts/syncLsqArtifacts.js "https://meet.google.com/xxx-yyyy-zzz"
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const getPrisma = require("../src/config/postgres");
const { syncBookingById } = require("../src/modules/integrations/lsq/lsqArtifacts.sync");

async function resolveBookingId(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (s.includes("meet.google.com")) {
    const prisma = getPrisma();
    const row = await prisma.booking.findFirst({
      where: { meetingLink: s },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (!row) {
      throw new Error(`No booking found with meeting_link: ${s}`);
    }
    console.error(`Resolved booking id: ${row.id}`);
    return row.id;
  }
  return s;
}

async function main() {
  const raw = process.argv[2] || process.env.BOOKING_ID;
  if (!raw) {
    console.error(
      "Usage: node scripts/syncLsqArtifacts.js <booking-uuid | meet.google.com URL>",
    );
    process.exit(1);
  }
  const bookingId = await resolveBookingId(raw);
  const row = await syncBookingById(bookingId);
  console.log(JSON.stringify(row, null, 2));
}

main()
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  })
  .finally(async () => {
    if (process.env.DATABASE_URL) {
      await getPrisma().$disconnect();
    }
  });
