/** @typedef {{ grade: string, display: string, batchId: string, batchName: string }} TeacherBatchInput */

const sameText = (a, b) =>
  String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

const isCompleteAssignment = (b) =>
  Boolean(b.grade && b.display && b.batchId && b.batchName);

/**
 * Normalize API / legacy payload into a deduped assignment list.
 * @param {{ batches?: TeacherBatchInput[], grade?: string, display?: string, batchId?: string, batchName?: string }} payload
 * @returns {TeacherBatchInput[]}
 */
const normalizeTeacherBatchesInput = (payload) => {
  const topGrade = String(payload?.grade ?? "").trim();
  const topDisplay = String(payload?.display ?? "").trim();
  const raw = Array.isArray(payload?.batches) ? payload.batches : [];
  const fromArray = raw
    .map((b) => ({
      grade: String(b?.grade ?? topGrade).trim(),
      display: String(b?.display ?? topDisplay).trim(),
      batchId: String(b?.batchId ?? "").trim(),
      batchName: String(b?.batchName ?? "").trim(),
    }))
    .filter(isCompleteAssignment);

  if (fromArray.length) {
    return dedupeBatches(fromArray);
  }

  const batchId = String(payload?.batchId ?? "").trim();
  const batchName = String(payload?.batchName ?? "").trim();
  if (topGrade && topDisplay && batchId && batchName) {
    return [{ grade: topGrade, display: topDisplay, batchId, batchName }];
  }
  return [];
};

