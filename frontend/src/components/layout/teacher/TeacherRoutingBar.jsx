import { useAuthStore } from "../../../models/auth.store";
import { listTeacherAssignments } from "../../admin/TeacherSingleAssignmentFields";
import { BatchAssignmentMeta } from "../../BatchAssignmentMeta";

const cardClass =
  "min-w-0 max-w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2 shadow-sm";

/**
 * Shows grade, channel, batch ID, and batch name on every teacher screen.
 */
export const TeacherRoutingBar = () => {
  const user = useAuthStore((s) => s.user);
  if (!user || user.role !== "teacher") return null;

  const batchList = listTeacherAssignments(user);
  if (!batchList.length) return null;

  return (
    <div
      className="border-b border-[#8BBCEB]/30 bg-gradient-to-r from-[#F5F5F5] via-[#FFFFFF] to-[#F5F5F5] px-6 py-3 md:px-8"
      aria-label="What you teach"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1E73D8]/75">Teaches :-</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {batchList.map((b, index) => (
          <div key={`${b.batchId}-${index}`} className={cardClass}>
            {batchList.length > 1 ? (
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#1E73D8]/70">
                Entry {index + 1}
              </p>
            ) : null}
            <BatchAssignmentMeta {...b} compact showBatchId />
          </div>
        ))}
      </div>
    </div>
  );
};
