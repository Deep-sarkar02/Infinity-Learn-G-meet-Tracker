import { useCallback, useEffect, useState } from "react";
import { teacherService } from "../services/teacher.service";
import { useToast } from "../hooks/useToast";

export const useTeacherController = () => {
  const [calendar, setCalendar] = useState([]);
  const [bookingWindowDays, setBookingWindowDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const { pushToast } = useToast();

  const loadCalendar = useCallback(async (params) => {
    setLoading(true);
    try {
      const { data } = await teacherService.getCalendar(params);
      if (Array.isArray(data.data)) {
        setCalendar(data.data);
        return;
      }
      setCalendar(data.data?.calendar || []);
      setBookingWindowDays(Number(data.data?.bookingWindowDays) || 7);
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Failed to load calendar",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  const saveAvailability = useCallback(async (payload) => {
    setLoading(true);
    try {
      await teacherService.setAvailability(payload);
      pushToast({ title: "Availability saved" });
      await loadCalendar();
      return true;
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Failed to save slots",
        variant: "error",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadCalendar, pushToast]);

  const updateSlot = useCallback(async ({ availabilityId, slotId, startTime, endTime }) => {
    setLoading(true);
    try {
      await teacherService.updateSlot(availabilityId, slotId, { startTime, endTime });
      pushToast({ title: "Slot updated" });
      await loadCalendar();
      return true;
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Failed to update slot",
        variant: "error",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadCalendar, pushToast]);

  useEffect(() => {
    const onBookingChange = () => {
      void loadCalendar();
    };
    window.addEventListener("il:teacher-booking-status-changed", onBookingChange);
    return () => window.removeEventListener("il:teacher-booking-status-changed", onBookingChange);
  }, [loadCalendar]);

  const deleteSlot = useCallback(async ({ availabilityId, slotId }) => {
    setLoading(true);
    try {
      await teacherService.deleteSlot(availabilityId, slotId);
      pushToast({ title: "Slot deleted" });
      await loadCalendar();
      return true;
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Failed to delete slot",
        variant: "error",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadCalendar, pushToast]);

  const fetchRescheduleOptions = useCallback(
    async (bookingId) => {
      try {
        const { data } = await teacherService.getBookingRescheduleOptions(bookingId);
        return Array.isArray(data.data) ? data.data : [];
      } catch (error) {
        pushToast({
          title: error.response?.data?.message || "Could not load open slots",
          variant: "error",
        });
        return [];
      }
    },
    [pushToast],
  );

  const rescheduleTeacherBooking = useCallback(
    async (bookingId, payload) => {
      try {
        await teacherService.rescheduleTeacherBooking(bookingId, payload);
        pushToast({ title: "Booking rescheduled" });
        await loadCalendar();
        window.dispatchEvent(new CustomEvent("il:teacher-booking-status-changed"));
        return true;
      } catch (error) {
        pushToast({
          title: error.response?.data?.message || "Failed to reschedule",
          variant: "error",
        });
        return false;
      }
    },
    [loadCalendar, pushToast],
  );

  const cancelTeacherBooking = useCallback(
    async (bookingId, payload = {}) => {
      try {
        await teacherService.cancelTeacherBooking(bookingId, payload);
        pushToast({ title: "Booking cancelled" });
        await loadCalendar();
        window.dispatchEvent(new CustomEvent("il:teacher-booking-status-changed"));
        return true;
      } catch (error) {
        pushToast({
          title: error.response?.data?.message || "Failed to cancel booking",
          variant: "error",
        });
        return false;
      }
    },
    [loadCalendar, pushToast],
  );

  return {
    calendar,
    bookingWindowDays,
    loading,
    loadCalendar,
    saveAvailability,
    updateSlot,
    deleteSlot,
    fetchRescheduleOptions,
    rescheduleTeacherBooking,
    cancelTeacherBooking,
  };
};