const dedupeBatches = (list) => {
  const seen = new Set();
  const out = [];
  for (const b of list) {
    const key = `${b.grade.toLowerCase()}|${b.display.toLowerCase()}|${b.batchId.toLowerCase()}|${b.batchName.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out;
};

/** Merge existing assignments with new ones (same email, new grade/channel/batch). */
const mergeAssignmentLists = (existing, incoming) =>
  dedupeBatches([...existing, ...incoming]);

/**
 * @param {{ grade?: string|null, display?: string|null, batchId?: string|null, batchName?: string|null, teacherBatches?: { grade?: string, display?: string, batchId: string, batchName: string }[] }} teacher
 * @param {{ grade: string, display: string, batchId: string, batchName: string }} roster
 */
const teacherMatchesRoster = (teacher, roster) => {
  const batches = listAssignmentsForTeacher(teacher);
  return batches.filter(isCompleteAssignment).some(
    (b) =>
      sameText(b.grade, roster.grade) &&
      sameText(b.display, roster.display) &&
      sameText(b.batchId, roster.batchId) &&
      sameText(b.batchName, roster.batchName),
  );
};

/** Prisma pre-filter: teachers who may serve this roster (any assignment or legacy user row). */
const teachersForRosterWhere = (roster) => {
  const grade = String(roster.grade ?? "").trim();
  const display = String(roster.display ?? "").trim();
  const batchId = String(roster.batchId ?? "").trim();
  const batchName = String(roster.batchName ?? "").trim();
  return {
    role: "teacher",
    OR: [
      {
        teacherBatches: {
          some: { grade, display, batchId, batchName },
        },
      },
      { grade, display, batchId, batchName },
      // Broader match for case/whitespace differences; final check uses teacherMatchesRoster.
      {
        teacherBatches: {
          some: { grade, display },
        },
      },
    ],
  };
};

const listAssignmentsForTeacher = (teacher) => {
  if (Array.isArray(teacher.teacherBatches) && teacher.teacherBatches.length) {
    return teacher.teacherBatches.map((b) => ({
      grade: b.grade ?? teacher.grade,
      display: b.display ?? teacher.display,
      batchId: b.batchId,
      batchName: b.batchName,
    }));
  }
  const grade = String(teacher.grade ?? "").trim();
  const display = String(teacher.display ?? "").trim();
  const batchId = String(teacher.batchId ?? "").trim();
  const batchName = String(teacher.batchName ?? "").trim();
  if (grade && display && batchId && batchName) {
    return [{ grade, display, batchId, batchName }];
  }
  return [];
};

/** Primary assignment stored on users row (backward compat for email / legacy UI). */
const primaryRoutingFromList = (batches) => {
  const first = batches.find(isCompleteAssignment) || batches[0];
  return first
    ? {
        grade: first.grade,
        display: first.display,
        batchId: first.batchId,
        batchName: first.batchName,
      }
    : { grade: null, display: null, batchId: null, batchName: null };
};

/** @deprecated use primaryRoutingFromList */
const primaryBatchFromList = primaryRoutingFromList;

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} teacherId
 * @param {TeacherBatchInput[]} batches
 */
const replaceTeacherBatches = async (prisma, teacherId, batches) => {
  const list = dedupeBatches(batches);
  const primary = primaryRoutingFromList(list);

  await prisma.$transaction([
    prisma.teacherBatch.deleteMany({ where: { teacherId } }),
    ...(list.length
      ? [
          prisma.teacherBatch.createMany({
            data: list.map((b) => ({
              teacherId,
              grade: b.grade,
              display: b.display,
              batchId: b.batchId,
              batchName: b.batchName,
            })),
          }),
        ]
      : []),
    prisma.user.update({
      where: { id: teacherId },
      data: {
        grade: primary.grade,
        display: primary.display,
        batchId: primary.batchId,
        batchName: primary.batchName,
      },
    }),
  ]);

  return list;
};

/**
 * Migrate legacy single assignment on user row into teacher_batches if missing.
 */
const ensureTeacherBatchesMigrated = async (prisma, teacher) => {
  if (!teacher?.id) return teacher;
  if (Array.isArray(teacher.teacherBatches) && teacher.teacherBatches.length) {
    return teacher;
  }
  const grade = String(teacher.grade ?? "").trim();
  const display = String(teacher.display ?? "").trim();
  const batchId = String(teacher.batchId ?? "").trim();
  const batchName = String(teacher.batchName ?? "").trim();
  if (!grade || !display || !batchId || !batchName) return teacher;

  await prisma.teacherBatch.create({
    data: { teacherId: teacher.id, grade, display, batchId, batchName },
  });
  return {
    ...teacher,
    teacherBatches: [{ grade, display, batchId, batchName }],
  };
};

const teacherBatchesInclude = {
  teacherBatches: {
    orderBy: [{ grade: "asc" }, { display: "asc" }, { batchId: "asc" }, { batchName: "asc" }],
    select: { grade: true, display: true, batchId: true, batchName: true },
  },
};

const shapeTeacherBatchesForApi = (teacher) => {
  const batches = listAssignmentsForTeacher(teacher)
    .filter(isCompleteAssignment)
    .map((b) => ({
      grade: b.grade,
      display: b.display,
      batchId: b.batchId,
      batchName: b.batchName,
    }));

  const primary = primaryRoutingFromList(batches);
  return {
    batches,
    grade: primary.grade,
    display: primary.display,
    batchId: primary.batchId,
    batchName: primary.batchName,
  };
};

/**
 * Backfill users row → teacher_batches (includes grade + display from user).
 */
const migrateLegacyTeacherBatches = async (prisma, teachers) => {
  const data = [];
  for (const t of teachers) {
    if (Array.isArray(t.teacherBatches) && t.teacherBatches.length) continue;
    const grade = String(t.grade ?? "").trim();
    const display = String(t.display ?? "").trim();
    const batchId = String(t.batchId ?? "").trim();
    const batchName = String(t.batchName ?? "").trim();
    if (grade && display && batchId && batchName) {
      data.push({ teacherId: t.id, grade, display, batchId, batchName });
    }
  }
  if (!data.length) return;
  await prisma.teacherBatch.createMany({ data, skipDuplicates: true });
};

/** Fill grade/display on assignment rows created before per-row routing existed. */
const backfillTeacherBatchRouting = async (prisma) => {
  const rows = await prisma.teacherBatch.findMany({
    include: { teacher: { select: { grade: true, display: true } } },
  });
  for (const row of rows) {
    const grade = String(row.grade || row.teacher?.grade || "").trim();
    const display = String(row.display || row.teacher?.display || "").trim();
    if (!grade || !display) continue;
    if (row.grade === grade && row.display === display) continue;
    await prisma.teacherBatch.update({
      where: { id: row.id },
      data: { grade, display },
    });
  }
};

const formatBatchesForEmail = (batches) => {
  if (!batches.length) return { grade: "", display: "", batchId: "", batchName: "" };
  return {
    grade: [...new Set(batches.map((b) => b.grade))].join(", "),
    display: [...new Set(batches.map((b) => b.display))].join(", "),
    batchId: batches.map((b) => b.batchId).join(", "),
    batchName: batches.map((b) => b.batchName).join(", "),
  };
};

const formatAssignmentLabel = (b) => {
  const parts = [];
  if (b.grade) parts.push(`G${b.grade}`);
  if (b.display) parts.push(b.display);
  if (b.batchId) parts.push(b.batchId);
  if (b.batchName && b.batchName !== b.batchId) parts.push(`(${b.batchName})`);
  return parts.join(" · ") || "";
};

module.exports = {
  normalizeTeacherBatchesInput,
  teacherMatchesRoster,
  teachersForRosterWhere,
  replaceTeacherBatches,
  ensureTeacherBatchesMigrated,
  migrateLegacyTeacherBatches,
  backfillTeacherBatchRouting,
  teacherBatchesInclude,
  shapeTeacherBatchesForApi,
  dedupeBatches,
  mergeAssignmentLists,
  formatBatchesForEmail,
  formatAssignmentLabel,
  primaryRoutingFromList,
  primaryBatchFromList,
  listAssignmentsForTeacher,
};
