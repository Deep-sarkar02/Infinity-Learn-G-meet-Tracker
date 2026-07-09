import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiChevronLeft, FiChevronRight, FiDownload, FiRefreshCw, FiSearch } from "react-icons/fi";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { InfoModal } from "../../components/ui/InfoModal";
import { adminService } from "../../services/admin.service";
import { useToast } from "../../hooks/useToast";
import { AdminPageHero, AdminPanel } from "../../components/admin/AdminPageChrome";
import { bookingStatusChipClassName, formatBookingStatusLabel } from "../../utils/bookingStatus";
import { sanitizeBatchIdInput } from "../../utils/batchFields";
import { formatWeekOptionLabel, getWeeksInMonth } from "../../utils/istMonthWeeks";
import { downloadBookingsExcel } from "../../utils/exportBookingsExcel";

const PAGE_SIZE = 20;

const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const STATUS_FILTER_VALUES = [
  "scheduled",
  "cancelled",
  "completed",
  "student_did_not_join",
  "teacher_did_not_join",
];

const formatDateTime = (iso) => {
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

const ARTIFACT_DELAY_MINUTES = 10;
const ARTIFACT_RETRY_MINUTES = 10;
const ARTIFACT_UNAVAILABLE_HOURS =
  Number(import.meta.env.VITE_LSQ_ARTIFACTS_UNAVAILABLE_AFTER_HOURS) > 0
    ? Number(import.meta.env.VITE_LSQ_ARTIFACTS_UNAVAILABLE_AFTER_HOURS)
    : 24;
const ARTIFACT_UNAVAILABLE_AFTER_MS = ARTIFACT_UNAVAILABLE_HOURS * 60 * 60 * 1000;

const getArtifactsAvailableBy = (row) => {
  if (!row?.endTime || row?.recordingUrl || row?.transcriptUrl) return null;
  const endMs = new Date(row.endTime).getTime();
  if (Number.isNaN(endMs)) return null;

  let nextMs = endMs + ARTIFACT_DELAY_MINUTES * 60 * 1000;
  const lastSyncMs = row?.artifactsLastSyncedAt
    ? new Date(row.artifactsLastSyncedAt).getTime()
    : Number.NaN;
  if (!Number.isNaN(lastSyncMs)) {
    nextMs = Math.max(nextMs, lastSyncMs + ARTIFACT_RETRY_MINUTES * 60 * 1000);
  }
  return new Date(nextMs);
};

const formatAvailableByIst = (date) => {
  if (!date) return "—";
  return `Available by ${date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })} IST`;
};

const isPastArtifactDeadline = (endTimeIso) => {
  const endMs = new Date(endTimeIso).getTime();
  if (Number.isNaN(endMs)) return false;
  return Date.now() > endMs + ARTIFACT_UNAVAILABLE_AFTER_MS;
};

const getRecordingArtifactStatusText = (row) => {
  if (row.recordingUrl) return null;
  const past = isPastArtifactDeadline(row.endTime);
  const bothMissing = !row.recordingUrl && !row.transcriptUrl;
  if (past && bothMissing) {
    return `Not available: LSQ did not return recording or transcript within ${ARTIFACT_UNAVAILABLE_HOURS} hours of session end.`;
  }
  if (past && row.transcriptUrl) {
    return `Not available: no recording link from LSQ within ${ARTIFACT_UNAVAILABLE_HOURS} hours of session end.`;
  }
  return formatAvailableByIst(getArtifactsAvailableBy(row));
};

const getTranscriptArtifactStatusText = (row) => {
  if (row.transcriptUrl) return null;
  const past = isPastArtifactDeadline(row.endTime);
  const bothMissing = !row.recordingUrl && !row.transcriptUrl;
  if (past && bothMissing) {
    return `Not available: LSQ did not return recording or transcript within ${ARTIFACT_UNAVAILABLE_HOURS} hours of session end.`;
  }
  if (past && row.recordingUrl) {
    return `Not available: no transcript link from LSQ within ${ARTIFACT_UNAVAILABLE_HOURS} hours of session end.`;
  }
  return formatAvailableByIst(getArtifactsAvailableBy(row));
};

const artifactStatusTextIsUnavailable = (text) =>
  typeof text === "string" && text.startsWith("Not available:");

const DetailField = ({ label, children }) => (
  <div className="border-b border-[#F5F5F5] py-3 last:border-0">
    <p className="text-[10px] font-bold uppercase tracking-wide text-[#1E73D8]">{label}</p>
    <div className="mt-1 text-sm font-semibold text-[#0B3C5D]">{children}</div>
  </div>
);

export const AllBookingsPage = () => {
  const { pushToast } = useToast();
  const [searchParams] = useSearchParams();
  const urlFromYmd = searchParams.get("fromYmd") || "";
  const urlToYmd = searchParams.get("toYmd") || "";
  const urlMonth = searchParams.get("month") || "";
  const [rows, setRows] = useState([]);
  const [listMeta, setListMeta] = useState({ total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState("");
  const [batchIdFilter, setBatchIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateMode, setDateMode] = useState(() => (urlFromYmd && urlToYmd ? "custom" : "month"));
  const [monthFilter, setMonthFilter] = useState(() => urlMonth || (urlFromYmd ? urlFromYmd.slice(0, 7) : ""));
  const [weekFilter, setWeekFilter] = useState("");
  const [customFromYmd, setCustomFromYmd] = useState(urlFromYmd);
  const [customToYmd, setCustomToYmd] = useState(urlToYmd);
  const [teacherIdFilter, setTeacherIdFilter] = useState(() => searchParams.get("teacherId") || "");
  const [exportingExcel, setExportingExcel] = useState(false);
  const [detailRow, setDetailRow] = useState(null);
  const staleArtifactToastKeyRef = useRef(null);
  const prevMonthRef = useRef(monthFilter);

  const weeksInMonth = useMemo(() => getWeeksInMonth(monthFilter), [monthFilter]);

  useEffect(() => {
    if (prevMonthRef.current !== monthFilter) {
      setWeekFilter("");
      prevMonthRef.current = monthFilter;
    }
  }, [monthFilter]);

  useEffect(() => {
    setPage(1);
  }, [
    gradeFilter,
    batchIdFilter,
    statusFilter,
    searchQuery,
    dateMode,
    monthFilter,
    weekFilter,
    customFromYmd,
    customToYmd,
    teacherIdFilter,
  ]);

  const resolveDateApiParams = useCallback(() => {
    if (dateMode === "custom") {
      if (customFromYmd && customToYmd) {
        return { fromYmd: customFromYmd, toYmd: customToYmd };
      }
      return {};
    }
    if (monthFilter && weekFilter) {
      const week = weeksInMonth.find((w) => String(w.week) === weekFilter);
      if (week) {
        return { fromYmd: week.fromYmd, toYmd: week.toYmd };
      }
    }
    if (monthFilter) {
      return { month: monthFilter };
    }
    return {};
  }, [dateMode, customFromYmd, customToYmd, monthFilter, weekFilter, weeksInMonth]);

  const buildFilterParams = useCallback(() => {
    const params = {};
    if (gradeFilter) params.grade = gradeFilter;
    const batchTrim = sanitizeBatchIdInput(batchIdFilter).trim();
    if (batchTrim) params.batchId = batchTrim;
    if (statusFilter) params.status = statusFilter;
    const searchTrim = searchQuery.trim();
    if (searchTrim) params.search = searchTrim;
    Object.assign(params, resolveDateApiParams());
    if (teacherIdFilter) params.teacherId = teacherIdFilter;
    return params;
  }, [
    gradeFilter,
    batchIdFilter,
    statusFilter,
    searchQuery,
    resolveDateApiParams,
    teacherIdFilter,
  ]);

  const exportLabel = useMemo(() => {
    if (dateMode === "custom" && customFromYmd && customToYmd) {
      return `${customFromYmd}-to-${customToYmd}`;
    }
    if (monthFilter && weekFilter) {
      return `${monthFilter}-week-${weekFilter}`;
    }
    if (monthFilter) return monthFilter;
    return "all";
  }, [dateMode, customFromYmd, customToYmd, monthFilter, weekFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...buildFilterParams(), page, limit: PAGE_SIZE };
      const { data } = await adminService.listBookings(params);
      const bundle = data.data;
      const items = Array.isArray(bundle?.items) ? bundle.items : [];
      const total = typeof bundle?.total === "number" ? bundle.total : items.length;
      const totalPages =
        typeof bundle?.totalPages === "number"
          ? Math.max(1, bundle.totalPages)
          : Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
      setListMeta({ total, totalPages });
      setRows(items);
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Could not load bookings",
        variant: "error",
      });
      setRows([]);
      setListMeta({ total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams, page, pushToast]);

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const { data } = await adminService.listBookings(buildFilterParams());
      const bundle = data.data;
      const items = Array.isArray(bundle?.items) ? bundle.items : Array.isArray(bundle) ? bundle : [];
      if (!items.length) {
        pushToast({ title: "No bookings to export for current filters", variant: "warning" });
        return;
      }
      downloadBookingsExcel(items, { label: exportLabel });
      pushToast({
        title: `Exported ${items.length} booking${items.length === 1 ? "" : "s"} to Excel`,
        variant: "success",
      });
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Could not export bookings",
        variant: "error",
      });
    } finally {
      setExportingExcel(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading) return;
    if (listMeta.total <= 0) return;
    if (page > listMeta.totalPages) {
      setPage(listMeta.totalPages);
    }
  }, [loading, listMeta.total, listMeta.totalPages, page]);

  useEffect(() => {
    if (loading || !rows.length) return;
    const filterKey = `${gradeFilter}|${sanitizeBatchIdInput(batchIdFilter).trim()}`;
    const hasStaleBothMissing = rows.some(
      (r) => !r.recordingUrl && !r.transcriptUrl && isPastArtifactDeadline(r.endTime),
    );
    if (!hasStaleBothMissing) return;
    if (staleArtifactToastKeyRef.current === filterKey) return;
    staleArtifactToastKeyRef.current = filterKey;
    pushToast({
      title:
        `Some bookings still have no recording or transcript from LSQ more than ${ARTIFACT_UNAVAILABLE_HOURS} hours after the session ended. Those rows are marked Not available in the table.`,
      variant: "warning",
    });
  }, [loading, rows, gradeFilter, batchIdFilter, statusFilter, pushToast]);

  return (
    <div className="space-y-6 pb-4">
      <AdminPageHero
        eyebrow="Operations"
        title="All bookings"
        description="Filter by learner grade, roster batch ID, or booking status. Recording and transcript links are fetched automatically and shown here when available."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="adminSecondary"
            className="inline-flex items-center gap-2"
            onClick={() => void handleExportExcel()}
            disabled={loading || exportingExcel}
          >
            <FiDownload className={exportingExcel ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
            {exportingExcel ? "Exporting…" : "Download Excel"}
          </Button>
          <Button
            type="button"
            variant="adminSecondary"
            className="inline-flex items-center gap-2"
            onClick={load}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
        </div>
      </AdminPageHero>

      <AdminPanel className="space-y-5">
        <div className="flex flex-col gap-4 rounded-2xl border border-[#8BBCEB]/35 bg-[#F5F5F5] p-4">
          <div className="relative">
            <FiSearch
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8BBCEB]"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search learner, teacher, email, batch, grade, status, or booking ID…"
              className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] py-2.5 pl-10 pr-3 text-sm font-medium text-[#0B3C5D] outline-none transition placeholder:text-[#1E73D8]/40 focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
              aria-label="Search bookings"
            />
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
            <label className="block min-w-[10rem] space-y-1">
              <span className="text-sm font-semibold text-[#0B3C5D]">Filter by grade</span>
              <select
                className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm font-medium text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
              >
                <option value="">All grades</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </label>
            <div className="min-w-[12rem] flex-1 sm:max-w-xs">
              <Input
                tone="admin"
                label="Filter by batch ID"
                placeholder="e.g. B202401"
                value={batchIdFilter}
                maxLength={80}
                onChange={(e) => {
                  const v = sanitizeBatchIdInput(e.target.value);
                  setBatchIdFilter(v);
                }}
              />
            </div>
            <label className="block min-w-[12rem] space-y-1">
              <span className="text-sm font-semibold text-[#0B3C5D]">Filter by status</span>
              <select
                className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm font-medium text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                {STATUS_FILTER_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {formatBookingStatusLabel(s)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-[#8BBCEB]/30 bg-[#FFFFFF] p-4">
            <p className="text-sm font-semibold text-[#0B3C5D]">Filter by date (IST)</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDateMode("month")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  dateMode === "month"
                    ? "bg-[#1E73D8] text-[#FFFFFF] shadow-sm"
                    : "border border-[#8BBCEB]/50 bg-[#F8FBFF] text-[#0B3C5D] hover:border-[#1E73D8]/50"
                }`}
              >
                Month & week
              </button>
              <button
                type="button"
                onClick={() => setDateMode("custom")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  dateMode === "custom"
                    ? "bg-[#1E73D8] text-[#FFFFFF] shadow-sm"
                    : "border border-[#8BBCEB]/50 bg-[#F8FBFF] text-[#0B3C5D] hover:border-[#1E73D8]/50"
                }`}
              >
                Custom range
              </button>
            </div>

            {dateMode === "month" ? (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <label className="block min-w-[10rem] space-y-1">
                  <span className="text-xs font-semibold text-[#1E73D8]">Month</span>
                  <input
                    type="month"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm font-medium text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
                  />
                </label>
                <label className="block min-w-[12rem] flex-1 space-y-1 sm:max-w-sm">
                  <span className="text-xs font-semibold text-[#1E73D8]">Week in month</span>
                  <select
                    value={weekFilter}
                    onChange={(e) => setWeekFilter(e.target.value)}
                    disabled={!monthFilter}
                    className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm font-medium text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35 disabled:opacity-50"
                  >
                    <option value="">Full month</option>
                    {weeksInMonth.map((week) => (
                      <option key={week.week} value={String(week.week)}>
                        {formatWeekOptionLabel(week)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <label className="block min-w-[10rem] space-y-1">
                  <span className="text-xs font-semibold text-[#1E73D8]">From</span>
                  <input
                    type="date"
                    value={customFromYmd}
                    onChange={(e) => setCustomFromYmd(e.target.value)}
                    className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm font-medium text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
                  />
                </label>
                <label className="block min-w-[10rem] space-y-1">
                  <span className="text-xs font-semibold text-[#1E73D8]">To</span>
                  <input
                    type="date"
                    value={customToYmd}
                    onChange={(e) => setCustomToYmd(e.target.value)}
                    className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm font-medium text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
                  />
                </label>
              </div>
            )}
          </div>

          {teacherIdFilter ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#0B3C5D]">Mentor filter active</span>
              <button
                type="button"
                onClick={() => setTeacherIdFilter("")}
                className="rounded-lg border border-[#1E73D8]/40 bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#1E73D8] hover:bg-[#F8FBFF]"
              >
                Clear mentor filter
              </button>
            </div>
          ) : null}

          <p className="text-xs font-medium leading-relaxed text-[#1E73D8]/90">
            Search matches learner, teacher, emails, batch, grade, status, and booking ID. Date filters use
            session start time in <span className="font-bold text-[#0B3C5D]">Asia/Kolkata</span>.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader label="Loading bookings…" variant="admin" />
          </div>
        ) : !rows.length ? (
          <EmptyState
            tone="admin"
            title={
              gradeFilter ||
              sanitizeBatchIdInput(batchIdFilter).trim() ||
              statusFilter ||
              searchQuery.trim() ||
              monthFilter ||
              weekFilter ||
              (customFromYmd && customToYmd) ||
              teacherIdFilter
                ? "No bookings match these filters"
                : "No bookings yet"
            }
            description={
              gradeFilter ||
              sanitizeBatchIdInput(batchIdFilter).trim() ||
              statusFilter ||
              searchQuery.trim() ||
              monthFilter ||
              weekFilter ||
              (customFromYmd && customToYmd) ||
              teacherIdFilter
                ? "Try clearing or changing filters — data refreshes automatically when they change."
                : "Bookings appear here after students or roster learners reserve available slots."
            }
          />
        ) : (
          <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-[#8BBCEB]/30 bg-[#F5F5F5]/50">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#8BBCEB]/40 bg-[#FFFFFF] text-[11px] uppercase tracking-wide text-[#0B3C5D]">
                  <th className="px-3 py-3 font-bold">When</th>
                  <th className="px-3 py-3 font-bold">Status</th>
                  <th className="px-3 py-3 font-bold">Learner</th>
                  <th className="px-3 py-3 font-bold">Grade</th>
                  <th className="px-3 py-3 font-bold">Batch ID</th>
                  <th className="px-3 py-3 font-bold">Batch name</th>
                  <th className="px-3 py-3 font-bold">Teacher</th>
                  <th className="px-3 py-3 font-bold">Recording</th>
                  <th className="px-3 py-3 font-bold">Transcript</th>
                  <th className="px-3 py-3 font-bold">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const recordingArtifactText = getRecordingArtifactStatusText(row);
                  const transcriptArtifactText = getTranscriptArtifactStatusText(row);
                  return (
                  <tr
                    key={String(row._id)}
                    className="border-b border-[#8BBCEB]/25 bg-[#FFFFFF] transition last:border-0 hover:bg-[#F4D35E]/10"
                  >
                    <td className="px-3 py-3 align-top font-medium text-[#0B3C5D]">
                      <div>{formatDateTime(row.startTime)}</div>
                      <div className="text-xs font-medium text-[#1E73D8]/85">to {formatDateTime(row.endTime)}</div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${bookingStatusChipClassName(row.status, { rescheduledAt: row.rescheduledAt })}`}
                      >
                        {formatBookingStatusLabel(row.status, { rescheduledAt: row.rescheduledAt })}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="font-semibold text-[#0B3C5D]">{row.learnerName || "—"}</div>
                      <div className="text-xs font-medium capitalize text-[#1E73D8]">{row.bookingKind || "—"}</div>
                      {row.contactEmail ? (
                        <div className="text-xs font-medium text-[#8BBCEB]">{row.contactEmail}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 align-top font-medium text-[#1E73D8]">{row.learnerGrade ?? "—"}</td>
                    <td className="px-3 py-3 align-top font-mono text-xs font-medium text-[#0B3C5D]">
                      {row.batchId || "—"}
                    </td>
                    <td className="px-3 py-3 align-top text-[#0B3C5D]">{row.batchName || "—"}</td>
                    <td className="px-3 py-3 align-top">
                      <div className="font-semibold text-[#0B3C5D]">{row.teacherName || "—"}</div>
                      <div className="text-xs font-medium text-[#1E73D8]/85">
                        Teaches grade {row.teacherGrade ?? "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      {row.recordingUrl ? (
                        <a
                          href={row.recordingUrl}
                          className="inline-flex items-center rounded-lg bg-[#1E73D8] px-3 py-1.5 text-xs font-bold text-[#FFFFFF] transition hover:bg-[#0B3C5D]"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open recording
                        </a>
                      ) : (
                        <span
                          className={
                            artifactStatusTextIsUnavailable(recordingArtifactText)
                              ? "font-medium text-[#B45309]"
                              : "text-[#8BBCEB]"
                          }
                        >
                          {recordingArtifactText}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {row.transcriptUrl ? (
                        <a
                          href={row.transcriptUrl}
                          className="inline-flex items-center rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-[#0B3C5D] transition hover:bg-[#1EBB58]"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open transcript
                        </a>
                      ) : (
                        <span
                          className={
                            artifactStatusTextIsUnavailable(transcriptArtifactText)
                              ? "font-medium text-[#B45309]"
                              : "text-[#8BBCEB]"
                          }
                        >
                          {transcriptArtifactText}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <Button
                        type="button"
                        variant="adminSecondary"
                        className="whitespace-nowrap px-3 py-1.5 text-xs"
                        onClick={() => setDetailRow(row)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {listMeta.total > 0 ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-[#8BBCEB]/30 bg-[#FFFFFF] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium text-[#0B3C5D]">
                Showing{" "}
                <span className="font-bold tabular-nums">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, listMeta.total)}
                </span>{" "}
                of <span className="font-bold tabular-nums">{listMeta.total}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="adminSecondary"
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <FiChevronLeft className="h-4 w-4" aria-hidden />
                  Previous
                </Button>
                <span className="px-2 text-xs font-bold text-[#1E73D8]">
                  Page {page} of {listMeta.totalPages}
                </span>
                <Button
                  type="button"
                  variant="adminSecondary"
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs"
                  disabled={page >= listMeta.totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <FiChevronRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          ) : null}
          </div>
        )}
      </AdminPanel>

      <InfoModal
        open={Boolean(detailRow)}
        title="Booking details"
        tone="admin"
        onClose={() => setDetailRow(null)}
      >
        {detailRow ? (
          <div className="space-y-1">
            <DetailField label="Booking ID">{String(detailRow._id)}</DetailField>
            <DetailField label="Status">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${bookingStatusChipClassName(detailRow.status, { rescheduledAt: detailRow.rescheduledAt })}`}
              >
                {formatBookingStatusLabel(detailRow.status, { rescheduledAt: detailRow.rescheduledAt })}
              </span>
            </DetailField>
            <DetailField label="Session window">
              <div>{formatDateTime(detailRow.startTime)}</div>
              <div className="mt-0.5 text-xs font-medium text-[#1E73D8]/90">to {formatDateTime(detailRow.endTime)}</div>
            </DetailField>
            <DetailField label="Learner">
              <div>{detailRow.learnerName || "—"}</div>
              <div className="mt-1 text-xs font-medium capitalize text-[#1E73D8]">{detailRow.bookingKind || "—"}</div>
              {detailRow.contactEmail ? (
                <div className="mt-1 text-xs font-medium text-[#8BBCEB]">{detailRow.contactEmail}</div>
              ) : null}
            </DetailField>
            <DetailField label="Grade">{detailRow.learnerGrade ?? "—"}</DetailField>
            <DetailField label="Batch">
              {detailRow.batchId || "—"}
              {detailRow.batchName ? (
                <div className="mt-1 text-xs font-medium text-[#1E73D8]/90">{detailRow.batchName}</div>
              ) : null}
            </DetailField>
            <DetailField label="Teacher">
              <div>{detailRow.teacherName || "—"}</div>
              {detailRow.teacherEmail || detailRow.teacherGrade != null ? (
                <div className="mt-1 text-xs font-medium text-[#1E73D8]/85">
                  {[detailRow.teacherEmail, detailRow.teacherGrade != null ? `Teaches grade ${detailRow.teacherGrade}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              ) : null}
            </DetailField>
            <DetailField label="Meeting link">
              {detailRow.meetingLink ? (
                <a
                  href={detailRow.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-bold text-[#1E73D8] underline decoration-[#8BBCEB] underline-offset-2 hover:text-[#0B3C5D]"
                >
                  Open link
                </a>
              ) : (
                "—"
              )}
            </DetailField>
            <DetailField label="Recording">
              {detailRow.recordingUrl ? (
                <a
                  href={detailRow.recordingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-bold text-[#1E73D8] underline"
                >
                  Open recording
                </a>
              ) : (
                <span
                  className={
                    artifactStatusTextIsUnavailable(getRecordingArtifactStatusText(detailRow))
                      ? "font-medium text-[#B45309]"
                      : "text-[#8BBCEB]"
                  }
                >
                  {getRecordingArtifactStatusText(detailRow)}
                </span>
              )}
            </DetailField>
            <DetailField label="Transcript">
              {detailRow.transcriptUrl ? (
                <a
                  href={detailRow.transcriptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-bold text-[#1E73D8] underline"
                >
                  Open transcript
                </a>
              ) : (
                <span
                  className={
                    artifactStatusTextIsUnavailable(getTranscriptArtifactStatusText(detailRow))
                      ? "font-medium text-[#B45309]"
                      : "text-[#8BBCEB]"
                  }
                >
                  {getTranscriptArtifactStatusText(detailRow)}
                </span>
              )}
            </DetailField>
            <DetailField label="LSQ sync">
              <div className="text-xs font-medium text-[#0B3C5D]/90">
                Last attempt: {formatDateTime(detailRow.artifactsLastSyncedAt)}
              </div>
              {detailRow.artifactsFetchAttempts != null ? (
                <div className="mt-1 text-xs font-medium text-[#1E73D8]/85">
                  Fetch attempts: {detailRow.artifactsFetchAttempts}
                </div>
              ) : null}
              {detailRow.artifactsLastError ? (
                <p className="mt-2 whitespace-pre-wrap break-words text-xs font-medium text-[#B45309]">
                  {detailRow.artifactsLastError}
                </p>
              ) : null}
            </DetailField>
            <DetailField label="Google Calendar event ID">
              {detailRow.googleCalendarEventId || "—"}
            </DetailField>
            <DetailField label="Created">{formatDateTime(detailRow.createdAt)}</DetailField>
            <DetailField label="Updated">{formatDateTime(detailRow.updatedAt)}</DetailField>
          </div>
        ) : null}
      </InfoModal>
    </div>
  );
};
