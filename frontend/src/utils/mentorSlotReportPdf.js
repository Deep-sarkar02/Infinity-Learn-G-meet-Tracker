import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatBookingStatusLabel } from "./bookingStatus";

const IST = "Asia/Kolkata";

/** Official Infinity Learn mark — same asset as `AppLogo` (`/il-logo.png`). */
const BRAND_LOGO_URL = `${import.meta.env.BASE_URL}il-logo.png`;
const BRAND_LOGO_ASPECT = 100 / 56;

let brandLogoDataUrlCache = null;

const loadBrandLogoDataUrl = async () => {
  if (brandLogoDataUrlCache) return brandLogoDataUrlCache;
  try {
    const res = await fetch(BRAND_LOGO_URL);
    if (!res.ok) return null;
    const blob = await res.blob();
    brandLogoDataUrlCache = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return brandLogoDataUrlCache;
  } catch {
    return null;
  }
};

/** MeetReserve admin palette */
const COLORS = {
  navy: [11, 60, 93],
  blue: [30, 115, 216],
  lightBlue: [139, 188, 235],
  sky: [232, 242, 252],
  panel: [248, 251, 255],
  white: [255, 255, 255],
  ink: [11, 60, 93],
  muted: [30, 115, 216],
  accent: [244, 211, 94],
  border: [139, 188, 235],
  footer: [100, 130, 160],
};

const formatIstDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      timeZone: IST,
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const formatIstTime = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      timeZone: IST,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
};

const slotStatusLabel = (slot) => {
  if (slot.bookingStatus) {
    return formatBookingStatusLabel(slot.bookingStatus);
  }
  if (slot.isBooked) return "Booked";
  return "Open";
};

const safeFilenamePart = (value) =>
  String(value ?? "mentor")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "mentor";

const setFill = (doc, [r, g, b]) => doc.setFillColor(r, g, b);
const setText = (doc, [r, g, b]) => doc.setTextColor(r, g, b);
const setDraw = (doc, [r, g, b]) => doc.setDrawColor(r, g, b);

const pageWidth = (doc) => doc.internal.pageSize.getWidth();
const pageHeight = (doc) => doc.internal.pageSize.getHeight();

const drawPageChrome = (doc, margin, { fullHeader = true } = {}) => {
  setFill(doc, COLORS.panel);
  doc.rect(0, 0, pageWidth(doc), pageHeight(doc), "F");

  if (!fullHeader) {
    setFill(doc, COLORS.navy);
    doc.rect(0, 0, pageWidth(doc), 14, "F");
    return;
  }

  setFill(doc, COLORS.navy);
  doc.rect(0, 0, pageWidth(doc), 88, "F");
  setFill(doc, COLORS.blue);
  doc.rect(pageWidth(doc) * 0.45, 0, pageWidth(doc) * 0.55, 88, "F");
  setFill(doc, COLORS.lightBlue);
  doc.circle(pageWidth(doc) - 36, 18, 42, "F");

  setDraw(doc, COLORS.border);
  doc.setLineWidth(0.6);
  doc.line(margin, pageHeight(doc) - 28, pageWidth(doc) - margin, pageHeight(doc) - 28);
};

const drawHeader = (doc, margin, periodLabel, logoDataUrl) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setText(doc, COLORS.accent);
  doc.text("MENTOR CAPACITY", margin, 28);

  doc.setFontSize(20);
  setText(doc, COLORS.white);
  doc.text("Mentor slot report", margin, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(doc, COLORS.sky);
  doc.text(logoDataUrl ? "MeetReserve" : "Infinity Learn · MeetReserve", margin, 62);

  const rightColW = 132;
  const rightX = pageWidth(doc) - margin - rightColW;

  
  };

const drawInfoPanel = (doc, margin, y, report, periodLabel) => {
  const panelW = pageWidth(doc) - margin * 2;
  const panelH = 52;
  setFill(doc, COLORS.white);
  setDraw(doc, COLORS.border);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, panelW, panelH, 6, 6, "FD");

  setFill(doc, COLORS.blue);
  doc.rect(margin, y, 4, panelH, "F");

  const labelX = margin + 16;
  const valueX = margin + 72;
  let rowY = y + 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(doc, COLORS.muted);
  doc.text("Mentor", labelX, rowY);
  doc.setFont("helvetica", "normal");
  setText(doc, COLORS.ink);
  const mentorLine = `${report.mentor.teacherName}${report.mentor.teacherEmail ? ` · ${report.mentor.teacherEmail}` : ""}`;
  doc.text(mentorLine, valueX, rowY);

  rowY += 16;
  doc.setFont("helvetica", "bold");
  setText(doc, COLORS.muted);
  doc.text("Period", labelX, rowY);
  doc.setFont("helvetica", "normal");
  setText(doc, COLORS.ink);
  doc.text(periodLabel, valueX, rowY);

  return y + panelH + 18;
};

const tableStyles = {
  theme: "plain",
  styles: {
    font: "helvetica",
    fontSize: 8,
    cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
    lineColor: COLORS.border,
    lineWidth: 0.4,
    textColor: COLORS.ink,
  },
  headStyles: {
    fillColor: COLORS.blue,
    textColor: COLORS.white,
    fontStyle: "bold",
    fontSize: 8,
  },
  alternateRowStyles: {
    fillColor: COLORS.panel,
  },
  margin: { left: 40, right: 40 },
};

