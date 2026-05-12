import apiClient from "./apiClient";

export const studentService = {
  getSlots: (params) => apiClient.get("/availability/student", { params }),
  bookSlot: (payload) => apiClient.post("/bookings", payload),
  getMyBookings: () => apiClient.get("/bookings/me"),
};
