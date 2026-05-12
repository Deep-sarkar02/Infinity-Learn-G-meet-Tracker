import { useEffect } from "react";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { useStudentController } from "../../controllers/student.controller";
import { toDateLabel, toTimeLabel } from "../../utils/date";
import { formatBookingStatusLabel } from "../../utils/bookingStatus";

export const BookingsPage = () => {
  const { bookings, fetchBookings } = useStudentController();

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  if (!bookings.length) {
    return (
      <EmptyState
        title="No bookings yet"
        description="Reserve a slot and your meetings will appear here."
      />
    );
  }

  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold">My Bookings</h2>
      <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2 text-xs leading-relaxed text-sky-950">
        Bookings <strong>cannot be cancelled</strong> here after they are confirmed. Contact your
        coordinator if you need to change a session.
      </p>
      <div className="space-y-3">
        {bookings.map((booking) => (
          <div key={booking._id} className="rounded-xl border border-slate-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-800">{toDateLabel(booking.date)}</p>
              <Badge variant="info">
                {formatBookingStatusLabel(booking.status, { rescheduledAt: booking.rescheduledAt })}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {toTimeLabel(booking.startTime)} - {toTimeLabel(booking.endTime)} UTC
            </p>
            {booking.status === "scheduled" && booking.meetingLink ? (
              <a
                href={booking.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-medium text-brand-700"
              >
                Join Meeting
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
};
