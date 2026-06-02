import publicApi from "./publicApi";

export const publicBookingService = {
  getBookingWindow: () => publicApi.get("/public/booking-window"),
  lookupStudent: (payload) => publicApi.post("/public/students/lookup", payload),
  getOpenSlots: (params) => publicApi.get("/public/slots", { params }),
  bookSlot: (payload) => publicApi.post("/public/bookings", payload),
  listRosterBookings: (params) => publicApi.get("/public/bookings", { params }),
};
