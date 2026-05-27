/** Aligned with backend `commonSchemas` batchId / batchName rules. */

export const BATCH_ID_MAX = 120;
export const BATCH_NAME_MAX = 500;

const BATCH_ID_RE = /^[a-zA-Z0-9_-]+$/;
const BATCH_NAME_RE = /^[\p{L}\p{N}\s|:\-.,()/&_]+$/u;

export const sanitizeBatchIdInput = (raw) =>
  String(raw ?? "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, BATCH_ID_MAX);

export const sanitizeBatchNameInput = (raw) => String(raw ?? "").slice(0, BATCH_NAME_MAX);

export const isValidBatchId = (raw) => {
  const t = String(raw ?? "").trim();
  return t.length >= 1 && t.length <= BATCH_ID_MAX && BATCH_ID_RE.test(t);
};

export const batchIdError = (raw) => {
  const t = String(raw ?? "").trim();
  if (!t) return "Batch ID is required";
  if (t.length > BATCH_ID_MAX) return `Batch ID must be at most ${BATCH_ID_MAX} characters`;
  if (!BATCH_ID_RE.test(t)) {
    return "Batch ID may use letters, numbers, hyphens, and underscores (e.g. UUID)";
  }
  return null;
};

export const batchNameError = (raw) => {
  const t = String(raw ?? "").trim();
  if (!t) return "Batch name is required";
  if (t.length > BATCH_NAME_MAX) return `Batch name must be at most ${BATCH_NAME_MAX} characters`;
  if (!BATCH_NAME_RE.test(t)) return "Batch name contains unsupported characters";
  return null;
};
