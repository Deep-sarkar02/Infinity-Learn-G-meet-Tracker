import { useMemo, useState } from "react";
import { toDateLabel, toTimeLabel } from "../../utils/date";
import { TimeInput } from "../ui/TimeInput";
import { nextKolkataDays, toIsoDate } from "../../utils/date";
import { cn } from "../../utils/cn";
import {
  formatBookingStatusShortBadge,
  isBookingSessionResolved,
} from "../../utils/bookingStatus";

const ChevronDown = ({ className }) => (
  <svg
    className={className}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const toIstHhmm = (isoString) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).format(new Date(isoString));

export const WeeklyCalendarGrid = ({
  calendarData,
  bookingWindowDays = 7,
  initialExpandedDayKey = null,
  loading = false,
  onUpdateSlot,
  onDeleteSlot,
  onRequestReschedule,
  onRequestCancel,
}) => {
  const [manualExpandedDayKey, setManualExpandedDayKey] = useState(undefined);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [editValues, setEditValues] = useState({ startTime: "", endTime: "" });
  const [expandedBookedKey, setExpandedBookedKey] = useState(null);

  const dayWindows = useMemo(
    () => nextKolkataDays(Math.max(Number(bookingWindowDays), 1)),
    [bookingWindowDays],
  );
  const dayRows = useMemo(() => {
    const byYmd = new Map(
      calendarData.map((row) => [String(row.date).slice(0, 10), row]),
    );
    return dayWindows.map((day) => {
      const ymd = toIsoDate(day).slice(0, 10);
      const existing = byYmd.get(ymd);
      return {
        key: ymd,
        date: `${ymd}T00:00:00.000Z`,
        availabilityId: existing?._id || null,
        slots: existing?.slots || [],
      };
    });
  }, [calendarData, dayWindows]);
  const fallbackExpandedDayKey = dayRows.some((day) => day.key === initialExpandedDayKey)
    ? initialExpandedDayKey
    : null;
  const expandedDayKey =
    manualExpandedDayKey === undefined ? fallbackExpandedDayKey : manualExpandedDayKey;

  const startEdit = (slot) => {
    setEditingSlotId(slot._id);
    setEditValues({
      startTime: toIstHhmm(slot.startTime),
      endTime: toIstHhmm(slot.endTime),
    });
  };

  const cancelEdit = () => {
    setEditingSlotId(null);
    setEditValues({ startTime: "", endTime: "" });
  };

  const saveEdit = async (availabilityId, slotId) => {
    if (!onUpdateSlot) return;
    const ok = await onUpdateSlot({
      availabilityId,
      slotId,
      startTime: editValues.startTime,
      endTime: editValues.endTime,
    });
    if (ok) {
      cancelEdit();
    }
  };

  const toggleBookedAccordion = (dayKey, slotId) => {
    const k = `${dayKey}|${String(slotId)}`;
    setExpandedBookedKey((prev) => (prev === k ? null : k));
  };

  const selectDay = (day) => {
    cancelEdit();
    if (expandedDayKey === day.key) {
      setManualExpandedDayKey(null);
      setExpandedBookedKey(null);
      return;
    }
    setManualExpandedDayKey(day.key);
    const firstBooked = day.slots.find(
      (s) => s.isBooked || s.booking?.status === "cancelled",
    );
    setExpandedBookedKey(
      firstBooked ? `${day.key}|${String(firstBooked._id)}` : null,
    );
  };

  return (
    <section
      className={cn(
        "overflow-hidden rounded-3xl border border-[#8BBCEB]/35 bg-[#FFFFFF] p-6 sm:p-8",
        "shadow-[0_14px_40px_-22px_rgba(11,60,93,0.28)]",
      )}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading text-xl font-bold tracking-tight text-[#0B3C5D]">Weekly calendar</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#8BBCEB]/25 px-3 py-1.5 text-xs font-bold text-[#0B3C5D]">
            <span className="h-2 w-2 rounded-full bg-[#1E73D8]" aria-hidden />
            Open slot
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#F4D35E]/35 px-3 py-1.5 text-xs font-bold text-[#0B3C5D]">
            <span className="h-2 w-2 rounded-full bg-[#F4D35E]" aria-hidden />
            Booked
          </span>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {dayRows.map((day) => {
          const active = expandedDayKey === day.key;
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => selectDay(day)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-bold transition",
                active
                  ? "border-transparent bg-[#1E73D8] text-[#FFFFFF] shadow-[0_8px_20px_-8px_rgba(30,115,216,0.45)]"
                  : "border-[#8BBCEB]/45 bg-[#F5F5F5] text-[#0B3C5D] hover:border-[#1E73D8]/35",
              )}
            >
              {toDateLabel(day.date)}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {dayRows.map((day) =>
          expandedDayKey === day.key ? (
            <div
              key={day.key}
              className="rounded-2xl border border-[#8BBCEB]/30 bg-[#F5F5F5]/70 p-4 sm:p-5"
            >
              <h3 className="mb-3 text-sm font-bold text-[#0B3C5D]">{toDateLabel(day.date)}</h3>
              {!day.slots.length ? (
                <p className="text-sm font-medium text-[#1E73D8]/80">No slots for this day</p>
              ) : (
                <div className="space-y-3">
                  {day.slots.map((slot) => {
                    const bookedAccordionKey = `${day.key}|${String(slot._id)}`;
                    const isBookedExpanded = expandedBookedKey === bookedAccordionKey;
                    const booking = slot.booking;
                    const bookingStatus = booking?.status ?? "scheduled";
                    /** Cancelled sessions free the DB slot (`isBooked: false`) but still carry `booking` for display. */
                    const showBookedSession =
                      slot.isBooked || bookingStatus === "cancelled";
                    const sessionCompleted = bookingStatus === "completed";
                    const sessionCancelled = bookingStatus === "cancelled";
                    const sessionAbsent =
                      bookingStatus === "student_did_not_join" ||
                      bookingStatus === "teacher_did_not_join";
                    const statusBadgeText = formatBookingStatusShortBadge(bookingStatus, {
                      rescheduledAt: booking?.rescheduledAt,
                    });
                    const showDetailedStatus =
                      isBookingSessionResolved(bookingStatus) || sessionCancelled;
                    const canModifyBooking =
                      Boolean(booking?.id) &&
                      bookingStatus === "scheduled" &&
                      new Date(slot.startTime) > Date.now();

                    return (
                      <div
                        key={slot._id}
                        className={cn(
                          "overflow-hidden rounded-xl border text-sm",
                          showBookedSession
                            ? sessionCompleted
                              ? "border-[#8BBCEB]/55 bg-[#8BBCEB]/12 text-[#0B3C5D]"
                              : sessionCancelled
                                ? "border-[#94A3B8]/50 bg-[#F1F5F9] text-[#0B3C5D]"
                                : sessionAbsent
                                  ? "border-[#EA580C]/45 bg-[#FFF7ED] text-[#0B3C5D]"
                                  : "border-[#F4D35E]/55 bg-[#F4D35E]/12 text-[#0B3C5D]"
                            : "border-[#8BBCEB]/45 bg-[#FFFFFF] text-[#0B3C5D]",
                        )}
                      >
                        {editingSlotId === slot._id ? (
                          <div className="flex flex-col gap-3 border border-[#8BBCEB]/35 bg-[#FFFFFF] p-4 sm:flex-row sm:items-end sm:gap-3">
                            <div className="min-w-0 flex-1">
                              <TimeInput
                                tone="brand"
                                label="Start (IST)"
                                value={editValues.startTime}
                                onChange={(event) =>
                                  setEditValues((prev) => ({
                                    ...prev,
                                    startTime: event.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="hidden text-[#8BBCEB] sm:mb-2 sm:block" aria-hidden>
                              →
                            </div>
                            <div className="min-w-0 flex-1">
                              <TimeInput
                                tone="brand"
                                label="End (IST)"
                                value={editValues.endTime}
                                onChange={(event) =>
                                  setEditValues((prev) => ({
                                    ...prev,
                                    endTime: event.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2 sm:ml-auto">
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => saveEdit(day.availabilityId, slot._id)}
                                className="rounded-lg border border-[#8BBCEB]/50 bg-[#FFFFFF] px-4 py-2 text-sm font-bold text-[#0B3C5D] shadow-sm hover:bg-[#F5F5F5] disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded-lg border border-[#8BBCEB]/40 bg-[#F5F5F5] px-4 py-2 text-sm font-semibold text-[#0B3C5D] hover:bg-[#FFFFFF]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : showBookedSession ? (
                          <div>
                            <button
                              type="button"
                              className={cn(
                                "flex w-full items-center gap-3 px-4 py-3 text-left transition",
                                sessionCompleted
                                  ? "hover:bg-[#8BBCEB]/20"
                                  : sessionCancelled
                                    ? "hover:bg-[#E2E8F0]/80"
                                    : "hover:bg-[#F4D35E]/20",
                              )}
                              onClick={() => toggleBookedAccordion(day.key, slot._id)}
                              aria-expanded={isBookedExpanded}
                            >
                              <span className="min-w-0 flex-1 font-bold text-[#0B3C5D]">
                                {toTimeLabel(slot.startTime)} – {toTimeLabel(slot.endTime)}{" "}
                                <span className="text-xs font-semibold text-[#1E73D8]/85">(IST)</span>
                              </span>
                              <span
                                className={cn(
                                  "max-w-[min(12rem,46%)] shrink-0 truncate rounded-full px-2.5 py-0.5 text-center text-[11px] font-bold leading-tight text-[#0B3C5D]",
                                  sessionCompleted
                                    ? "bg-[#8BBCEB]/45"
                                    : sessionCancelled
                                      ? "bg-[#94A3B8]/45"
                                      : sessionAbsent
                                        ? "bg-[#FDBA74]/60"
                                        : "bg-[#F4D35E]",
                                )}
                                title={statusBadgeText}
                              >
                                {showDetailedStatus ? statusBadgeText : "Booked"}
                              </span>
                              <ChevronDown
                                className={cn(
                                  "shrink-0 text-[#0B3C5D] transition-transform duration-200",
                                  isBookedExpanded ? "rotate-180" : "",
                                )}
                              />
                            </button>
                            {isBookedExpanded ? (
                              <div
                                className={cn(
                                  "space-y-3 border-t px-4 pb-4 pt-3",
                                  sessionCompleted
                                    ? "border-[#8BBCEB]/40"
                                    : sessionCancelled
                                      ? "border-[#94A3B8]/40"
                                      : sessionAbsent
                                        ? "border-[#FDBA74]/50"
                                        : "border-[#F4D35E]/40",
                                )}
                              >
                                {booking ? (
                                  <div className="grid gap-4 text-sm sm:grid-cols-2">
                                    <div>
                                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#1E73D8]">
                                        Student
                                      </p>
                                      <p className="mt-1 font-bold text-[#0B3C5D]">{booking.learnerName}</p>
                                      {booking.learnerGrade != null ? (
                                        <p className="font-medium text-[#1E73D8]/90">Grade {booking.learnerGrade}</p>
                                      ) : null}
                                      {(booking.learnerBatchId || booking.learnerBatchName) && (
                                        <p className="font-medium text-[#1E73D8]/85">
                                          {[
                                            booking.learnerBatchId
                                              ? `Batch ${booking.learnerBatchId}`
                                              : null,
                                            booking.learnerBatchName || null,
                                          ]
                                            .filter(Boolean)
                                            .join(" · ")}
                                        </p>
                                      )}
                                      {booking.contactEmail ? (
                                        <p className="mt-2 font-medium text-[#0B3C5D]">{booking.contactEmail}</p>
                                      ) : null}
                                      {booking.learnerMobile ? (
                                        <p className="font-medium text-[#1E73D8]/88">{booking.learnerMobile}</p>
                                      ) : null}
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#1E73D8]">
                                        Session (IST)
                                      </p>
                                      <p className="mt-1 font-semibold text-[#0B3C5D]">
                                        {toTimeLabel(booking.startTime)} – {toTimeLabel(booking.endTime)}
                                      </p>
                                      {booking.meetingLink ? (
                                        <div className="mt-3 space-y-2">
                                          <a
                                            href={booking.meetingLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex font-bold text-[#1E73D8] underline decoration-[#8BBCEB] underline-offset-2 hover:text-[#0B3C5D]"
                                          >
                                            Open meeting link
                                          </a>
                                          <div>
                                            <button
                                              type="button"
                                              className="rounded-lg border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#0B3C5D] shadow-sm hover:bg-[#F5F5F5]"
                                              onClick={() => {
                                                void navigator.clipboard.writeText(booking.meetingLink);
                                              }}
                                            >
                                              Copy link
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="mt-2 text-xs font-medium text-[#8BBCEB]">No link stored</p>
                                      )}
                                    </div>
                                    {sessionCancelled && booking.cancellationReason ? (
                                      <div className="sm:col-span-2">
                                        <p className="text-xs font-medium text-[#64748B]">
                                          Cancellation note: {booking.cancellationReason}
                                        </p>
                                      </div>
                                    ) : null}
                                    {canModifyBooking && onRequestReschedule && onRequestCancel ? (
                                      <div className="flex flex-wrap gap-2 sm:col-span-2">
                                        <button
                                          type="button"
                                          className="rounded-lg border border-[#1E73D8]/45 bg-[#FFFFFF] px-3 py-2 text-xs font-bold text-[#1E73D8] shadow-sm hover:bg-[#F5F5F5]"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onRequestReschedule(booking);
                                          }}
                                        >
                                          Reschedule
                                        </button>
                                        <button
                                          type="button"
                                          className="rounded-lg border border-[#B45309]/40 bg-[#FFFFFF] px-3 py-2 text-xs font-bold text-[#B45309] shadow-sm hover:bg-[#FFF7ED]"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onRequestCancel(booking);
                                          }}
                                        >
                                          Cancel booking
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : (
                                  <p className="text-sm font-medium text-[#1E73D8]/85">
                                    Booking details are not available for this slot.
                                  </p>
                                )}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                            <span className="font-bold text-[#0B3C5D]">
                              {toTimeLabel(slot.startTime)} – {toTimeLabel(slot.endTime)}
                            </span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => startEdit(slot)}
                                className="rounded-lg border border-[#8BBCEB]/50 bg-[#FFFFFF] px-4 py-2 text-sm font-bold text-[#0B3C5D] shadow-sm hover:bg-[#F5F5F5] disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={loading || !onDeleteSlot}
                                onClick={() =>
                                  onDeleteSlot({
                                    availabilityId: day.availabilityId,
                                    slotId: slot._id,
                                  })
                                }
                                className="rounded-lg border border-[#8BBCEB]/50 bg-[#F5F5F5] px-4 py-2 text-sm font-bold text-[#0B3C5D] shadow-sm hover:bg-[#FFFFFF] disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null,
        )}
      </div>
    </section>
  );
};
