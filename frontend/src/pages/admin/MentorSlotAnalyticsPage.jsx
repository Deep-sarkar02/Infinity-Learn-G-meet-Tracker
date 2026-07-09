import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiChevronDown, FiChevronUp, FiDownload, FiSearch } from "react-icons/fi";
import { Loader } from "../../components/ui/Loader";
import { EmptyState } from "../../components/ui/EmptyState";
import { AdminPageHero, AdminPanel } from "../../components/admin/AdminPageChrome";
import { adminService } from "../../services/admin.service";
import { useToast } from "../../hooks/useToast";
import { downloadMentorSlotReportPdf } from "../../utils/mentorSlotReportPdf";
import { getWeeksInMonth, formatWeekOptionLabel } from "../../utils/istMonthWeeks";

const currentMonthYyyyMm = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const KpiTile = ({ label, value, hint, accent }) => (
  <div className="relative overflow-hidden rounded-2xl border border-[#8BBCEB]/35 bg-[#FFFFFF] p-4 shadow-[0_8px_24px_-12px_rgba(11,60,93,0.2)]">
    <div className={`pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-[0.12] ${accent}`} />
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1E73D8]">{label}</p>
    <p className="mt-2 font-heading text-2xl font-black tabular-nums text-[#0B3C5D]">{value}</p>
    {hint ? <p className="mt-1 text-[11px] font-medium text-[#1E73D8]/80">{hint}</p> : null}
  </div>
);

const SORT_KEYS = [
  "teacherName",
  "slotsOffered",
  "slotsBooked",
  "slotsUnbooked",
  "bookingRatePercent",
  "completed",
  "studentDidNotJoin",
  "teacherDidNotJoin",
  "cancelled",
];

const SORT_LABELS = {
  teacherName: "Mentor",
  slotsOffered: "Offered",
  slotsBooked: "Booked",
  slotsUnbooked: "Unbooked",
  bookingRatePercent: "Booking %",
  completed: "Completed",
  studentDidNotJoin: "Student no-show",
  teacherDidNotJoin: "Teacher no-show",
  cancelled: "Cancelled",
};

const mentorMatchesSearch = (row, query) => {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return true;
  const name = String(row.teacherName ?? "").toLowerCase();
  const email = String(row.teacherEmail ?? "").toLowerCase();
  return name.includes(q) || email.includes(q);
};

