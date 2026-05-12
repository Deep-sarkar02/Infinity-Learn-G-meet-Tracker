import { useCallback, useState } from "react";
import { studentService } from "../services/student.service";
import { useToast } from "../hooks/useToast";

export const useStudentController = () => {
  const { pushToast } = useToast();
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  const fetchSlots = useCallback(async (params) => {
    setLoading(true);
    try {
      const { data } = await studentService.getSlots(params);
      setSlots(data.data);
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Unable to fetch slots",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await studentService.getMyBookings();
      setBookings(data.data);
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Unable to fetch bookings",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  const reserveSlot = useCallback(async ({ availabilityId, slotId }) => {
    if (bookingInProgress) return;
    setBookingInProgress(true);
    try {
      await studentService.bookSlot({ availabilityId, slotId });
      pushToast({ title: "Slot booked successfully" });
      await fetchBookings();
      return true;
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Unable to book slot",
        variant: "error",
      });
      return false;
    } finally {
      setBookingInProgress(false);
    }
  }, [bookingInProgress, fetchBookings, pushToast]);

  return {
    slots,
    bookings,
    loading,
    bookingInProgress,
    fetchSlots,
    fetchBookings,
    reserveSlot,
  };
};
