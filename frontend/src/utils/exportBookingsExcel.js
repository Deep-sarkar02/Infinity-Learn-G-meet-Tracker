import * as XLSX from "xlsx";
import { formatBookingStatusLabel } from "./bookingStatus";

const IST = "Asia/Kolkata";

const formatIstDateTime = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      timeZone: IST,
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
};

const bookingToExcelRow = (row) => ({
  "Booking ID": row._id ?? "",
  "Start (IST)": formatIstDateTime(row.startTime),
  "End (IST)": formatIstDateTime(row.endTime),
  Status: formatBookingStatusLabel(row.status, { rescheduledAt: row.rescheduledAt }),
  Learner: row.learnerName ?? "",
  "Learner grade": row.learnerGrade ?? "",
  "Booking channel": row.bookingKind ?? "",
  "Contact email": row.contactEmail ?? "",
  "Batch ID": row.batchId ?? "",
  "Batch name": row.batchName ?? "",
  Teacher: row.teacherName ?? "",
  "Teacher email": row.teacherEmail ?? "",
  "Teacher grade": row.teacherGrade ?? "",
  "Meeting link": row.meetingLink ?? "",
  "Recording URL": row.recordingUrl ?? "",
  "Transcript URL": row.transcriptUrl ?? "",
  "Google Calendar event ID": row.googleCalendarEventId ?? "",
  "Created (IST)": formatIstDateTime(row.createdAt),
  "Updated (IST)": formatIstDateTime(row.updatedAt),
});

const safeFilenamePart = (value) =>
  String(value ?? "")
    .replace(/[^\w-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

/**
 * @param {object[]} rows — admin booking list items
 * @param {{ label?: string }} [options]
 */
export const downloadBookingsExcel = (rows, { label = "" } = {}) => {
  const sheetRows = rows.length ? rows.map(bookingToExcelRow) : [bookingToExcelRow({})];
  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Bookings");

  const suffix = label ? `-${safeFilenamePart(label)}` : "";
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `bookings${suffix}-${stamp}.xlsx`);
};
