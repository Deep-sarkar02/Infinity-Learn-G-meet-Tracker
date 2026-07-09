import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCalendar, FiSearch } from "react-icons/fi";
import { Button } from "../../components/ui/Button";
import { Loader } from "../../components/ui/Loader";
import { EmptyState } from "../../components/ui/EmptyState";
import { BookingHero, BookingPanel, TeacherPageShell } from "../../components/teacher/TeacherWorkspaceChrome";
import { teacherService } from "../../services/teacher.service";
import { useToast } from "../../hooks/useToast";
import { toTimeLabel } from "../../utils/date";
import { bookingStatusChipClassName, formatBookingStatusLabel } from "../../utils/bookingStatus";

const formatRange = (fromIso, toIso) => {
  try {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    return `${from.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} → ${to.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
  } catch {
    return "";
  }
};

const rowMatchesSearch = (row, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const statusLabel = formatBookingStatusLabel(row.status, { rescheduledAt: row.rescheduledAt });
  const haystack = [
    row.learnerName,
    row.learnerUserId,
    row.learnerGrade,
    row.bookingKind,
    row.contactEmail,
    row.learnerMobile,
    statusLabel,
    row.status,
    toTimeLabel(row.startTime),
    toTimeLabel(row.endTime),
    row.date,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
};

export const TeacherBookingHistoryPage = () => {
  const { pushToast } = useToast();
  const [windowKey, setWindowKey] = useState("all");
  const [search, setSearch] = useState("");
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await teacherService.getTeacherBookingHistory({ window: windowKey });
      setPayload(data.data);
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Could not load history",
        variant: "error",
      });
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [windowKey, pushToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChange = () => void load();
    window.addEventListener("il:teacher-booking-status-changed", onChange);
    return () => window.removeEventListener("il:teacher-booking-status-changed", onChange);
  }, [load]);

  useEffect(() => {
    setSearch("");
  }, [windowKey]);

  const rows = payload?.bookings ?? [];
  const filteredRows = useMemo(
    () => rows.filter((row) => rowMatchesSearch(row, search)),
    [rows, search],
  );
  const hasSearch = search.trim().length > 0;

  return (
    <TeacherPageShell>
      <BookingHero
        eyebrow="Instructor workspace"
        title="Booking history"
        description="All bookings plus weekly and monthly views. Times shown in IST."
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFFFFF]/25 bg-[#FFFFFF]/10 px-2.5 py-1 text-[10px] font-semibold text-[#F4D35E]">
          <FiCalendar className="h-3.5 w-3.5" aria-hidden />
          Overview
        </span>
      </BookingHero>

      <BookingPanel className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F5F5F5] pb-3">
          <div className="flex flex-wrap gap-1 rounded-lg border border-[#8BBCEB]/40 bg-[#F5F5F5]/80 p-0.5">
            <button
              type="button"
              onClick={() => setWindowKey("all")}
              className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition ${
                windowKey === "all"
                  ? "bg-[#1E73D8] text-[#FFFFFF] shadow-sm"
                  : "text-[#0B3C5D] hover:bg-[#FFFFFF]/80"
              }`}
            >
              All bookings
            </button>
            <button
              type="button"
              onClick={() => setWindowKey("week")}
              className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition ${
                windowKey === "week"
                  ? "bg-[#1E73D8] text-[#FFFFFF] shadow-sm"
                  : "text-[#0B3C5D] hover:bg-[#FFFFFF]/80"
              }`}
            >
              This week (IST)
            </button>
            <button
              type="button"
              onClick={() => setWindowKey("month")}
              className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition ${
                windowKey === "month"
                  ? "bg-[#1E73D8] text-[#FFFFFF] shadow-sm"
                  : "text-[#0B3C5D] hover:bg-[#FFFFFF]/80"
              }`}
            >
              This month (IST)
            </button>
          </div>
          <Button type="button" variant="adminSecondary" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        </div>

        <div className="relative">
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8BBCEB]"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by learner, user ID, grade, status, email, or phone…"
            className="w-full rounded-lg border border-[#8BBCEB]/45 bg-[#FFFFFF] py-2 pl-9 pr-3 text-xs text-[#0B3C5D] outline-none transition placeholder:text-[#1E73D8]/40 focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/30"
            aria-label="Search bookings"
          />
        </div>

        {hasSearch && rows.length ? (
          <p className="text-[10px] font-semibold text-[#1E73D8]/85">
            Showing {filteredRows.length} of {rows.length} booking{rows.length === 1 ? "" : "s"}
          </p>
        ) : null}

        {payload?.from && payload?.to ? (
          <p className="text-xs font-semibold text-[#1E73D8]/90">{formatRange(payload.from, payload.to)}</p>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader label="Loading history…" variant="admin" />
          </div>
        ) : !filteredRows.length ? (
          <EmptyState
            tone="admin"
            title={hasSearch ? "No bookings match your search" : windowKey === "all" ? "No bookings yet" : "No sessions in this range"}
            description={
              hasSearch
                ? "Try a different name, user ID, email, phone number, or status."
                : windowKey === "all"
                  ? "When students book sessions with you, they will appear here with learner names and contact details."
                  : "Bookings for the selected period will appear here with learner names and contact details."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#8BBCEB]/30">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#8BBCEB]/40 bg-[#F5F5F5] text-[10px] uppercase tracking-wide text-[#0B3C5D]">
                  <th className="px-2 py-2 font-bold">When (IST)</th>
                  <th className="px-2 py-2 font-bold">Status</th>
                  <th className="px-2 py-2 font-bold">Learner</th>
                  <th className="px-2 py-2 font-bold">User ID</th>
                  <th className="px-2 py-2 font-bold">Grade</th>
                  <th className="px-2 py-2 font-bold">Channel</th>
                  <th className="px-2 py-2 font-bold">Contact</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#8BBCEB]/20 bg-[#FFFFFF] last:border-0 hover:bg-[#F4D35E]/10"
                  >
                    <td className="px-2 py-2 align-top font-medium text-[#0B3C5D]">
                      <div>
                        {toTimeLabel(row.startTime)} – {toTimeLabel(row.endTime)}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <span
                        className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold ${bookingStatusChipClassName(row.status, { rescheduledAt: row.rescheduledAt })}`}
                      >
                        {formatBookingStatusLabel(row.status, { rescheduledAt: row.rescheduledAt })}
                      </span>
                    </td>
                    <td className="px-2 py-2 align-top font-semibold text-[#0B3C5D]">{row.learnerName}</td>
                    <td className="px-2 py-2 align-top font-medium text-[#0B3C5D]/90">{row.learnerUserId || "—"}</td>
                    <td className="px-2 py-2 align-top text-[#1E73D8]">{row.learnerGrade ?? "—"}</td>
                    <td className="px-2 py-2 align-top capitalize text-[#1E73D8]/90">{row.bookingKind || "—"}</td>
                    <td className="px-2 py-2 align-top text-[10px] text-[#0B3C5D]/90">
                      {row.contactEmail ? <div>{row.contactEmail}</div> : null}
                      {row.learnerMobile ? <div className="mt-1 font-medium">{row.learnerMobile}</div> : null}
                      {!row.contactEmail && !row.learnerMobile ? "—" : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BookingPanel>
    </TeacherPageShell>
  );
};
