const path = require("path");
require("dotenv").config({ path: require("../src/config/dotenvPath") });

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DISPLAYS = [
  "CBSE",
  "HOTS",
  "HOPTS CHAMP",
  "EEP",
  "NEET",
  "FOUNDATION",
  "Jammu & Kashmir",
  "Tamil Nadu State Board",
  "Telangana",
  "ICSE",
];
const BATCHES = ["B1", "B2", "B3"];
const GRADES = ["1", "5"];

const FIRST = [
  "Aarav",
  "Vivaan",
  "Aditya",
  "Ishaan",
  "Arjun",
  "Aanya",
  "Diya",
  "Myra",
  "Anika",
  "Sara",
  "Kabir",
  "Riya",
];
const LAST = ["Sharma", "Verma", "Nair", "Reddy", "Iyer", "Patel", "Khan", "Ghosh", "Singh", "Das"];

const displayCode = (display) =>
  display
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 5)
    .toUpperCase();

const makeName = (index) => `${FIRST[index % FIRST.length]} ${LAST[Math.floor(index / FIRST.length) % LAST.length]}`;
const makeStudentMobile = (index) => `87${String(index).padStart(8, "0")}`;

const TEACHER_PLAIN_PASSWORD = "Teacher123!";

async function upsertRosterStudents() {
  let created = 0;
  let updated = 0;
  let index = 1;

  for (const grade of GRADES) {
    for (const display of DISPLAYS) {
      for (const batchId of BATCHES) {
        for (let n = 1; n <= 3; n++) {
          const code = displayCode(display);
          const name = `${makeName(index)} S${n}${code}${batchId}G${grade}`;
          const mobile = makeStudentMobile(index);
          const nameLower = name.toLowerCase();
          const data = {
            userId: `TST-STU-G${grade}-${code}-${batchId}-${n}`,
            name,
            nameLower,
            mobile,
            grade,
            display,
            batchId,
            batchName: `Batch ${batchId}`,
          };

          const existing = await prisma.rosterStudent.findUnique({
            where: { mobile_nameLower: { mobile, nameLower } },
          });
          if (existing) {
            await prisma.rosterStudent.update({
              where: { id: existing.id },
              data,
            });
            updated += 1;
          } else {
            await prisma.rosterStudent.create({ data });
            created += 1;
          }
          index += 1;
        }
      }
    }
  }

  return { created, updated };
}

async function upsertTeachers() {
  let created = 0;
  let updated = 0;
  let index = 1;
  const passwordHash = await bcrypt.hash(TEACHER_PLAIN_PASSWORD, 10);

  for (const grade of GRADES) {
    for (const display of DISPLAYS) {
      for (const batchId of BATCHES) {
        for (let n = 1; n <= 2; n++) {
          const code = displayCode(display).toLowerCase();
          const email = `teacher.g${grade}.${code}.${batchId.toLowerCase()}.${n}@infinitylearn.local`;
          const payload = {
            name: `${makeName(index)} T${n}${code.toUpperCase()}${batchId}G${grade}`,
            email,
            role: "teacher",
            grade,
            display,
            batchId,
            batchName: `Batch ${batchId}`,
          };

          const existing = await prisma.user.findUnique({ where: { email } });
          if (existing) {
            await prisma.user.update({
              where: { id: existing.id },
              data: {
                name: payload.name,
                grade: payload.grade,
                display: payload.display,
                batchId: payload.batchId,
                batchName: payload.batchName,
                role: "teacher",
              },
            });
            updated += 1;
          } else {
            await prisma.user.create({
              data: {
                ...payload,
                passwordHash,
              },
            });
            created += 1;
          }
          index += 1;
        }
      }
    }
  }

  return { created, updated };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  console.log("Connected to Postgres (Prisma)");

  const students = await upsertRosterStudents();
  const teachers = await upsertTeachers();

  console.log(
    JSON.stringify(
      {
        students,
        teachers,
        expectedStudents: GRADES.length * DISPLAYS.length * BATCHES.length * 3,
        expectedTeachers: GRADES.length * DISPLAYS.length * BATCHES.length * 2,
        teacherDefaultPassword: TEACHER_PLAIN_PASSWORD,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
