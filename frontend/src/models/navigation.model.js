import {
  FiCalendar,
  FiClipboard,
  FiClock,
  FiHome,
  FiSettings,
  FiUsers,
} from "react-icons/fi";

export const navigationByRole = {
  admin: [
    { label: "Dashboard", path: "/admin", icon: FiHome },
    { label: "Add Teacher", path: "/admin/teachers/add", icon: FiUsers },
    { label: "Manage Teachers", path: "/admin/teachers", icon: FiUsers },
    { label: "Booking Window", path: "/admin/booking-window", icon: FiSettings },
    { label: "Student roster", path: "/admin/roster", icon: FiClipboard },
    { label: "Bookings", path: "/admin/bookings", icon: FiCalendar },
  ],
  teacher: [
    { label: "Dashboard", path: "/teacher", icon: FiHome },
    { label: "Availability", path: "/teacher/availability", icon: FiClock },
    { label: "Calendar", path: "/teacher/calendar", icon: FiCalendar },
  ],
};
