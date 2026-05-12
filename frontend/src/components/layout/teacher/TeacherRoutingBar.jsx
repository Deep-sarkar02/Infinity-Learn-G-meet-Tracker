import { useAuthStore } from "../../../models/auth.store";

const chipClass =
  "inline-flex max-w-full items-center rounded-full border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-1 text-xs font-bold text-[#0B3C5D] shadow-sm";

/**
 * Shows grade, channel (display), and batch on every teacher screen — especially useful on mobile where the sidebar is hidden.
 */
export const TeacherRoutingBar = () => {
  const user = useAuthStore((s) => s.user);
  if (!user || user.role !== "teacher") return null;

  const grade = user.grade != null && String(user.grade).trim() !== "" ? String(user.grade).trim() : null;
  const channel = user.display != null && String(user.display).trim() !== "" ? String(user.display).trim() : null;
  const batchId = user.batchId != null && String(user.batchId).trim() !== "" ? String(user.batchId).trim() : null;
  const batchName =
    user.batchName != null && String(user.batchName).trim() !== "" ? String(user.batchName).trim() : null;

  if (!grade && !channel && !batchId && !batchName) return null;

  const batchLabel =
    batchId && batchName ? `${batchId} · ${batchName}` : batchId || batchName || null;

  return (
    <div
      className="border-b border-[#8BBCEB]/30 bg-gradient-to-r from-[#F5F5F5] via-[#FFFFFF] to-[#F5F5F5] px-6 py-3 md:px-8"
      aria-label="Your teaching assignment"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1E73D8]/75">Grade · channel · batch</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {grade ? (
          <span className={chipClass} title={`Grade ${grade}`}>
            <span className="mr-1.5 text-[10px] font-bold uppercase tracking-wide text-[#1E73D8]/70">Grade</span>
            <span className="truncate">{grade}</span>
          </span>
        ) : null}
        {channel ? (
          <span className={chipClass} title={channel}>
            <span className="mr-1.5 text-[10px] font-bold uppercase tracking-wide text-[#1E73D8]/70">Channel</span>
            <span className="truncate">{channel}</span>
          </span>
        ) : null}
        {batchLabel ? (
          <span className={chipClass} title={batchLabel}>
            <span className="mr-1.5 text-[10px] font-bold uppercase tracking-wide text-[#1E73D8]/70">Batch</span>
            <span className="truncate">{batchLabel}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
};