export const MentorSlotAnalyticsPage = () => {
  const { pushToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMonth, setSelectedMonth] = useState(
    () => searchParams.get("month") || currentMonthYyyyMm(),
  );
  const [selectedWeek, setSelectedWeek] = useState(() => searchParams.get("week") || "");
  const prevMonthRef = useRef(selectedMonth);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [sortKey, setSortKey] = useState("slotsOffered");
  const [sortDir, setSortDir] = useState("desc");
  const [downloadingTeacherId, setDownloadingTeacherId] = useState(null);
  const [mentorSearch, setMentorSearch] = useState("");

  const weeksInMonth = useMemo(
    () => stats?.weeksInMonth ?? getWeeksInMonth(selectedMonth),
    [stats?.weeksInMonth, selectedMonth],
  );

  const isWeekView = Boolean(selectedWeek);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month: selectedMonth };
      if (selectedWeek) params.week = selectedWeek;
      const { data } = await adminService.getMentorSlotStats(params);
      setStats(data.data ?? null);
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Could not load slot analytics",
        variant: "error",
      });
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [pushToast, selectedMonth, selectedWeek]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (prevMonthRef.current !== selectedMonth) {
      setSelectedWeek("");
      prevMonthRef.current = selectedMonth;
    }
  }, [selectedMonth]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("month", selectedMonth);
        if (selectedWeek) next.set("week", selectedWeek);
        else next.delete("week");
        return next;
      },
      { replace: true },
    );
  }, [selectedMonth, selectedWeek, setSearchParams]);

  const sortedTeachers = useMemo(() => {
    const rows = stats?.byTeacher ?? [];
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" || typeof bv === "string") {
        return dir * String(av).localeCompare(String(bv));
      }
      return dir * ((Number(av) || 0) - (Number(bv) || 0));
    });
  }, [stats, sortKey, sortDir]);

  const filteredTeachers = useMemo(
    () => sortedTeachers.filter((row) => mentorMatchesSearch(row, mentorSearch)),
    [sortedTeachers, mentorSearch],
  );

  const hasMentorSearch = mentorSearch.trim().length > 0;

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "teacherName" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ column }) => {
    if (sortKey !== column) return null;
    return sortDir === "asc" ? (
      <FiChevronUp className="inline h-3.5 w-3.5" />
    ) : (
      <FiChevronDown className="inline h-3.5 w-3.5" />
    );
  };

  const totals = stats?.totals;
  const periodHint = isWeekView ? "Selected week (IST)" : "Selected month (IST)";
  const offeredHint = isWeekView
    ? "Time slots mentors published this week"
    : "Time slots mentors published this month";

  const handleDownloadReport = async (row) => {
    setDownloadingTeacherId(row.teacherId);
    try {
      const params = { month: selectedMonth };
      if (selectedWeek) params.week = selectedWeek;
      const { data } = await adminService.getMentorSlotReport(row.teacherId, params);
      await downloadMentorSlotReportPdf(data.data);
      pushToast({ title: "Report downloaded", variant: "success" });
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Could not generate report",
        variant: "error",
      });
    } finally {
      setDownloadingTeacherId(null);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-[#8BBCEB]/30 bg-[#FFFFFF]">
        <Loader label="Loading slot analytics…" variant="admin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4 font-[Inter,ui-sans-serif,system-ui,sans-serif]">
      <AdminPageHero
        eyebrow="Mentor capacity"
        title="Slot analytics"
        description={
          isWeekView
            ? "Weekly view within the selected month — slots mentors published, bookings, and no-show outcomes. All times use Asia/Kolkata."
            : "Monthly view of slots mentors published, how many were booked, and no-show outcomes. Switch to a week for a narrower IST window."
        }
      >
        <label className="flex items-center gap-2 rounded-full border border-[#FFFFFF]/30 bg-[#FFFFFF]/10 px-3 py-1.5 text-xs font-semibold text-[#FFFFFF]">
          <span className="text-[#8BBCEB]">Month</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="rounded bg-transparent text-xs font-bold text-[#FFFFFF] outline-none"
          />
        </label>
        <label className="flex items-center gap-2 rounded-full border border-[#FFFFFF]/30 bg-[#FFFFFF]/10 px-3 py-1.5 text-xs font-semibold text-[#FFFFFF]">
          <span className="text-[#8BBCEB]">Period</span>
          <select
            value={selectedWeek}
            onChange={(event) => setSelectedWeek(event.target.value)}
            className="max-w-[11rem] rounded bg-transparent text-xs font-bold text-[#FFFFFF] outline-none"
          >
            <option value="" className="text-[#0B3C5D]">
              Full month
            </option>
            {weeksInMonth.map((week) => (
              <option key={week.week} value={String(week.week)} className="text-[#0B3C5D]">
                {formatWeekOptionLabel(week)}
              </option>
            ))}
          </select>
        </label>
      </AdminPageHero>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiTile
          label="Slots offered"
          value={totals?.slotsOffered ?? 0}
          hint={offeredHint}
          accent="bg-[#1E73D8]"
        />
        <KpiTile
          label="Booked"
          value={totals?.slotsBooked ?? 0}
          hint="Reserved by students (excludes cancelled)"
          accent="bg-[#25D366]"
        />
        <KpiTile
          label="Unbooked"
          value={totals?.slotsUnbooked ?? 0}
          hint="Offered slots still open"
          accent="bg-[#8BBCEB]"
        />
        <KpiTile
          label="Booking rate"
          value={`${totals?.bookingRatePercent ?? 0}%`}
          hint="Booked ÷ offered"
          accent="bg-[#F4D35E]"
        />
        <KpiTile
          label="Student did not join"
          value={totals?.studentDidNotJoin ?? 0}
          hint="Sessions marked after class time"
          accent="bg-[#F59E0B]"
        />
        <KpiTile
          label="Teacher did not join"
          value={totals?.teacherDidNotJoin ?? 0}
          hint="Sessions marked after class time"
          accent="bg-[#EF4444]"
        />
      </div>

      <AdminPanel>
        <div className="mb-4 flex flex-col gap-3 border-b border-[#F5F5F5] pb-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold text-[#0B3C5D]">By mentor</h2>
              <p className="mt-1 text-xs font-medium text-[#1E73D8]">
                {stats?.fromYmd && stats?.toYmd
                  ? `${stats.fromYmd} — ${stats.toYmd} (${periodHint})`
                  : "Selected period"}
                {isWeekView && stats?.week ? (
                  <span className="ml-2 rounded-full bg-[#F4D35E]/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0B3C5D]">
                    Week {stats.week}
                  </span>
                ) : null}
              </p>
            </div>
            {loading ? (
              <span className="text-xs font-medium text-[#1E73D8]">Refreshing…</span>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <FiSearch
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8BBCEB]"
                aria-hidden
              />
              <input
                type="search"
                value={mentorSearch}
                onChange={(event) => setMentorSearch(event.target.value)}
                placeholder="Search mentor name or email…"
                className="w-full rounded-xl border border-[#8BBCEB]/45 bg-[#FFFFFF] py-2.5 pl-9 pr-3 text-sm text-[#0B3C5D] outline-none transition placeholder:text-[#1E73D8]/40 focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/30"
                aria-label="Search mentors"
              />
            </div>
            {hasMentorSearch && sortedTeachers.length ? (
              <p className="text-[10px] font-semibold text-[#1E73D8]/85">
                Showing {filteredTeachers.length} of {sortedTeachers.length} mentor
                {sortedTeachers.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
        </div>

        {!sortedTeachers.length ? (
          <EmptyState
            title={isWeekView ? "No mentor slots this week" : "No mentor slots this month"}
            description={
              isWeekView
                ? "No availability slots fall in the selected week. Try another week or full month."
                : "Mentors have not published availability slots for the selected month yet."
            }
          />
        ) : !filteredTeachers.length ? (
          <EmptyState
            title="No mentors match your search"
            description="Try a different mentor name or clear the search field."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#E8F2FC] text-[10px] font-bold uppercase tracking-wider text-[#1E73D8]">
                  {SORT_KEYS.map((key) => (
                    <th key={key} className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSort(key)}
                        className="inline-flex items-center gap-1 hover:text-[#0B3C5D]"
                      >
                        {SORT_LABELS[key]}
                        <SortIcon column={key} />
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((row) => (
                  <tr
                    key={row.teacherId}
                    className="border-b border-[#F5F5F5] transition hover:bg-[#F8FBFF]"
                  >
                    <td className="px-3 py-2.5 font-semibold text-[#0B3C5D]">{row.teacherName}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[#0B3C5D]">{row.slotsOffered}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[#0B3C5D]">{row.slotsBooked}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[#0B3C5D]">{row.slotsUnbooked}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[#0B3C5D]">{row.bookingRatePercent}%</td>
                    <td className="px-3 py-2.5 tabular-nums text-[#0B3C5D]">{row.completed}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[#0B3C5D]">{row.studentDidNotJoin}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[#0B3C5D]">{row.teacherDidNotJoin}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[#0B3C5D]">{row.cancelled}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => void handleDownloadReport(row)}
                        disabled={downloadingTeacherId === row.teacherId}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#8BBCEB]/50 bg-[#F8FBFF] px-2.5 py-1.5 text-xs font-bold text-[#0B3C5D] transition hover:border-[#1E73D8]/50 hover:bg-[#FFFFFF] disabled:opacity-60"
                      >
                        <FiDownload className="h-3.5 w-3.5" />
                        {downloadingTeacherId === row.teacherId ? "…" : "PDF"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </div>
  );
};
