import { useCallback, useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiRefreshCw } from "react-icons/fi";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { InfoModal } from "../../components/ui/InfoModal";
import { adminService } from "../../services/admin.service";
import { useToast } from "../../hooks/useToast";
import { AdminPageHero, AdminPanel } from "../../components/admin/AdminPageChrome";
import { bookingStatusChipClassName, formatBookingStatusLabel } from "../../utils/bookingStatus";

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
  const [rows, setRows] = useState([]);
  const [listMeta, setListMeta] = useState({ total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState("");
  const [batchIdFilter, setBatchIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [detailRow, setDetailRow] = useState(null);
  const staleArtifactToastKeyRef = useRef(null);

  useEffect(() => {
    setPage(1);
  }, [gradeFilter, batchIdFilter, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (gradeFilter) params.grade = gradeFilter;
      const batchTrim = batchIdFilter.replace(/[^a-zA-Z0-9]/g, "").trim();
      if (batchTrim) params.batchId = batchTrim;
      if (statusFilter) params.status = statusFilter;
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
  }, [gradeFilter, batchIdFilter, statusFilter, page, pushToast]);

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
    const filterKey = `${gradeFilter}|${batchIdFilter.replace(/[^a-zA-Z0-9]/g, "").trim()}`;
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
      </AdminPageHero>

      <AdminPanel className="space-y-5">
        <div className="flex flex-col gap-4 rounded-2xl border border-[#8BBCEB]/35 bg-[#F5F5F5] p-4 lg:flex-row lg:flex-wrap lg:items-end">
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
                const v = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 80);
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
          <p className="text-xs font-medium leading-relaxed text-[#1E73D8]/90 lg:max-w-md lg:flex-1 lg:pb-2">
            Grade matches the <span className="font-bold text-[#0B3C5D]">student</span> (roster or account). Batch ID
            applies to <span className="font-bold text-[#0B3C5D]">roster</span> bookings; student-app bookings have no
            batch. Status filters the booking lifecycle outcome.
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
              batchIdFilter.replace(/[^a-zA-Z0-9]/g, "").trim() ||
              statusFilter
                ? "No bookings match these filters"
                : "No bookings yet"
            }
            description={
              gradeFilter ||
              batchIdFilter.replace(/[^a-zA-Z0-9]/g, "").trim() ||
              statusFilter
                ? "Clear grade, batch ID, or status — data refreshes automatically when filters change."
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
