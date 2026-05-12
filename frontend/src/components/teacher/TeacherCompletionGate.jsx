import { useCallback, useEffect, useState } from "react";
import { FiCheckCircle, FiClock, FiUser, FiUserX, FiSlash } from "react-icons/fi";
import { Button } from "../ui/Button";
import { Loader } from "../ui/Loader";
import { teacherService } from "../../services/teacher.service";
import { useToast } from "../../hooks/useToast";
import { toDateLabel, toTimeLabel } from "../../utils/date";

const POLL_MS = 45_000;

/**
 * Blocks the teacher workspace until every past scheduled session has an outcome
 * (completed, student did not join, or teacher did not join).
 */
export const TeacherCompletionGate = () => {
  const { pushToast } = useToast();
  const [current, setCurrent] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [gateError, setGateError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPending = useCallback(async () => {
    setGateError(null);
    try {
      const { data } = await teacherService.getTeacherPendingCompletion();
      const list = Array.isArray(data.data) ? data.data : [];
      setCurrent(list[0] ?? null);
    } catch {
      setGateError("We could not verify pending sessions. Check your connection and try again.");
    } finally {
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    void fetchPending();
    const id = window.setInterval(() => void fetchPending(), POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchPending]);

  const handleResolve = async (outcome) => {
    if (!current?.id) return;
    setSubmitting(true);
    try {
      const { data } = await teacherService.completeTeacherBooking(current.id, { outcome });
      window.dispatchEvent(new CustomEvent("il:teacher-booking-status-changed"));
      await fetchPending();
      pushToast({
        title: data?.message || "Session updated",
      });
    } catch (error) {
      const msg = error.response?.data?.message;
      pushToast({
        title: Array.isArray(msg) ? msg.join(" ") : msg || "Could not update session",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!initialized) {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0B3C5D]/80 p-4"
        role="status"
        aria-live="polite"
      >
        <div className="rounded-2xl border border-[#8BBCEB]/45 bg-[#FFFFFF] px-8 py-10 shadow-xl">
          <Loader label="Checking sessions…" variant="admin" />
        </div>
      </div>
    );
  }

  if (gateError) {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0B3C5D]/70 p-4 backdrop-blur-[2px]"
        role="alertdialog"
        aria-modal="true"
      >
        <div className="w-full max-w-md rounded-2xl border border-[#8BBCEB]/50 bg-[#FFFFFF] p-6 text-center shadow-xl">
          <p className="text-sm font-semibold text-[#0B3C5D]">{gateError}</p>
          <Button type="button" variant="adminPrimary" className="mt-6 w-full justify-center py-3" onClick={() => void fetchPending()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!current) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0B3C5D]/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="teacher-completion-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#8BBCEB]/50 bg-[#FFFFFF] p-6 shadow-[0_24px_56px_-20px_rgba(11,60,93,0.45)]">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F4D35E]/25 text-[#0B3C5D]">
            <FiClock className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1E73D8]">Action required</p>
            <h2 id="teacher-completion-title" className="font-heading text-lg font-bold text-[#0B3C5D]">
              Confirm this meeting has ended
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-[#1E73D8]/90">
              This session&apos;s scheduled time has passed. Choose what happened so the record matches reality before
              you continue in the workspace.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[#8BBCEB]/35 bg-[#F5F5F5]/80 p-4">
          <div className="flex items-center gap-2 text-[#1E73D8]">
            <FiUser className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-bold uppercase tracking-wide">Learner</span>
          </div>
          <p className="mt-1 font-heading text-base font-bold text-[#0B3C5D]">{current.learnerName}</p>
          {current.learnerGrade != null ? (
            <p className="mt-1 text-sm font-semibold text-[#1E73D8]/90">Grade {current.learnerGrade}</p>
          ) : null}
          {current.contactEmail ? (
            <p className="mt-1 text-xs font-medium text-[#0B3C5D]/90">{current.contactEmail}</p>
          ) : null}
          {current.learnerMobile ? (
            <p className="mt-0.5 text-xs font-medium text-[#1E73D8]/88">{current.learnerMobile}</p>
          ) : null}
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-[#1E73D8]">Session (IST)</p>
          <p className="mt-1 text-sm font-semibold text-[#0B3C5D]">{toDateLabel(current.startTime)}</p>
          <p className="mt-0.5 text-sm font-semibold text-[#0B3C5D]">
            {toTimeLabel(current.startTime)} – {toTimeLabel(current.endTime)}
          </p>
          <p className="mt-1 text-xs font-medium capitalize text-[#8BBCEB]">{current.bookingKind || "—"}</p>
        </div>

        <div className="mt-6 space-y-3">
          <Button
            type="button"
            variant="adminPrimary"
            className="w-full justify-center gap-2 py-3.5"
            onClick={() => void handleResolve("completed")}
            disabled={submitting}
          >
            {submitting ? (
              <Loader label="Saving…" variant="admin" />
            ) : (
              <>
                <FiCheckCircle className="h-5 w-5" aria-hidden />
                Meeting completed
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="adminSecondary"
            className="w-full justify-center gap-2 py-3"
            onClick={() => void handleResolve("student_did_not_join")}
            disabled={submitting}
          >
            <FiUserX className="h-5 w-5 shrink-0" aria-hidden />
            Student did not join
          </Button>
          <Button
            type="button"
            variant="adminSecondary"
            className="w-full justify-center gap-2 py-3"
            onClick={() => void handleResolve("teacher_did_not_join")}
            disabled={submitting}
          >
            <FiSlash className="h-5 w-5 shrink-0" aria-hidden />
            Teacher did not join
          </Button>
        </div>
      </div>
    </div>
  );
};
