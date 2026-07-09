import { useAuthStore } from "../../models/auth.store";
import { listTeacherAssignments } from "../../components/admin/TeacherSingleAssignmentFields";
import { BookingHero, BookingPanel, TeacherPageShell } from "../../components/teacher/TeacherWorkspaceChrome";

const AssignmentCard = ({ assignment, index, total }) => (
  <BookingPanel className="flex h-full flex-col">
    {total > 1 ? (
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1E73D8]/70">
        Assignment {index + 1}
      </p>
    ) : null}
    <dl className="space-y-2 text-xs">
      <div>
        <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0B3C5D]/60">Grade</dt>
        <dd className="mt-1 font-semibold text-[#0B3C5D]">
          {assignment.grade ? `Grade ${assignment.grade}` : "—"}
        </dd>
      </div>
      <div>
        <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0B3C5D]/60">Channel</dt>
        <dd className="mt-1 font-semibold text-[#1E73D8]">{assignment.display || "—"}</dd>
      </div>
      <div>
        <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0B3C5D]/60">Batch ID</dt>
        <dd className="mt-1 break-all font-mono text-xs font-medium text-[#1E73D8]/90">
          {assignment.batchId || "—"}
        </dd>
      </div>
      <div>
        <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0B3C5D]/60">Batch name</dt>
        <dd className="mt-1 break-words font-medium text-[#1E73D8]/90">{assignment.batchName || "—"}</dd>
      </div>
    </dl>
  </BookingPanel>
);

export const TeacherAssignmentsPage = () => {
  const user = useAuthStore((state) => state.user);
  const assignments = listTeacherAssignments(user);

  return (
    <TeacherPageShell>
      <BookingHero
        eyebrow="Teaching profile"
        title="What you teach"
        description="All grades, channels, and batches assigned to your instructor account."
      />

      {assignments.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Teaching assignments">
          {assignments.map((assignment, index) => (
            <AssignmentCard
              key={`${assignment.batchId}-${assignment.grade}-${assignment.display}-${index}`}
              assignment={assignment}
              index={index}
              total={assignments.length}
            />
          ))}
        </div>
      ) : (
        <BookingPanel>
          <p className="text-xs font-medium text-[#1E73D8]/85">
            No teaching assignments are linked to your account yet. Contact your administrator if this looks wrong.
          </p>
        </BookingPanel>
      )}
    </TeacherPageShell>
  );
};
