import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiCalendar, FiClock } from "react-icons/fi";
import { useAuthStore } from "../../models/auth.store";
import { useTeacherController } from "../../controllers/teacher.controller";
import { toDateLabel } from "../../utils/date";
import { BookingHero, BookingPanel, TeacherPageShell } from "../../components/teacher/TeacherWorkspaceChrome";

const relUntil = (d) => {
  const diff = d.getTime() - Date.now();
  if (diff < 0) return "Now";
  const m = Math.floor(diff / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `in ${h}h`;
  const days = Math.floor(h / 24);
  return `in ${days}d`;
};

export const TeacherDashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const { calendar, loading, loadCalendar } = useTeacherController();

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const activityRows = useMemo(() => {
    const upcoming = [];
    for (const row of calendar) {
      for (const slot of row.slots || []) {
        if (!slot.isBooked || !slot.booking) continue;
        if (slot.booking.status !== "scheduled") continue;
        const start = new Date(slot.booking.startTime || slot.startTime);
        upcoming.push({
          id: String(slot._id),
          start,
          learnerName: slot.booking.learnerName || "Learner",
          rowDate: row.date,
          booking: slot.booking,
        });
      }
    }
    upcoming.sort((a, b) => a.start - b.start);
    const now = new Date();
    const future = upcoming.filter((u) => u.start >= now);
    return future.slice(0, 2).map((u, i) => ({
      ...u,
      subtitle:
        i === 0
          ? `Booked · ${toDateLabel(u.rowDate)}`
          : "Confirmed · scheduled session",
    }));
  }, [calendar]);

  return (
    <TeacherPageShell>
      <BookingHero
        eyebrow="Instructor workspace"
        title="Workspace overview"
        description="Manage your academic schedule and student sessions from one place."
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFFFFF]/25 bg-[#FFFFFF]/10 px-2.5 py-1 text-[10px] font-semibold text-[#F4D35E]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" />
          Live
        </span>
      </BookingHero>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Primary actions">
        <BookingPanel className="relative !overflow-hidden">
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-20 w-20 rounded-full bg-[#8BBCEB]/25 blur-2xl"
            aria-hidden
          />
          <div className="relative flex flex-col justify-between gap-5">
            <div>
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#1E73D8]">
                <FiClock className="h-5 w-5" strokeWidth={2} aria-hidden />
              </span>
              <h2 className="font-heading text-lg font-bold text-[#0B3C5D]">Set availability</h2>
              <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-[#1E73D8]/88">
                Define your weekly office hours and tutorial slots. Students only see times you mark as open.
              </p>
            </div>
            <div>
              <Link
                to="/teacher/availability"
                className="inline-flex items-center gap-2 rounded-full bg-[#1E73D8] px-5 py-2.5 text-sm font-bold text-[#FFFFFF] shadow-[0_8px_20px_-10px_rgba(11,60,93,0.45)] transition hover:bg-[#0B3C5D]"
              >
                Open planner
                <FiArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </BookingPanel>

        <div className="relative overflow-hidden rounded-2xl border border-[#8BBCEB]/30 bg-gradient-to-br from-[#1E73D8] via-[#1E73D8] to-[#8BBCEB] p-5 text-[#FFFFFF] shadow-[0_14px_36px_-16px_rgba(11,60,93,0.4)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            aria-hidden
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.5'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="relative flex flex-col justify-between gap-5">
            <div>
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFFFFF]/15 text-[#FFFFFF]">
                <FiCalendar className="h-5 w-5" strokeWidth={2} aria-hidden />
              </span>
              <h2 className="font-heading text-lg font-bold text-[#FFFFFF]">Weekly calendar</h2>
              <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-[#FFFFFF]/92">
                Confirmed sessions and open slots for the current booking window — all in one view.
              </p>
            </div>
            <div>
              <Link
                to="/teacher/calendar"
                className="inline-flex items-center gap-2 rounded-full bg-[#FFFFFF] px-5 py-2.5 text-sm font-bold text-[#1E73D8] shadow-[0_6px_18px_-10px_rgba(0,0,0,0.15)] transition hover:bg-[#F5F5F5]"
              >
                View calendar
                <FiArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Secondary overview">
        <BookingPanel className="!bg-[#F5F5F5]/90">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-heading text-sm font-bold text-[#0B3C5D]">Recent student activity</h3>
            <span className="rounded-md bg-[#8BBCEB]/35 px-2 py-0.5 text-[10px] font-bold text-[#0B3C5D]">Live</span>
          </div>
          {loading ? (
            <p className="text-xs font-medium text-[#1E73D8]/80">Loading…</p>
          ) : activityRows.length === 0 ? (
            <p className="text-xs font-medium text-[#1E73D8]/80">
              No upcoming bookings yet. When students book, they will appear here.
            </p>
          ) : (
            <ul className="space-y-2">
              {activityRows.map((row) => {
                const initials = row.learnerName
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <li
                    key={row.id}
                    className="flex items-center gap-3 rounded-lg border border-[#8BBCEB]/25 bg-[#FFFFFF] p-2.5 shadow-sm"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8BBCEB]/35 text-xs font-bold text-[#0B3C5D]">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#0B3C5D]">{row.learnerName}</p>
                      <p className="text-xs font-medium text-[#1E73D8]/85">{row.subtitle}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-[#8BBCEB]">{relUntil(row.start)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </BookingPanel>
      </section>

      <p className="text-center text-[10px] font-medium text-[#1E73D8]/75">
        Signed in as {user?.email || "—"}
      </p>
    </TeacherPageShell>
  );
};
