import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowUpRight,
  FiCalendar,
  FiClipboard,
  FiClock,
  FiGrid,
  FiSettings,
  FiUsers,
} from "react-icons/fi";
import { Loader } from "../../components/ui/Loader";
import { InfoModal } from "../../components/ui/InfoModal";
import {
  GradeBookingsPie,
  HorizontalBookingsBar,
  WeekdayStackedBookingsBar,
} from "../../components/admin/BookingCharts";
import { adminService } from "../../services/admin.service";
import { bookingStatusChipClassName, formatBookingStatusLabel } from "../../utils/bookingStatus";
import { useToast } from "../../hooks/useToast";

const formatWhen = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
};

const PatternBg = () => (
  <svg
    className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.14]"
    aria-hidden
  >
    <defs>
      <pattern id="admin-grid" width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#FFFFFF" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#admin-grid)" />
  </svg>
);

const KpiTile = ({ label, value, hint, accent }) => (
  <div
    className={`relative overflow-hidden rounded-2xl border border-[#8BBCEB]/35 bg-[#FFFFFF] p-5 shadow-[0_12px_32px_-16px_rgba(11,60,93,0.25)]`}
  >
    <div
      className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.12] ${accent}`}
    />
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1E73D8]">{label}</p>
    <p className="mt-3 font-heading text-3xl font-black tabular-nums text-[#0B3C5D]">{value}</p>
    {hint ? <p className="mt-2 text-xs font-medium text-[#1E73D8]/80">{hint}</p> : null}
  </div>
);

const shortcutLinks = [
  { to: "/admin/teachers/add", label: "Add teacher", desc: "Onboard faculty", icon: FiUsers },
  { to: "/admin/teachers", label: "Manage teachers", desc: "Directory & roles", icon: FiUsers },
  { to: "/admin/booking-window", label: "Booking window", desc: "Policy & slots", icon: FiClock },
  { to: "/admin/roster", label: "Student roster", desc: "Grades & batches", icon: FiClipboard },
  { to: "/admin/bookings", label: "All bookings", desc: "Full timeline", icon: FiCalendar },
];

export const AdminDashboardPage = () => {
  const { pushToast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [weekdayStats, setWeekdayStats] = useState(null);
  const [weekdayLoading, setWeekdayLoading] = useState(true);
  const [weekdaySplit, setWeekdaySplit] = useState("grade");
  const [modal, setModal] = useState({ open: false, title: "", rows: [] });
  const [detailLoading, setDetailLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminService.getBookingDashboardStats({ month: selectedMonth });
      setStats(data.data);
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Could not load dashboard stats",
        variant: "error",
      });
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [pushToast, selectedMonth]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const loadWeekdayStats = useCallback(async () => {
    setWeekdayLoading(true);
    try {
      const { data } = await adminService.getBookingWeekdayStats({ month: selectedMonth });
      setWeekdayStats(data.data ?? null);
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Could not load weekday breakdown",
        variant: "error",
      });
      setWeekdayStats(null);
    } finally {
      setWeekdayLoading(false);
    }
  }, [pushToast, selectedMonth]);

  useEffect(() => {
    void loadWeekdayStats();
  }, [loadWeekdayStats]);

  const weekdayChartProps = useMemo(() => {
    if (!weekdayStats?.weekdays) return { weekdays: [], series: [] };
    const series =
      weekdaySplit === "grade" ? weekdayStats.byGrade?.series ?? [] : weekdayStats.byBatch?.series ?? [];
    return { weekdays: weekdayStats.weekdays, series };
  }, [weekdayStats, weekdaySplit]);

  const gradeRows = useMemo(() => {
    if (!stats?.byGrade?.length) return [];
    return stats.byGrade.map((g) => ({
      key: `g-${g.grade}`,
      label: `Grade ${g.grade}`,
      count: g.count,
      drill: { type: "grade", grade: g.grade },
    }));
  }, [stats]);

  const batchRows = useMemo(() => {
    if (!stats?.byBatch?.length) return [];
    return stats.byBatch.map((b) => ({
      key: b.segmentKey,
      label: b.batchName,
      count: b.count,
      drill: { type: "batch", segmentKey: b.segmentKey },
    }));
  }, [stats]);

  const openDrillDown = async (row) => {
    setDetailLoading(true);
    setModal({ open: true, title: row.label, rows: [] });
    try {
      const params =
        row.drill.type === "grade"
          ? { grade: row.drill.grade, month: selectedMonth }
          : { segmentKey: row.drill.segmentKey, month: selectedMonth };
      const { data } = await adminService.listBookings(params);
      const bundle = data.data;
      const drillRows = Array.isArray(bundle?.items)
        ? bundle.items
        : Array.isArray(bundle)
          ? bundle
          : [];
      setModal({
        open: true,
        title: `${row.label} — scheduled meetings`,
        rows: drillRows,
      });
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Could not load bookings",
        variant: "error",
      });
      setModal({ open: false, title: "", rows: [] });
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-[#8BBCEB]/30 bg-[#FFFFFF]">
        <Loader label="Loading dashboard…" variant="admin" />
      </div>
    );
  }

  const total = stats?.scheduledTotal ?? 0;
  const completedTotal = stats?.completedTotal ?? 0;
  const cancelledTotal = stats?.cancelledTotal ?? 0;
  const gradeCount = gradeRows.length;
  const batchCount = batchRows.length;
  const maxGradeCount = gradeRows.reduce((m, r) => Math.max(m, r.count), 0);
  const topGradeLabel =
    gradeRows.find((r) => r.count === maxGradeCount)?.label?.replace(/^Grade\s+/i, "Gr. ") ?? "—";
  const concentration =
    total > 0 && maxGradeCount > 0 ? Math.round((maxGradeCount / total) * 100) : 0;

  return (
    <div className="space-y-8 pb-4 font-[Inter,ui-sans-serif,system-ui,sans-serif]">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B3C5D] via-[#1E73D8] to-[#8BBCEB] p-8 text-[#FFFFFF] shadow-[0_24px_56px_-20px_rgba(11,60,93,0.45)]">
        <PatternBg />
        <div
          className="pointer-events-none absolute -bottom-16 right-0 h-48 w-48 rounded-full bg-[#F4D35E]/20 blur-2xl"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#F4D35E]">
              Command center
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight md:text-4xl">
              Booking intelligence
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#FFFFFF]/95">
              Scheduled sessions across roster grades and booking channels. Click any chart segment
              to open the live list for that slice.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 rounded-full border border-[#FFFFFF]/25 bg-[#FFFFFF]/10 px-3 py-1.5 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#25D366]" />
                </span>
                <span className="text-xs font-semibold text-[#8BBCEB]">Metrics synced</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#F4D35E]">
                <FiGrid className="h-4 w-4" />
                Drill-down ready
              </div>
              <label className="flex items-center gap-2 rounded-full border border-[#FFFFFF]/30 bg-[#FFFFFF]/10 px-3 py-1.5 text-xs font-semibold text-[#FFFFFF]">
                <span className="text-[#8BBCEB]">Month</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="rounded bg-transparent text-xs font-bold text-[#FFFFFF] outline-none"
                />
              </label>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:min-w-[220px]">
            <div className="rounded-2xl border border-[#FFFFFF]/25 bg-[#FFFFFF]/10 p-6 text-center backdrop-blur-md sm:flex-1 lg:flex-none">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F4D35E]">
                Scheduled
              </p>
              <p className="mt-2 font-heading text-5xl font-black tabular-nums leading-none">
                {total}
              </p>
              <p className="mt-2 text-[11px] font-medium text-[#8BBCEB]">Active bookings only</p>
            </div>
            <div className="rounded-2xl border border-[#F4D35E]/40 bg-[#0B3C5D]/40 p-5 backdrop-blur-md sm:flex-1 lg:flex-none">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F4D35E]">
                Top focus
              </p>
              <p className="mt-2 text-lg font-bold text-[#FFFFFF]">{topGradeLabel}</p>
              <p className="mt-1 text-xs text-[#8BBCEB]">
                {concentration > 0 ? `${concentration}% of total volume` : "—"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiTile
          label="Meetings scheduled"
          value={total}
          hint="Status = scheduled"
          accent="bg-[#1E73D8]"
        />
        <KpiTile
          label="Completed bookings"
          value={completedTotal}
          hint="Status = completed (selected month)"
          accent="bg-[#25D366]"
        />
        <KpiTile
          label="Grade segments"
          value={gradeCount}
          hint="Distinct learner grades"
          accent="bg-[#8BBCEB]"
        />
        <KpiTile
          label="Batch channels"
          value={batchCount}
          hint="Roster & app sources"
          accent="bg-[#F4D35E]"
        />
        <KpiTile
          label="Cancelled bookings"
          value={cancelledTotal}
          hint="Status = cancelled"
          accent="bg-[#94A3B8]"
        />
      </div>

      <div>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="font-heading text-sm font-bold uppercase tracking-[0.18em] text-[#0B3C5D]">
              Shortcuts
            </h3>
            <p className="mt-1 text-xs font-medium text-[#1E73D8]">Jump to the tools you use most</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {shortcutLinks.map((link) => {
            const IconComp = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#8BBCEB]/40 bg-[#FFFFFF] p-4 shadow-[0_8px_24px_-12px_rgba(11,60,93,0.2)] transition hover:border-[#1E73D8]/50 hover:shadow-[0_16px_40px_-16px_rgba(30,115,216,0.35)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#0B3C5D] transition group-hover:bg-[#F4D35E]/35">
                    <IconComp className="h-5 w-5" />
                  </span>
                  <FiArrowUpRight className="h-4 w-4 shrink-0 text-[#8BBCEB] transition group-hover:text-[#1E73D8]" />
                </div>
                <p className="mt-3 font-heading text-sm font-bold text-[#0B3C5D]">{link.label}</p>
                <p className="mt-1 text-xs font-medium text-[#1E73D8]/85">{link.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-3xl border border-[#8BBCEB]/35 bg-[#FFFFFF] p-6 shadow-[0_12px_40px_-24px_rgba(11,60,93,0.3)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F5F5F5] pb-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#0B3C5D]">By grade (learner)</h3>
              <p className="mt-1 text-xs font-medium text-[#1E73D8]">
                Learner grade from roster or student profile
              </p>
            </div>
            <span className="rounded-full bg-[#F4D35E]/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0B3C5D]">
              Pie + bars
            </span>
          </div>
          {!gradeRows.length ? (
            <p className="text-sm font-medium text-[#1E73D8]/80">No scheduled bookings with a known grade.</p>
          ) : (
            <>
              <GradeBookingsPie rows={gradeRows} onSelectRow={openDrillDown} palette="admin" />
              <HorizontalBookingsBar rows={gradeRows} onSelectRow={openDrillDown} palette="admin" />
            </>
          )}
        </section>

        <section className="space-y-4 rounded-3xl border border-[#8BBCEB]/35 bg-[#FFFFFF] p-6 shadow-[0_12px_40px_-24px_rgba(11,60,93,0.3)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F5F5F5] pb-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#0B3C5D]">By batch / channel</h3>
              <p className="mt-1 text-xs font-medium text-[#1E73D8]">
                Roster batch vs logged-in student app
              </p>
            </div>
            <span className="rounded-full bg-[#25D366]/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0B3C5D]">
              Horizontal
            </span>
          </div>
          {!batchRows.length ? (
            <p className="text-sm font-medium text-[#1E73D8]/80">No scheduled bookings yet.</p>
          ) : (
            <HorizontalBookingsBar rows={batchRows} onSelectRow={openDrillDown} palette="admin" />
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-[#8BBCEB]/35 bg-[#FFFFFF] p-6 shadow-[0_12px_40px_-24px_rgba(11,60,93,0.3)]">
        <div className="flex flex-col gap-4 border-b border-[#F5F5F5] pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-lg font-bold text-[#0B3C5D]">By weekday (IST)</h3>
            <p className="mt-1 text-xs font-medium text-[#1E73D8]">
              Stacked counts by Mon–Sun using each session&apos;s start time in{" "}
              <span className="font-bold text-[#0B3C5D]">Asia/Kolkata</span>. Includes scheduled, completed, and
              no-show outcomes; excludes cancelled.
            </p>
            {weekdayStats?.window ? (
              <p className="mt-2 text-[11px] font-semibold leading-relaxed text-[#0B3C5D]/85">
                {weekdayStats.window.month
                  ? `Month ${weekdayStats.window.month} (IST): `
                  : `Rolling ${weekdayStats.window.days} IST calendar days: `}
                <span className="font-mono">{weekdayStats.window.fromYmd}</span> →{" "}
                <span className="font-mono">{weekdayStats.window.toYmd}</span>
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2 rounded-xl border border-[#8BBCEB]/40 bg-[#F5F5F5]/80 p-1">
            <button
              type="button"
              onClick={() => setWeekdaySplit("grade")}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                weekdaySplit === "grade"
                  ? "bg-[#1E73D8] text-[#FFFFFF] shadow-sm"
                  : "text-[#0B3C5D] hover:bg-[#FFFFFF]/80"
              }`}
            >
              By grade
            </button>
            <button
              type="button"
              onClick={() => setWeekdaySplit("batch")}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                weekdaySplit === "batch"
                  ? "bg-[#1E73D8] text-[#FFFFFF] shadow-sm"
                  : "text-[#0B3C5D] hover:bg-[#FFFFFF]/80"
              }`}
            >
              By batch / channel
            </button>
          </div>
        </div>
        <div className="pt-5">
          {weekdayLoading ? (
            <div className="flex justify-center py-12">
              <Loader label="Loading weekday chart…" variant="admin" />
            </div>
          ) : (
            <WeekdayStackedBookingsBar
              weekdays={weekdayChartProps.weekdays}
              series={weekdayChartProps.series}
              palette="admin"
            />
          )}
        </div>
      </section>

      <InfoModal
        open={modal.open}
        title={modal.title}
        tone="admin"
        onClose={() => setModal({ open: false, title: "", rows: [] })}
      >
        {detailLoading ? (
          <div className="flex justify-center py-10">
            <Loader label="Loading…" variant="admin" />
          </div>
        ) : !modal.rows.length ? (
          <p className="text-sm font-medium text-[#1E73D8]/85">No bookings in this segment.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#F5F5F5] bg-[#F5F5F5]/50">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#8BBCEB]/40 text-[11px] uppercase tracking-wide text-[#0B3C5D]">
                  <th className="bg-[#FFFFFF] py-3 pl-4 pr-3 font-bold">Learner</th>
                  <th className="bg-[#FFFFFF] py-3 pr-3 font-bold">Grade</th>
                  <th className="bg-[#FFFFFF] py-3 pr-3 font-bold">Channel</th>
                  <th className="bg-[#FFFFFF] py-3 pr-3 font-bold">Teacher</th>
                  <th className="bg-[#FFFFFF] py-3 pr-3 font-bold">When (start)</th>
                  <th className="bg-[#FFFFFF] py-3 pr-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {modal.rows.map((r) => (
                  <tr
                    key={r._id}
                    className="border-b border-[#8BBCEB]/25 bg-[#FFFFFF] transition hover:bg-[#F4D35E]/10"
                  >
                    <td className="py-3 pl-4 pr-3 font-semibold text-[#0B3C5D]">{r.learnerName || "—"}</td>
                    <td className="py-3 pr-3 font-medium text-[#1E73D8]">{r.learnerGrade ?? "—"}</td>
                    <td className="py-3 pr-3 text-[#0B3C5D]">
                      {r.bookingKind === "roster" ? "Open booking" : "Student app"}
                      {r.batchId ? (
                        <span className="ml-1 text-xs font-medium text-[#8BBCEB]">· {r.batchId}</span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 font-medium text-[#1E73D8]">{r.teacherName || "—"}</td>
                    <td className="py-3 pr-3 text-[#0B3C5D]">{formatWhen(r.startTime)}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${bookingStatusChipClassName(r.status, { rescheduledAt: r.rescheduledAt })}`}
                      >
                        {formatBookingStatusLabel(r.status, { rescheduledAt: r.rescheduledAt })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </InfoModal>
    </div>
  );
};
