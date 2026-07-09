import { FiCheckCircle, FiChevronDown, FiClock, FiList, FiMail, FiUser } from "react-icons/fi";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Loader } from "../ui/Loader";
import { EmptyState } from "../ui/EmptyState";
import { BookingHero, BookingNotice, BookingPanel } from "./BookingPageChrome";
import { BatchAssignmentMeta } from "../BatchAssignmentMeta";
import { bookingStatusChipClassName, formatBookingStatusLabel } from "../../utils/bookingStatus";
import { toDateLabel, toIsoDate, toTimeLabel } from "../../utils/date";
import { cn } from "../../utils/cn";

const publicSlotStateLabel = (slotState) => {
  switch (slotState) {
    case "available":
      return "Available";
    case "yours":
      return "Yours";
    case "taken":
      return "Taken";
    case "cancelled":
      return "Cancelled";
    default:
      return slotState || "—";
  }
};

export const OpenBookingLegacyDashboard = ({
  roster,
  bookingWindowDays,
  slotReleasedBanner,
  bookingHistorySectionOpen,
  setBookingHistorySectionOpen,
  bookingHistoryLoading,
  bookingHistoryError,
  bookingHistory,
  contactEmail,
  setContactEmail,
  emailOk,
  days,
  selectedDate,
  setSelectedDate,
  openData,
  loading,
  bookingInProgress,
  onLogout,
  onBook,
}) => (
  <div className="min-h-screen bg-[#F5F5F5] px-4 py-8 md:px-8 md:py-12">
    <div className="mx-auto max-w-4xl space-y-6">
      <BookingHero
        eyebrow="Open booking"
        title="Reserve your session"
        description="No login required. Verify your roster details, choose a day, and pick an available teacher slot. Meet links are sent to your email."
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-[#FFFFFF]/25 bg-[#FFFFFF]/10 px-3 py-1.5 text-xs font-semibold text-[#8BBCEB]">
          <FiClock className="h-4 w-4" />
          {bookingWindowDays}-day window
        </span>
      </BookingHero>

      <BookingNotice title="Before you confirm">
        <p>
          <span className="font-bold text-[#0B3C5D]">You cannot cancel</span> through this portal once a booking is
          confirmed. To change or cancel, contact your coordinator or school office.
        </p>
      </BookingNotice>

      {slotReleasedBanner ? (
        <div
          className="relative overflow-hidden rounded-2xl border border-[#25D366]/45 bg-[#FFFFFF] p-4 shadow-[0_12px_32px_-16px_rgba(37,211,102,0.35)] md:p-5"
          role="status"
        >
          <div className="absolute left-0 top-0 h-full w-1.5 bg-[#25D366]" />
          <div className="flex gap-3 pl-4">
            <FiCheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-[#25D366]" />
            <div>
              <p className="font-heading text-base font-bold text-[#0B3C5D]">You can book again</p>
              <p className="mt-1 text-sm font-medium text-[#1E73D8]/90">
                Your previous slot on this day was released. Choose a new time below.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <BookingPanel className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F5F5F5] text-[#1E73D8]">
            <FiUser className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1E73D8]">Verified student</p>
            <p className="font-heading text-xl font-bold text-[#0B3C5D]">{roster.name}</p>
            <BatchAssignmentMeta
              className="mt-1"
              grade={roster.grade}
              display={roster.display}
              batchName={roster.batchName}
            />
          </div>
        </div>
        <Button type="button" variant="adminGhost" onClick={onLogout}>
          Change student
        </Button>
      </BookingPanel>

      <BookingPanel>
        <button
          type="button"
          className="mb-4 flex w-full items-center justify-between gap-3 border-b border-[#F5F5F5] pb-4 text-left transition hover:bg-[#F5F5F5]/60"
          onClick={() => setBookingHistorySectionOpen((open) => !open)}
          aria-expanded={bookingHistorySectionOpen}
          aria-controls="open-booking-history-panel"
          id="open-booking-history-heading"
        >
          <span className="flex min-w-0 items-center gap-2">
            <FiList className="h-5 w-5 shrink-0 text-[#1E73D8]" aria-hidden />
            <span className="font-heading text-lg font-bold text-[#0B3C5D]">Your booking history</span>
          </span>
          <FiChevronDown
            aria-hidden
            className={cn(
              "h-5 w-5 shrink-0 text-[#1E73D8] transition-transform duration-200",
              bookingHistorySectionOpen ? "rotate-180" : "rotate-0",
            )}
          />
        </button>
        <div
          id="open-booking-history-panel"
          role="region"
          aria-labelledby="open-booking-history-heading"
          hidden={!bookingHistorySectionOpen}
        >
          <p className="mb-4 text-sm font-medium text-[#1E73D8]/88">
            Up to 50 recent sessions for this profile (newest first). Same phone number and student record as when you
            verified.
          </p>
          {bookingHistoryLoading ? (
            <div className="flex justify-center py-6">
              <Loader label="Loading history…" variant="admin" />
            </div>
          ) : bookingHistoryError ? (
            <p className="text-sm font-medium text-[#B45309]">{bookingHistoryError}</p>
          ) : bookingHistory.length === 0 ? (
            <p className="text-sm font-medium text-[#1E73D8]/80">No bookings yet for this student profile.</p>
          ) : (
            <ul className="divide-y divide-[#8BBCEB]/25" aria-label="Booking history">
              {bookingHistory.map((row) => {
                const teacherName =
                  row.teacherId && typeof row.teacherId === "object" ? row.teacherId.name : "Teacher";
                const meetLink = typeof row.meetingLink === "string" ? row.meetingLink.trim() : "";
                const meetLinkIsUrl = /^https?:\/\//i.test(meetLink);
                const statusMeta = { rescheduledAt: row.rescheduledAt };
                return (
                  <li
                    key={row._id}
                    className="flex flex-col gap-2 py-4 first:pt-0 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0B3C5D]">
                        {toDateLabel(row.startTime)} · {toTimeLabel(row.startTime)} – {toTimeLabel(row.endTime)} IST
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#1E73D8]/90">{teacherName}</p>
                      <div className="mt-2 border-t border-[#8BBCEB]/20 pt-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0B3C5D]/80">
                          Meeting link
                        </p>
                        {meetLink ? (
                          meetLinkIsUrl ? (
                            <a
                              href={meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-block max-w-full break-all text-sm font-semibold text-[#1E73D8] underline decoration-[#8BBCEB] underline-offset-2 hover:text-[#0B3C5D]"
                            >
                              {meetLink}
                            </a>
                          ) : (
                            <p className="mt-1 break-all text-sm font-medium text-[#0B3C5D]">{meetLink}</p>
                          )
                        ) : (
                          <p className="mt-1 text-xs font-medium text-[#1E73D8]/75">
                            Not stored for this session — use the calendar invite from your email if you have one.
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 self-start rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                        bookingStatusChipClassName(row.status, statusMeta),
                      )}
                    >
                      {formatBookingStatusLabel(row.status, statusMeta)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {!bookingHistorySectionOpen ? (
          <p className="mt-2 text-xs font-medium text-[#1E73D8]/75">
            Tap the heading above to show or hide your past and upcoming sessions.
          </p>
        ) : null}
      </BookingPanel>

      <BookingPanel>
        <div className="mb-4 flex items-center gap-2 border-b border-[#F5F5F5] pb-4">
          <FiMail className="h-5 w-5 text-[#1E73D8]" />
          <h2 className="font-heading text-lg font-bold text-[#0B3C5D]">Email for meeting link</h2>
        </div>
        <p className="mb-4 text-sm font-medium text-[#1E73D8]/88">
          The Google Meet link and booking details will be sent to this address.
        </p>
        <Input
          tone="brand"
          label="Your email"
          type="email"
          autoComplete="email"
          maxLength={254}
          value={contactEmail}
          error={
            contactEmail.trim() && !emailOk ? "Enter a valid email address (used for the Meet link)" : undefined
          }
          onChange={(event) => setContactEmail(event.target.value)}
          required
        />
        {!emailOk && contactEmail.trim() === "" ? (
          <p className="mt-2 text-xs font-medium text-[#8BBCEB]">Required before you can book a slot.</p>
        ) : null}
      </BookingPanel>

      <BookingPanel>
        <div className="mb-4 flex items-center gap-2 border-b border-[#F5F5F5] pb-4">
          <FiClock className="h-5 w-5 text-[#F4D35E]" />
          <h2 className="font-heading text-lg font-bold text-[#0B3C5D]">Pick a day</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-7">
          {days.map((day) => {
            const iso = toIsoDate(day);
            const active = iso === selectedDate;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDate(iso)}
                className={cn(
                  "rounded-xl border px-2 py-3 text-center text-xs font-bold transition md:text-[11px]",
                  active
                    ? "border-[#1E73D8] bg-[#1E73D8] text-[#FFFFFF] shadow-[0_8px_20px_-8px_rgba(30,115,216,0.45)]"
                    : "border-[#8BBCEB]/45 bg-[#FFFFFF] text-[#0B3C5D] hover:border-[#1E73D8]/40 hover:bg-[#F5F5F5]",
                )}
              >
                {day.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "2-digit",
                })}
              </button>
            );
          })}
        </div>
      </BookingPanel>

      {openData?.hasBookingToday && openData?.currentBooking ? (
        <BookingPanel className="border-[#F4D35E]/55 bg-[#F4D35E]/12">
          <p className="font-heading text-sm font-bold text-[#0B3C5D]">You already have a booking on this day.</p>
          <p className="mt-2 text-sm font-semibold text-[#1E73D8]">
            {toTimeLabel(openData.currentBooking.startTime)} – {toTimeLabel(openData.currentBooking.endTime)} IST
          </p>
          <p className="mt-3 text-xs font-medium leading-relaxed text-[#0B3C5D]/90">
            Meeting cancellations are not available in this portal. If you need to change your session, please contact
            your coordinator or school office.
          </p>
        </BookingPanel>
      ) : null}

      {openData?.slots?.length ? (
        <div className="space-y-4">
          {openData.slots.map((slot) => (
            <BookingPanel key={`${slot.startTime}-${slot.endTime}`} className="!p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#F5F5F5] pb-3">
                <p className="font-heading text-sm font-bold text-[#0B3C5D]">
                  {toTimeLabel(slot.startTime)} – {toTimeLabel(slot.endTime)} IST
                </p>
                <span className="rounded-full bg-[#8BBCEB]/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0B3C5D]">
                  Time band
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {slot.teachers.map((teacher) => (
                  <div
                    key={`${teacher.slotId}-${teacher.teacherId}`}
                    className={cn(
                      "rounded-2xl border p-4 transition hover:border-[#1E73D8]/35 hover:bg-[#FFFFFF]",
                      teacher.slotState === "cancelled"
                        ? "border-[#94A3B8]/45 bg-[#F1F5F9]/80"
                        : "border-[#8BBCEB]/35 bg-[#F5F5F5]/60",
                    )}
                  >
                    <p className="font-heading font-bold text-[#0B3C5D]">{teacher.teacherName}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#1E73D8]/80">
                      {publicSlotStateLabel(teacher.slotState)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {teacher.slotState === "yours" ? (
                        <span className="text-xs font-bold text-[#0B3C5D]">
                          Your booking (cancellation not available here)
                        </span>
                      ) : null}
                      {teacher.slotState === "available" ? (
                        <Button
                          variant="adminPrimary"
                          disabled={!teacher.canBook || loading || bookingInProgress || !emailOk}
                          onClick={() => onBook(teacher)}
                          className="w-full justify-center sm:w-auto"
                        >
                          {teacher.canBook ? "Book this slot" : "Limit reached"}
                        </Button>
                      ) : null}
                      {teacher.slotState === "taken" ? (
                        <Button variant="adminGhost" disabled className="w-full justify-center sm:w-auto">
                          Booked
                        </Button>
                      ) : null}
                      {teacher.slotState === "cancelled" ? (
                        <Button variant="adminGhost" disabled className="w-full justify-center sm:w-auto">
                          Cancelled
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </BookingPanel>
          ))}
        </div>
      ) : loading ? (
        <div className="flex justify-center py-10">
          <Loader label="Loading slots…" variant="admin" />
        </div>
      ) : (
        <EmptyState
          tone="brand"
          title="No slots for this day"
          description="Ask your teacher to publish availability for this date."
        />
      )}
    </div>
  </div>
);
