/**
 * Creates or updates the first admin user (role: admin).
 * Run from backend/: npm run seed:admin
 */
const path = require("path");
require("dotenv").config({ path: require("../src/config/dotenvPath") });

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEFAULT_EMAIL = "admin@infinitylearn.local";
const DEFAULT_PASSWORD = "Admin123!";
const DEFAULT_NAME = "Administrator";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const email = String(process.env.SEED_ADMIN_EMAIL || DEFAULT_EMAIL).toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || DEFAULT_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || DEFAULT_NAME;

  if (password.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role !== "admin") {
      console.error(
        `A user already exists for ${email} with role "${existing.role}".`,
      );
      console.error("Remove or rename that user, or pick another SEED_ADMIN_EMAIL.");
      process.exit(1);
    }
    if (process.env.SEED_FORCE === "true") {
      await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, name },
      });
      console.log(`Updated admin password and name for: ${email}`);
    } else {
      console.log(`Admin already exists: ${email}`);
      console.log("Set SEED_FORCE=true in .env to reset password and name.");
    }
    return;
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "admin",
      grade: null,
      display: null,
      batchId: null,
      batchName: null,
    },
  });

  console.log(`Created admin user: ${email}`);
  console.log("");
  console.log("Sign in with:");
  console.log(`  Email:    ${email}`);
  console.log(
    `  Password: ${password === DEFAULT_PASSWORD ? "(default — change after login)" : "(value from SEED_ADMIN_PASSWORD)"}`,
  );
  if (password === DEFAULT_PASSWORD) {
    console.log("");
    console.log("Default password is only used when SEED_ADMIN_PASSWORD is unset.");
    console.log("Set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env for production.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
