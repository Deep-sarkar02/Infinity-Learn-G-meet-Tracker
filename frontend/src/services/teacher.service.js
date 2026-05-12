import apiClient from "./apiClient";

export const teacherService = {
  setAvailability: (payload) => apiClient.post("/availability/teacher", payload),
  getCalendar: (params) => apiClient.get("/availability/teacher", { params }),
  updateSlot: (availabilityId, slotId, payload) =>
    apiClient.patch(`/availability/teacher/${availabilityId}/slots/${slotId}`, payload),
  deleteSlot: (availabilityId, slotId) =>
    apiClient.delete(`/availability/teacher/${availabilityId}/slots/${slotId}`),
  getTeacherPendingCompletion: () => apiClient.get("/bookings/teacher/pending-completion"),
  getTeacherBookingHistory: (params) => apiClient.get("/bookings/teacher/history", { params }),
  completeTeacherBooking: (bookingId, payload = {}) =>
    apiClient.patch(`/bookings/teacher/${bookingId}/complete`, payload),
  getBookingRescheduleOptions: (bookingId) =>
    apiClient.get(`/bookings/teacher/${bookingId}/reschedule-options`),
  rescheduleTeacherBooking: (bookingId, payload) =>
    apiClient.patch(`/bookings/teacher/${bookingId}/reschedule`, payload),
  cancelTeacherBooking: (bookingId, payload = {}) =>
    apiClient.patch(`/bookings/teacher/${bookingId}/cancel`, payload),
};
