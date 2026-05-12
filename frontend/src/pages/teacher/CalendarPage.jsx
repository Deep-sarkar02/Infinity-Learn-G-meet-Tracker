import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";
import { WeeklyCalendarGrid } from "../../components/calendar/WeeklyCalendarGrid";
import { useTeacherController } from "../../controllers/teacher.controller";
import { BookingHero, BookingPanel } from "../../components/teacher/TeacherWorkspaceChrome";
import { CancelBookingModal } from "../../components/teacher/CancelBookingModal";
import { RescheduleBookingModal } from "../../components/teacher/RescheduleBookingModal";

export const CalendarPage = () => {
  const location = useLocation();
  const selectedDate = location.state?.selectedDate || null;
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [cancelBooking, setCancelBooking] = useState(null);
  const {
    calendar,
    bookingWindowDays,
    loading,
    loadCalendar,
    updateSlot,
    deleteSlot,
    fetchRescheduleOptions,
    rescheduleTeacherBooking,
    cancelTeacherBooking,
  } = useTeacherController();

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BookingHero
        eyebrow="Schedule"
        title="Student bookings"
        description="Review confirmed sessions and open slots. Editing and deletes apply only to unbooked availability."
      />

      <BookingPanel
        className="relative !overflow-hidden"
        role="region"
        aria-labelledby="student-bookings-heading"
      >
        <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-[#1E73D8] to-[#8BBCEB]" aria-hidden />
        <div className="flex flex-col gap-6 pl-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h2 id="student-bookings-heading" className="font-heading text-lg font-bold text-[#0B3C5D]">
              Policy on this page
            </h2>
            <p className="max-w-xl text-sm font-medium leading-relaxed text-[#1E73D8]/90">
              For future sessions, you can <span className="font-bold text-[#0B3C5D]">reschedule</span> to another open
              slot you already published, or <span className="font-bold text-[#0B3C5D]">cancel</span> before the start
              time. Cancelling keeps that time block closed (not offered to others); the learner receives email
              automatically.
            </p>
          </div>
          <Link
            to="/teacher#booking-policy"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[#1E73D8] underline decoration-[#8BBCEB] underline-offset-2 hover:text-[#0B3C5D]"
          >
            View policy
            <FiChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </BookingPanel>

      <WeeklyCalendarGrid
        calendarData={calendar}
        bookingWindowDays={bookingWindowDays}
        initialExpandedDayKey={selectedDate}
        loading={loading}
        onUpdateSlot={updateSlot}
        onDeleteSlot={deleteSlot}
        onRequestReschedule={(booking) => setRescheduleBooking(booking)}
        onRequestCancel={(booking) => setCancelBooking(booking)}
      />

      <RescheduleBookingModal
        open={Boolean(rescheduleBooking)}
        booking={rescheduleBooking}
        onClose={() => setRescheduleBooking(null)}
        fetchOptions={fetchRescheduleOptions}
        onConfirm={rescheduleTeacherBooking}
      />
      <CancelBookingModal
        open={Boolean(cancelBooking)}
        booking={cancelBooking}
        onClose={() => setCancelBooking(null)}
        onConfirm={cancelTeacherBooking}
      />
    </div>
  );
};
