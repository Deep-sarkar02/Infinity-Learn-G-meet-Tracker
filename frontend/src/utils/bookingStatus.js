/** @typedef {{ rescheduledAt?: string | Date | null }} BookingStatusMeta */

const hasRescheduled = (meta) => {
  const v = meta?.rescheduledAt;
  if (v == null || v === "") return false;
  const t = new Date(v).getTime();
  return !Number.isNaN(t);
};

/** Display label for booking `status` stored in API / DB. */
export const formatBookingStatusLabel = (status, meta = /** @type {BookingStatusMeta} */ ({})) => {
  if (status === "scheduled" && hasRescheduled(meta)) {
    return "Rescheduled";
  }
  switch (status) {
    case "scheduled":
      return "Scheduled";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "student_did_not_join":
      return "Student did not join";
    case "teacher_did_not_join":
      return "Teacher did not join";
    default:
      return status || "—";
  }
};

/** Teacher calendar booked row — short badge text. */
export const formatBookingStatusShortBadge = (status, meta = /** @type {BookingStatusMeta} */ ({})) => {
  if (status === "scheduled" && hasRescheduled(meta)) {
    return "Rescheduled";
  }
  switch (status) {
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "student_did_not_join":
      return "Student did not join";
    case "teacher_did_not_join":
      return "Teacher did not join";
    case "scheduled":
      return "Booked";
    default:
      return formatBookingStatusLabel(status, meta);
  }
};

export const isBookingSessionResolved = (status) =>
  status === "completed" ||
  status === "student_did_not_join" ||
  status === "teacher_did_not_join";

/** Student /book history status pill — Infinity Learn #007BFF palette. */
export const ilBookingStatusChipClassName = (status, meta = /** @type {BookingStatusMeta} */ ({})) => {
  if (status === "scheduled" && hasRescheduled(meta)) {
    return "bg-[#EAF4FF] text-[#007BFF]";
  }
  switch (status) {
    case "completed":
      return "bg-[#E8F8EF] text-[#16A34A]";
    case "scheduled":
      return "bg-[#E8F8EF] text-[#16A34A]";
    case "cancelled":
      return "bg-[#F5F5F5] text-[#8A8A8A]";
    case "student_did_not_join":
      return "bg-[#FFFBEB] text-[#B45309]";
    case "teacher_did_not_join":
      return "bg-[#FEE2E2] text-[#DC2626]";
    default:
      return "bg-[#F5F5F5] text-[#8A8A8A]";
  }
};

/** Admin / history table status pill background + text (Tailwind classes). */
export const bookingStatusChipClassName = (status, meta = /** @type {BookingStatusMeta} */ ({})) => {
  if (status === "scheduled" && hasRescheduled(meta)) {
    return "bg-[#1E73D8]/18 text-[#0B3C5D]";
  }
  switch (status) {
    case "completed":
      return "bg-[#8BBCEB]/35 text-[#0B3C5D]";
    case "scheduled":
      return "bg-[#25D366]/20 text-[#0B3C5D]";
    case "cancelled":
      return "bg-[#F4D35E]/25 text-[#0B3C5D]";
    case "student_did_not_join":
      return "bg-[#FDBA74]/40 text-[#0B3C5D]";
    case "teacher_did_not_join":
      return "bg-[#FCA5A5]/40 text-[#0B3C5D]";
    default:
      return "bg-[#F4D35E]/25 text-[#0B3C5D]";
  }
};
