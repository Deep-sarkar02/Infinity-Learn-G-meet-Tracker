import { Input } from "../ui/Input";
import { TEACHER_DISPLAY_OPTIONS } from "../../utils/validators";
import { sanitizeBatchIdInput, sanitizeBatchNameInput } from "../../utils/batchFields";

const GRADE_OPTIONS = Array.from({ length: 12 }, (_, idx) => String(idx + 1));

/**
 * One assignment per submit: grade, channel, batch ID, batch name.
 */
export const TeacherSingleAssignmentFields = ({
  grade,
  display,
  batchId,
  batchName,
  onChange,
  errors = {},
  onTouch,
}) => (
  <div className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-[#0B3C5D]">
          Grade <span className="text-[#F4D35E]">*</span>
        </span>
        <select
          className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
          value={grade}
          onBlur={() => onTouch?.("grade")}
          onChange={(e) => onChange({ grade: e.target.value })}
        >
          <option value="">Select grade</option>
          {GRADE_OPTIONS.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
        {errors.grade ? <p className="text-xs font-medium text-red-600">{errors.grade}</p> : null}
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-[#0B3C5D]">
          Channel <span className="text-[#F4D35E]">*</span>
        </span>
        <select
          className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
          value={display}
          onBlur={() => onTouch?.("display")}
          onChange={(e) => onChange({ display: e.target.value })}
        >
          <option value="">Select channel</option>
          {TEACHER_DISPLAY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.display ? <p className="text-xs font-medium text-red-600">{errors.display}</p> : null}
      </label>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        tone="admin"
        label="Batch ID"
        value={batchId}
        error={errors.batchId}
        onBlur={() => onTouch?.("batchId")}
        onChange={(e) => onChange({ batchId: sanitizeBatchIdInput(e.target.value) })}
      />
      <Input
        tone="admin"
        label="Batch name"
        value={batchName}
        error={errors.batchName}
        onBlur={() => onTouch?.("batchName")}
        onChange={(e) => onChange({ batchName: sanitizeBatchNameInput(e.target.value) })}
      />
    </div>
  </div>
);

export const emptySingleAssignmentForm = () => ({
  name: "",
  email: "",
  grade: "",
  display: "",
  batchId: "",
  batchName: "",
});

/** Wrap flat fields for shared batch validators. */
export const formToValidationShape = (form) => ({
  name: form.name,
  email: form.email,
  batches: [
    {
      grade: form.grade ?? "",
      display: form.display ?? "",
      batchId: form.batchId ?? "",
      batchName: form.batchName ?? "",
    },
  ],
});

export const mapBatchFieldErrors = (errors) => ({
  name: errors.name,
  email: errors.email,
  grade: errors["batches.0.grade"],
  display: errors["batches.0.display"],
  batchId: errors["batches.0.batchId"],
  batchName: errors["batches.0.batchName"],
  batches: errors.batches,
});

export const touchAssignmentField = (key) => {
  if (key === "name" || key === "email") return { [key]: true };
  return { [`batches.0.${key}`]: true, batches: true };
};

/** All assignments for a teacher API object (multi-batch or legacy single row). */
export const listTeacherAssignments = (teacher) => {
  if (Array.isArray(teacher?.batches) && teacher.batches.length) {
    return teacher.batches.map((b) => ({
      grade: String(b.grade ?? "").trim(),
      display: String(b.display ?? "").trim(),
      batchId: String(b.batchId ?? "").trim(),
      batchName: String(b.batchName ?? "").trim(),
    }));
  }
  if (teacher?.batchId && teacher?.batchName) {
    return [
      {
        grade: String(teacher.grade ?? "").trim(),
        display: String(teacher.display ?? "").trim(),
        batchId: String(teacher.batchId),
        batchName: String(teacher.batchName),
      },
    ];
  }
  return [];
};

const TeachesRow = ({ label, value, mono = false }) => (
  <p className="leading-relaxed">
    <span className="font-semibold text-[#0B3C5D]/75">{label}:</span>{" "}
    <span
      className={`font-medium text-[#1E73D8] ${mono ? "break-all font-mono text-[11px]" : "break-words"}`}
    >
      {value || "—"}
    </span>
  </p>
);

/** Manage-teachers card: "Teaches :-" with labeled grade, channel, batch fields. */
export const TeacherTeachesBlock = ({ teacher, className = "" }) => {
  const assignments = listTeacherAssignments(teacher);
  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-xs font-bold text-[#0B3C5D]">Teaches :-</p>
      {!assignments.length ? (
        <p className="rounded-lg bg-[#F5F5F5] px-3 py-2 text-xs font-medium text-[#1E73D8]">—</p>
      ) : (
        <div className="space-y-2">
          {assignments.map((b, index) => (
            <div
              key={`${b.grade}-${b.display}-${b.batchId}-${b.batchName}-${index}`}
              className="rounded-lg bg-[#F5F5F5] px-3 py-2 text-xs"
            >
              {assignments.length > 1 ? (
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#1E73D8]/80">
                  Entry {index + 1}
                </p>
              ) : null}
              <TeachesRow label="Grade" value={b.grade ? `Grade ${b.grade}` : ""} />
              <TeachesRow label="Channel" value={b.display} />
              <TeachesRow label="Batch ID" value={b.batchId} mono />
              <TeachesRow label="Batch name" value={b.batchName} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
