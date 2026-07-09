import { FiCheckCircle, FiChevronDown, FiClock } from "react-icons/fi";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Loader } from "../ui/Loader";
import { EmptyState } from "../ui/EmptyState";
import { BatchAssignmentMeta } from "../BatchAssignmentMeta";
import {
  StudentActivityCard,
  StudentBookingHero,
  StudentBookingShell,
  StudentDayChip,
  StudentSectionHeader,
  StudentSurfaceCard,
} from "./StudentBookingShell";
import { formatBookingStatusLabel, ilBookingStatusChipClassName } from "../../utils/bookingStatus";
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

export const OpenBookingStudentDashboard = ({
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
  <StudentBookingShell student={roster} onLogout={onLogout}>
    <div className="space-y-8">
      <StudentBookingHero />

      {slotReleasedBanner ? (
        <div
          className="relative overflow-hidden rounded-2xl border border-[#25D366]/45 bg-[#F0FFF4] p-4"
          role="status"
        >
          <div className="flex gap-3">
            <FiCheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-[#25D366]" />
            <div>
              <p className="text-base font-bold text-[#1A1A1A]">You can book again</p>
              <p className="mt-1 text-sm text-[#5C5C5C]">
                Your previous slot on this day was released. Choose a new time below.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <section>
        <StudentSectionHeader
          title="Your profile"
          subtitle={roster?.batchName ? `${roster.batchName}` : "Verified for booking"}
        />
        <StudentSurfaceCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#1A1A1A]">{roster?.name}</p>
              <BatchAssignmentMeta
                className="mt-1"
                compact
                grade={roster?.grade}
                display={roster?.display}
                batchName={roster?.batchName}
              />
            </div>
            <span className="rounded-full bg-[#E8F4FF] px-3 py-1 text-xs font-semibold text-[#007BFF]">
              {bookingWindowDays}-day window
            </span>
          </div>
        </StudentSurfaceCard>
      </section>

      <section>
        <StudentSectionHeader
          title="Email for meeting link"
          subtitle="Google Meet details will be sent here"
        />
        <StudentSurfaceCard>
          <Input
            tone="il"
            label="Your email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={contactEmail}
            error={
              contactEmail.trim() && !emailOk
                ? "Enter a valid email address (used for the Meet link)"
                : undefined
            }
            onChange={(event) => setContactEmail(event.target.value)}
            required
          />
          {!emailOk && contactEmail.trim() === "" ? (
            <p className="mt-2 text-xs font-medium text-[#8A8A8A]">Required before you can book a slot.</p>
          ) : null}
        </StudentSurfaceCard>
      </section>

      <section>
        <StudentSectionHeader title="Choose a day" subtitle="Sessions available in your booking window" />
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {days.map((day, index) => {
            const iso = toIsoDate(day);
            return (
              <StudentDayChip
                key={iso}
                day={day}
                index={index}
                active={iso === selectedDate}
                onClick={() => setSelectedDate(iso)}
              />
            );
          })}
        </div>
      </section>

      {openData?.hasBookingToday && openData?.currentBooking ? (
        <StudentSurfaceCard className="border-[#F5D9B8]/60 bg-[#FFFBEB]">
          <p className="font-bold text-[#1A1A1A]">You already have a booking on this day.</p>
          <p className="mt-2 text-sm font-semibold text-[#007BFF]">
            {toTimeLabel(openData.currentBooking.startTime)} – {toTimeLabel(openData.currentBooking.endTime)} IST
          </p>
          <p className="mt-3 text-xs leading-relaxed text-[#5C5C5C]">
            Cancellations are not available here. Contact your coordinator to change your session.
          </p>
        </StudentSurfaceCard>
      ) : null}

      <section>
        <StudentSectionHeader
          title="Activities for today"
          subtitle={
            openData?.slots?.length
              ? `${openData.slots.length} time slot${openData.slots.length === 1 ? "" : "s"} available`
              : "Pick a day to see open sessions"
          }
        />
        {openData?.slots?.length ? (
          <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {openData.slots.map((slot) =>
              slot.teachers.map((teacher) => (
                <StudentActivityCard
                  key={`${slot.startTime}-${teacher.slotId}`}
                  icon={FiClock}
                  iconClass={
                    teacher.slotState === "available"
                      ? "bg-[#E8F4FF] text-[#007BFF]"
                      : teacher.slotState === "yours"
                        ? "bg-[#E8F8EF] text-[#16A34A]"
                        : "bg-[#F5F5F5] text-[#8A8A8A]"
                  }
                  title={teacher.teacherName}
                  meta={`${toTimeLabel(slot.startTime)} – ${toTimeLabel(slot.endTime)} IST · ${publicSlotStateLabel(teacher.slotState)}`}
                  badge={teacher.slotState === "yours" ? "Booked" : null}
                >
                  {teacher.slotState === "available" ? (
                    <Button
                      variant="ilPrimary"
                      disabled={!teacher.canBook || loading || bookingInProgress || !emailOk}
                      onClick={() => onBook(teacher)}
                      className="w-full justify-center rounded-full"
                    >
                      {teacher.canBook ? "Book session" : "Limit reached"}
                    </Button>
                  ) : null}
                  {teacher.slotState === "taken" ? (
                    <Button variant="ilGhost" disabled className="w-full justify-center rounded-full">
                      Booked
                    </Button>
                  ) : null}
                  {teacher.slotState === "cancelled" ? (
                    <Button variant="ilGhost" disabled className="w-full justify-center rounded-full">
                      Cancelled
                    </Button>
                  ) : null}
                  {teacher.slotState === "yours" ? (
                    <p className="text-xs font-medium text-[#5C5C5C]">Your session on this day</p>
                  ) : null}
                </StudentActivityCard>
              )),
            )}
          </div>
        ) : loading ? (
          <div className="flex justify-center py-10">
            <Loader label="Loading slots…" variant="il" />
          </div>
        ) : (
          <EmptyState
            tone="il"
            title="No slots for this day"
            description="Ask your teacher to publish availability for this date."
          />
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">Resume learning</h3>
            <p className="mt-0.5 text-sm text-[#8A8A8A]">Your recent and upcoming bookings</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#007BFF]"
            onClick={() => setBookingHistorySectionOpen((open) => !open)}
            aria-expanded={bookingHistorySectionOpen}
          >
            {bookingHistorySectionOpen ? "Hide" : "View all"}
            <FiChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                bookingHistorySectionOpen ? "rotate-180" : "",
              )}
            />
          </button>
        </div>
        {bookingHistorySectionOpen ? (
          <StudentSurfaceCard>
            {bookingHistoryLoading ? (
              <div className="flex justify-center py-6">
                <Loader label="Loading history…" variant="il" />
              </div>
            ) : bookingHistoryError ? (
              <p className="text-sm font-medium text-[#B45309]">{bookingHistoryError}</p>
            ) : bookingHistory.length === 0 ? (
              <p className="text-sm text-[#8A8A8A]">No bookings yet for this student profile.</p>
            ) : (
              <ul className="divide-y divide-[#ECECEC]" aria-label="Booking history">
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
                        <p className="font-semibold text-[#1A1A1A]">
                          {toDateLabel(row.startTime)} · {toTimeLabel(row.startTime)} – {toTimeLabel(row.endTime)} IST
                        </p>
                        <p className="mt-1 text-sm text-[#5C5C5C]">{teacherName}</p>
                        {meetLink ? (
                          meetLinkIsUrl ? (
                            <a
                              href={meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block break-all text-sm font-semibold text-[#007BFF] underline"
                            >
                              Join Meet
                            </a>
                          ) : (
                            <p className="mt-2 break-all text-sm text-[#1A1A1A]">{meetLink}</p>
                          )
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
                          ilBookingStatusChipClassName(row.status, statusMeta),
                        )}
                      >
                        {formatBookingStatusLabel(row.status, statusMeta)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </StudentSurfaceCard>
        ) : null}
      </section>

      <p className="text-xs leading-relaxed text-[#8A8A8A]">
        <span className="font-semibold text-[#1A1A1A]">Note:</span> You cannot cancel through this portal once confirmed.
        Contact your coordinator to change or cancel a session.
      </p>
    </div>
  </StudentBookingShell>
);
