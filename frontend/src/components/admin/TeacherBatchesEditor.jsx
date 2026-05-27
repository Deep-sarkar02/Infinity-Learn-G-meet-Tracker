import { FiPlus, FiTrash2 } from "react-icons/fi";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { TEACHER_DISPLAY_OPTIONS } from "../../utils/validators";
import { sanitizeBatchIdInput, sanitizeBatchNameInput } from "../../utils/batchFields";

const GRADE_OPTIONS = Array.from({ length: 12 }, (_, idx) => String(idx + 1));

export const emptyAssignment = () => ({
  grade: "",
  display: "",
  batchId: "",
  batchName: "",
});

/**
 * Each row = grade + channel (display) + batch — a full roster assignment.
 */
export const TeacherBatchesEditor = ({
  batches,
  onChange,
  errors = {},
  touched = {},
  submitAttempt = false,
  onTouchBatch,
}) => {
  const rows = batches.length ? batches : [emptyAssignment()];

  const updateRow = (index, patch) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(next);
  };

  const addRow = () => onChange([...rows, emptyAssignment()]);

  const removeRow = (index) => {
    if (rows.length <= 1) {
      onChange([emptyAssignment()]);
      return;
    }
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0B3C5D]">
          Assignments (grade · channel · batch)
        </p>
        <Button type="button" variant="adminGhost" className="!py-1.5 !text-xs" onClick={addRow}>
          <FiPlus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Add assignment
        </Button>
      </div>
      {rows.map((row, index) => (
        <div
          key={index}
          className="space-y-3 rounded-xl border border-[#8BBCEB]/40 bg-[#F8FAFE]/80 p-3"
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#1E73D8]/80">
            Assignment {index + 1}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#0B3C5D]">
                Grade <span className="text-[#F4D35E]">*</span>
              </span>
              <select
                className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
                value={row.grade}
                onBlur={() => onTouchBatch?.(index, "grade")}
                onChange={(e) => updateRow(index, { grade: e.target.value })}
              >
                <option value="">Select grade</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
              {errors[`batches.${index}.grade`] ? (
                <p className="text-xs font-medium text-red-600">{errors[`batches.${index}.grade`]}</p>
              ) : null}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#0B3C5D]">
                Channel <span className="text-[#F4D35E]">*</span>
              </span>
              <select
                className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
                value={row.display}
                onBlur={() => onTouchBatch?.(index, "display")}
                onChange={(e) => updateRow(index, { display: e.target.value })}
              >
                <option value="">Select channel</option>
                {TEACHER_DISPLAY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors[`batches.${index}.display`] ? (
                <p className="text-xs font-medium text-red-600">{errors[`batches.${index}.display`]}</p>
              ) : null}
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              label="Batch ID"
              value={row.batchId}
              error={errors[`batches.${index}.batchId`]}
              onBlur={() => onTouchBatch?.(index, "batchId")}
              onChange={(e) =>
                updateRow(index, {
                  batchId: sanitizeBatchIdInput(e.target.value),
                })
              }
            />
            <Input
              label="Batch name"
              value={row.batchName}
              error={errors[`batches.${index}.batchName`]}
              onBlur={() => onTouchBatch?.(index, "batchName")}
              onChange={(e) =>
                updateRow(index, {
                  batchName: sanitizeBatchNameInput(e.target.value),
                })
              }
            />
            <div className="flex items-end pb-0.5">
              <button
                type="button"
                className="rounded-lg p-2 text-[#1E73D8] hover:bg-[#EAF2FF] disabled:opacity-40"
                onClick={() => removeRow(index)}
                disabled={rows.length <= 1}
                aria-label="Remove assignment"
              >
                <FiTrash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
      {(submitAttempt || touched.batches) && errors.batches ? (
        <p className="text-sm font-medium text-red-600">{errors.batches}</p>
      ) : null}
    </div>
  );
};

export const batchesFromTeacher = (teacher) => {
  if (Array.isArray(teacher?.batches) && teacher.batches.length) {
    return teacher.batches.map((b) => ({
      grade: String(b.grade ?? teacher.grade ?? ""),
      display: String(b.display ?? teacher.display ?? ""),
      batchId: String(b.batchId ?? ""),
      batchName: String(b.batchName ?? ""),
    }));
  }
  if (teacher?.batchId && teacher?.batchName) {
    return [
      {
        grade: String(teacher.grade ?? ""),
        display: String(teacher.display ?? ""),
        batchId: String(teacher.batchId),
        batchName: String(teacher.batchName),
      },
    ];
  }
  return [emptyAssignment()];
};

export const formatAssignmentLabel = (b) => {
  const parts = [];
  if (b.grade) parts.push(`G${b.grade}`);
  if (b.display) parts.push(b.display);
  if (b.batchId) parts.push(b.batchId);
  if (b.batchName && b.batchName !== b.batchId) parts.push(`(${b.batchName})`);
  return parts.join(" · ") || "—";
};
