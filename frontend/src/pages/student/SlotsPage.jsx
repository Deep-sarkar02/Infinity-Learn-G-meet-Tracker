import { useEffect, useMemo, useState } from "react";
import { FiCalendar } from "react-icons/fi";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Loader } from "../../components/ui/Loader";
import { TimeSlotButton } from "../../components/slots/TimeSlotButton";
import { BookingConfirmationModal } from "../../components/slots/BookingConfirmationModal";
import { BookingHero, BookingPanel } from "../../components/public/BookingPageChrome";
import { useStudentController } from "../../controllers/student.controller";
import { useAuthStore } from "../../models/auth.store";
import { nextDays, toIsoDate, toTimeLabel } from "../../utils/date";
import { cn } from "../../utils/cn";

export const SlotsPage = () => {
  const { user } = useAuthStore();
  const { slots, loading, bookingInProgress, fetchSlots, reserveSlot } =
    useStudentController();
  const [selectedDate, setSelectedDate] = useState(toIsoDate(new Date()));
  const [selection, setSelection] = useState(null);

  const days = useMemo(() => nextDays(7), []);

  useEffect(() => {
    fetchSlots({ grade: user?.grade, date: selectedDate });
  }, [fetchSlots, selectedDate, user?.grade]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible" && user?.grade) {
        fetchSlots({ grade: user.grade, date: selectedDate });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchSlots, selectedDate, user?.grade]);

  const handleConfirm = async () => {
    if (!selection) return;
    const success = await reserveSlot({
      availabilityId: selection.teacher.availabilityId,
      slotId: selection.teacher.slotId,
    });
    if (success) {
      setSelection(null);
      await fetchSlots({ grade: user?.grade, date: selectedDate });
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <BookingHero
        eyebrow="Student workspace"
        title="Book a slot"
        description="Pick a date, then choose an available teacher. Confirm your selection in the dialog."
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-[#FFFFFF]/25 bg-[#FFFFFF]/10 px-3 py-1.5 text-xs font-semibold text-[#F4D35E]">
          <FiCalendar className="h-4 w-4" />
          7-day view
        </span>
      </BookingHero>

      <BookingPanel>
        <h2 className="font-heading text-lg font-bold text-[#0B3C5D]">Select a date</h2>
        <p className="mt-1 text-sm font-medium text-[#1E73D8]/88">
          Showing slots for your grade. Tap a day to load availability.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
          {days.map((day) => {
            const iso = toIsoDate(day);
            const active = iso === selectedDate;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDate(iso)}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-center text-xs font-bold transition",
                  active
                    ? "border-[#1E73D8] bg-[#1E73D8] text-[#FFFFFF] shadow-[0_8px_20px_-8px_rgba(30,115,216,0.45)]"
                    : "border-[#8BBCEB]/45 bg-[#F5F5F5] text-[#0B3C5D] hover:border-[#1E73D8]/35",
                )}
              >
                {day.toLocaleDateString("en-US", { weekday: "short", day: "2-digit" })}
              </button>
            );
          })}
        </div>
      </BookingPanel>

      {slots.length ? (
        <BookingPanel className="space-y-4">
          {slots.map((slot) => (
            <div
              key={`${slot.startTime}${slot.endTime}`}
              className="rounded-2xl border border-[#8BBCEB]/35 bg-[#F5F5F5]/50 p-4"
            >
              <div className="mb-3 text-sm font-bold text-[#0B3C5D]">
                {toTimeLabel(slot.startTime)} – {toTimeLabel(slot.endTime)} UTC
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {slot.teachers.map((teacher) => (
                  <TimeSlotButton
                    key={teacher.slotId}
                    label={`Book with ${teacher.teacherName}`}
                    onClick={() => setSelection({ slot, teacher })}
                  />
                ))}
              </div>
            </div>
          ))}
        </BookingPanel>
      ) : (
        <EmptyState
          tone="brand"
          title={loading ? "Loading slots…" : "No slots available"}
          description="Try another date or check back later."
        />
      )}

      <BookingConfirmationModal
        open={Boolean(selection)}
        selection={selection}
        onClose={() => setSelection(null)}
        onConfirm={handleConfirm}
      />
      {bookingInProgress ? (
        <div className="flex justify-center py-2">
          <Loader label="Booking in progress…" variant="admin" />
        </div>
      ) : null}
    </div>
  );
};