const drawSectionTitle = (doc, margin, y, title) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(doc, COLORS.ink);
  doc.text(title, margin, y);
  setDraw(doc, COLORS.lightBlue);
  doc.setLineWidth(2);
  doc.line(margin, y + 4, margin + 48, y + 4);
  return y + 14;
};

/**
 * @param {object} report — API response from getMentorSlotReport
 */
export const downloadMentorSlotReportPdf = async (report) => {
  if (!report?.mentor) return;

  const logoDataUrl = await loadBrandLogoDataUrl();
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 40;

  const periodLabel = report.week
    ? `Week ${report.week} · ${report.fromYmd} — ${report.toYmd} (IST)`
    : `${report.fromYmd} — ${report.toYmd} (IST)`;

  drawPageChrome(doc, margin);
  drawHeader(doc, margin, periodLabel, logoDataUrl);
  let y = drawInfoPanel(doc, margin, 100, report, periodLabel);

  const s = report.summary ?? {};
  y = drawSectionTitle(doc, margin, y, "Summary");

  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head: [["Metric", "Count"]],
    body: [
      ["Slots offered", String(s.slotsOffered ?? 0)],
      ["Booked", String(s.slotsBooked ?? 0)],
      ["Unbooked", String(s.slotsUnbooked ?? 0)],
      ["Booking rate", `${s.bookingRatePercent ?? 0}%`],
      ["Completed", String(s.completed ?? 0)],
      ["Student did not join", String(s.studentDidNotJoin ?? 0)],
      ["Teacher did not join", String(s.teacherDidNotJoin ?? 0)],
      ["Cancelled", String(s.cancelled ?? 0)],
    ],
    headStyles: {
      ...tableStyles.headStyles,
      fillColor: COLORS.navy,
    },
    columnStyles: {
      0: { cellWidth: 200, fontStyle: "bold", textColor: COLORS.muted },
      1: { halign: "right", fontStyle: "bold", textColor: COLORS.ink },
    },
  });

  y = doc.lastAutoTable.finalY + 22;
  y = drawSectionTitle(doc, margin, y, `Slots provided (${report.slots?.length ?? 0})`);

  const slotRows =
    report.slots?.map((slot) => [
      formatIstDate(slot.startTime),
      formatIstTime(slot.startTime),
      formatIstTime(slot.endTime),
      slotStatusLabel(slot),
    ]) ?? [];

  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head: [["Date", "Start", "End", "Status"]],
    body: slotRows.length ? slotRows : [["—", "—", "—", "No slots in this period"]],
    columnStyles: {
      3: { fontStyle: "bold", textColor: COLORS.blue },
    },
  });

  y = doc.lastAutoTable.finalY + 22;

  if (y > pageHeight(doc) - 100) {
    doc.addPage();
    drawPageChrome(doc, margin, { fullHeader: false });
    y = margin + 8;
  }

  y = drawSectionTitle(doc, margin, y, `Bookings (${report.bookings?.length ?? 0})`);

  const bookingRows =
    report.bookings?.map((b) => [
      formatIstDate(b.startTime),
      `${formatIstTime(b.startTime)} – ${formatIstTime(b.endTime)}`,
      b.learnerName ?? "—",
      b.learnerGrade ? `Grade ${b.learnerGrade}` : "—",
      b.batchName || b.batchId || (b.bookingKind === "student" ? "Student app" : "—"),
      formatBookingStatusLabel(b.status, b),
    ]) ?? [];

  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head: [["Date", "Time", "Learner", "Grade", "Batch / channel", "Status"]],
    body: bookingRows.length
      ? bookingRows
      : [["—", "—", "—", "—", "—", "No bookings in this period"]],
    bodyStyles: { fontSize: 7 },
    headStyles: { ...tableStyles.headStyles, fontSize: 7 },
    columnStyles: {
      1: { cellWidth: 76 },
      4: { cellWidth: 78 },
      5: { fontStyle: "bold", textColor: COLORS.blue },
    },
  });

  const generatedAt = new Date().toLocaleString("en-IN", { timeZone: IST });
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    if (i > 1) {
      drawPageChrome(doc, margin, { fullHeader: false });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setText(doc, COLORS.footer);
    doc.text(
      `Generated ${generatedAt} IST · Page ${i} of ${pageCount}`,
      margin,
      pageHeight(doc) - 14,
    );
    if (logoDataUrl) {
      const footerLogoH = 30;
      const footerLogoW = footerLogoH * BRAND_LOGO_ASPECT;
      doc.addImage(
        logoDataUrl,
        "PNG",
        pageWidth(doc) - margin - footerLogoW,
        pageHeight(doc) - footerLogoH,
        footerLogoW,
        footerLogoH,
      );
    } else {
      doc.setFont("helvetica", "bold");
      setText(doc, COLORS.muted);
      doc.text("MeetReserve", pageWidth(doc) - margin - 52, pageHeight(doc) - 14);
    }
  }

  const filename = `mentor-report-${safeFilenamePart(report.mentor.teacherName)}-${report.fromYmd}-${report.toYmd}.pdf`;
  doc.save(filename);
};
