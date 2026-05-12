import { useCallback, useEffect, useState } from "react";
import { FiCalendar } from "react-icons/fi";
import { Button } from "../../components/ui/Button";
import { Loader } from "../../components/ui/Loader";
import { EmptyState } from "../../components/ui/EmptyState";
import { BookingHero, BookingPanel } from "../../components/teacher/TeacherWorkspaceChrome";
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

export const TeacherBookingHistoryPage = () => {
  const { pushToast } = useToast();
  const [windowKey, setWindowKey] = useState("week");
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

  const rows = payload?.bookings ?? [];

  return (
    <div className="mx-auto max-w-[960px] space-y-8 xl:max-w-[1024px]">
      <BookingHero
        eyebrow="Instructor workspace"
        title="Booking history"
        description="Weekly and monthly views of sessions assigned to you, with learner details. Times shown in IST."
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-[#FFFFFF]/25 bg-[#FFFFFF]/10 px-3 py-1.5 text-xs font-semibold text-[#F4D35E]">
          <FiCalendar className="h-4 w-4" aria-hidden />
          Overview
        </span>
      </BookingHero>

      <BookingPanel className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F5F5F5] pb-4">
          <div className="flex gap-2 rounded-xl border border-[#8BBCEB]/40 bg-[#F5F5F5]/80 p-1">
            <button
              type="button"
              onClick={() => setWindowKey("week")}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
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
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
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
        {payload?.from && payload?.to ? (
          <p className="text-xs font-semibold text-[#1E73D8]/90">{formatRange(payload.from, payload.to)}</p>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader label="Loading history…" variant="admin" />
          </div>
        ) : !rows.length ? (
          <EmptyState
            tone="admin"
            title="No sessions in this range"
            description="Bookings for the selected period will appear here with learner names and contact details."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#8BBCEB]/30">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#8BBCEB]/40 bg-[#F5F5F5] text-[11px] uppercase tracking-wide text-[#0B3C5D]">
                  <th className="px-3 py-3 font-bold">When (IST)</th>
                  <th className="px-3 py-3 font-bold">Status</th>
                  <th className="px-3 py-3 font-bold">Learner</th>
                  <th className="px-3 py-3 font-bold">Grade</th>
                  <th className="px-3 py-3 font-bold">Channel</th>
                  <th className="px-3 py-3 font-bold">Contact</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#8BBCEB]/20 bg-[#FFFFFF] last:border-0 hover:bg-[#F4D35E]/10"
                  >
                    <td className="px-3 py-3 align-top font-medium text-[#0B3C5D]">
                      <div>
                        {toTimeLabel(row.startTime)} – {toTimeLabel(row.endTime)}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${bookingStatusChipClassName(row.status, { rescheduledAt: row.rescheduledAt })}`}
                      >
                        {formatBookingStatusLabel(row.status, { rescheduledAt: row.rescheduledAt })}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top font-semibold text-[#0B3C5D]">{row.learnerName}</td>
                    <td className="px-3 py-3 align-top text-[#1E73D8]">{row.learnerGrade ?? "—"}</td>
                    <td className="px-3 py-3 align-top capitalize text-[#1E73D8]/90">{row.bookingKind || "—"}</td>
                    <td className="px-3 py-3 align-top text-xs text-[#0B3C5D]/90">
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
    </div>
  );
};
