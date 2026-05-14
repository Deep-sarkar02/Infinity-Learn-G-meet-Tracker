import apiClient from "./apiClient";

export const adminService = {
  listTeachers: () => apiClient.get("/admin/teachers"),
  createTeacher: (payload) => apiClient.post("/admin/teachers", payload),
  bulkCreateTeachers: (teachers) => apiClient.post("/admin/teachers/bulk", { teachers }),
  assignGrade: (teacherId, grade) =>
    apiClient.patch(`/admin/teachers/${teacherId}/grade`, { grade }),
  updateTeacher: (teacherId, payload) =>
    apiClient.patch(`/admin/teachers/${teacherId}`, payload),
  regenerateTeacherPassword: (teacherId, sendEmail = true) =>
    apiClient.post(`/admin/teachers/${teacherId}/regenerate-password`, { sendEmail }),
  configureBookingWindow: (bookingWindowDays) =>
    apiClient.patch("/admin/booking-window", { bookingWindowDays }),
  getBookingWindow: () => apiClient.get("/admin/booking-window"),
  bulkImportRoster: (students) =>
    apiClient.post("/admin/roster-students/bulk", { students }),
  listRosterStudents: (params) => apiClient.get("/admin/roster-students", { params }),
  listBookings: (params) => apiClient.get("/admin/bookings", { params }),
  patchBookingMedia: (bookingId, payload) =>
    apiClient.patch(`/admin/bookings/${bookingId}/media`, payload),
  getBookingDashboardStats: (params) => apiClient.get("/admin/bookings/dashboard-stats", { params }),
  getBookingWeekdayStats: (params) => apiClient.get("/admin/bookings/weekday-stats", { params }),
  /** Last LSQ artifact poller batch (admin debug; browser console logs this). */
  getLsqArtifactsSyncTelemetry: () => apiClient.get("/admin/lsq-artifacts-sync-telemetry"),
};
