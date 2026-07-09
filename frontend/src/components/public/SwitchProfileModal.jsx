import { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import { cn } from "../../utils/cn";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { renderModalPortal } from "../ui/modalPortal";
import { StudentProfileAvatar } from "./StudentProfileAvatar";

const IL_BLUE = "#007BFF";

const formatGradeLabel = (grade) => {
  const value = String(grade ?? "").trim();
  if (!value) return "Grade —";
  return value.toLowerCase().startsWith("grade") ? value : `Grade ${value}`;
};

const ProfileCard = ({ student, selected, onSelect, index }) => (
  <button
    type="button"
    onClick={onSelect}
    className={cn(
      "flex min-w-[8.5rem] max-w-[9.5rem] flex-1 flex-col items-center rounded-2xl border px-3 py-4 text-center transition",
      selected
        ? "border-[#007BFF] bg-[#EAF4FF] shadow-[0_0_0_1px_#007BFF]"
        : "border-[#E5E5E5] bg-white hover:border-[#007BFF]/40",
    )}
  >
    <StudentProfileAvatar name={student.name} variant={index % 2 === 0 ? "a" : "b"} />
    <p className="mt-3 line-clamp-2 text-sm font-bold leading-snug text-[#1A1A1A]">{student.name}</p>
    <p className="mt-1 text-xs font-medium text-[#8A8A8A]">{formatGradeLabel(student.grade)}</p>
  </button>
);

export const SwitchProfileModal = ({ open, students = [], onClose, onConfirm }) => {
  const [selectedId, setSelectedId] = useState(null);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && students.length) {
      setSelectedId(students[0].id);
    } else {
      setSelectedId(null);
    }
  }, [open, students]);

  const selectedStudent = students.find((student) => student.id === selectedId) ?? null;

  if (!open || !students.length) return null;

  return renderModalPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-[#0B0B0B]/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="switch-profile-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[36rem] overflow-hidden rounded-3xl bg-white px-5 pb-5 pt-4 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.35)] sm:px-6 sm:pb-6 sm:pt-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="switch-profile-title" className="text-xl font-bold text-[#1A1A1A]">
            Switch Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#007BFF] transition hover:bg-[#F5F8FF]"
            aria-label="Close"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-5 flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {students.map((student, index) => (
            <ProfileCard
              key={student.id}
              student={student}
              index={index}
              selected={student.id === selectedId}
              onSelect={() => setSelectedId(student.id)}
            />
          ))}
        </div>

        <button
          type="button"
          disabled={!selectedStudent}
          onClick={() => selectedStudent && onConfirm(selectedStudent)}
          className="mt-6 w-full rounded-full py-4 text-base font-semibold text-white transition hover:bg-[#0069D9] active:bg-[#005FCC] disabled:cursor-not-allowed disabled:bg-[#C8C8C8]"
          style={{ backgroundColor: selectedStudent ? IL_BLUE : undefined }}
        >
          Confirm
        </button>
      </div>
    </div>,
  );
};
