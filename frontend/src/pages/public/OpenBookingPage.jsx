import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiCalendar, FiCheckCircle, FiChevronDown, FiClock, FiList, FiMail, FiUser } from "react-icons/fi";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Loader } from "../../components/ui/Loader";
import { EmptyState } from "../../components/ui/EmptyState";
import { InfoModal } from "../../components/ui/InfoModal";
import { BookingHero, BookingNotice, BookingPanel } from "../../components/public/BookingPageChrome";
import { publicBookingService } from "../../services/public.service";
import { useToast } from "../../hooks/useToast";
import { nextDays, toDateLabel, toIsoDate, toTimeLabel } from "../../utils/date";
import { bookingStatusChipClassName, formatBookingStatusLabel } from "../../utils/bookingStatus";
import { isValidContactEmail, validateLookupForm } from "../../utils/validators";
import { cn } from "../../utils/cn";
import { logParentWhatsAppFromApi } from "../../utils/parentWhatsAppConsole";
import { logLsqProspectActivityFromApi } from "../../utils/lsqProspectActivityConsole";

const RESCHEDULE_ACK_STORAGE_KEY = "il_open_booking_reschedule_ack_v1";

const readRescheduleAckRoot = () => {
  try {
    const raw = sessionStorage.getItem(RESCHEDULE_ACK_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
};

const getRescheduleAckForRoster = (rosterId) => {
  const root = readRescheduleAckRoot();
  const entry = root[String(rosterId)];
  return entry && typeof entry === "object" ? entry : {};
};

const mergeRescheduleAcks = (rosterId, updates) => {
  const root = readRescheduleAckRoot();
  const prev = getRescheduleAckForRoster(rosterId);
  root[String(rosterId)] = { ...prev, ...updates };
  sessionStorage.setItem(RESCHEDULE_ACK_STORAGE_KEY, JSON.stringify(root));
};

const publicSlotStateLabel = (slotState) => {
  switch (slotState) {
    case "available":
      return "Available";
    case "yours":
      return "Yours";
    case "taken":
      return "Taken";
    case "cancelled":
      return "Cancelled";
    default:
      return slotState || "—";
  }
};

export const OpenBookingPage = () => {
  const { pushToast } = useToast();
  const [step, setStep] = useState(1);
  const [lookupForm, setLookupForm] = useState({ mobile: "" });
  const [lookupMatches, setLookupMatches] = useState([]);
  const [lookupModalOpen, setLookupModalOpen] = useState(false);
  const [roster, setRoster] = useState(null);
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(toIsoDate(new Date()));
  const [openData, setOpenData] = useState(null);
  const [lookupErrors, setLookupErrors] = useState({});
  const [slotReleasedBanner, setSlotReleasedBanner] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingSuccessOpen, setBookingSuccessOpen] = useState(false);
  const [bookingSuccessEmail, setBookingSuccessEmail] = useState("");
  const [bookingSuccessMeetingLink, setBookingSuccessMeetingLink] = useState("");
  const [bookingHistory, setBookingHistory] = useState([]);
  const [bookingHistoryLoading, setBookingHistoryLoading] = useState(false);
  const [bookingHistoryError, setBookingHistoryError] = useState("");
  const [bookingHistorySectionOpen, setBookingHistorySectionOpen] = useState(false);
  const [rescheduleNotice, setRescheduleNotice] = useState({ open: false, items: [] });
  const rescheduleNoticeShownRef = useRef(false);
  const prevHadBookingRef = useRef(null);

  const days = useMemo(() => nextDays(14), []);

  const loadSlots = useCallback(
    async (rosterStudentId, date) => {
      setLoading(true);
      try {
        const { data } = await publicBookingService.getOpenSlots({
          rosterStudentId,
          date,
        });
        setOpenData(data.data);
      } catch (error) {
        pushToast({
          title: error.response?.data?.message || "Unable to load slots",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [pushToast],
  );

  const loadBookingHistory = useCallback(async (rosterStudentId, mobile) => {
    setBookingHistoryLoading(true);
    setBookingHistoryError("");
    try {
      const { data } = await publicBookingService.listRosterBookings({
        rosterStudentId,
        mobile,
      });
      setBookingHistory(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      setBookingHistory([]);
      setBookingHistoryError(error.response?.data?.message || "Unable to load booking history");
    } finally {
      setBookingHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 2 && roster) {
      loadSlots(roster.id, selectedDate);
    }
  }, [step, roster, selectedDate, loadSlots]);

  useEffect(() => {
    if (step !== 2 || !roster?.id || !roster?.mobile) return undefined;
    loadBookingHistory(roster.id, roster.mobile);
    return undefined;
  }, [step, roster?.id, roster?.mobile, loadBookingHistory]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible" || step !== 2 || !roster) return;
      loadSlots(roster.id, selectedDate);
      if (roster.mobile) {
        loadBookingHistory(roster.id, roster.mobile);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [step, roster, selectedDate, loadSlots, loadBookingHistory]);

  useEffect(() => {
    if (step !== 2 || !roster?.id || bookingHistoryLoading) return;
    if (bookingSuccessOpen || bookingInProgress || lookupModalOpen) return;
    const rosterId = String(roster.id);
    const ack = getRescheduleAckForRoster(rosterId);
    const nowMs = Date.now();
    const unseen = bookingHistory.filter((b) => {
      if (!b?.rescheduledAt) return false;
      if (b.status !== "scheduled") return false;
      const startMs = new Date(b.startTime).getTime();
      if (!Number.isFinite(startMs) || startMs <= nowMs) return false;
      const bid = String(b._id);
      return ack[bid] !== String(b.rescheduledAt);
    });
    if (unseen.length === 0) {
      rescheduleNoticeShownRef.current = false;
      return;
    }
    if (rescheduleNoticeShownRef.current) return;
    rescheduleNoticeShownRef.current = true;
    setRescheduleNotice({
      open: true,
      items: unseen.map((b) => ({
        id: String(b._id),
        rescheduledAt: String(b.rescheduledAt),
        startTime: b.startTime,
        endTime: b.endTime,
        teacherName:
          b.teacherId && typeof b.teacherId === "object" ? b.teacherId.name : "Teacher",
      })),
    });
  }, [
    step,
    roster?.id,
    bookingHistory,
    bookingHistoryLoading,
    bookingSuccessOpen,
    bookingInProgress,
    lookupModalOpen,
  ]);

  const closeRescheduleNotice = useCallback(() => {
    const rosterId = roster?.id;
    setRescheduleNotice((prev) => {
      if (rosterId && prev.items.length) {
        const updates = Object.fromEntries(
          prev.items.map((row) => [row.id, row.rescheduledAt]),
        );
        mergeRescheduleAcks(rosterId, updates);
      }
      rescheduleNoticeShownRef.current = false;
      return { open: false, items: [] };
    });
  }, [roster?.id]);

  useEffect(() => {
    if (step !== 2 || !openData) return;
    const has = Boolean(openData.hasBookingToday && openData.currentBooking);
    if (prevHadBookingRef.current === true && has === false) {
      setSlotReleasedBanner(true);
      const t = window.setTimeout(() => setSlotReleasedBanner(false), 10000);
      return () => window.clearTimeout(t);
    }
    prevHadBookingRef.current = has;
  }, [openData, step]);

  const handleLookup = async (event) => {
    event.preventDefault();
    const { ok, errors, values } = validateLookupForm(lookupForm);
    if (!ok) {
      setLookupErrors(errors);
      pushToast({
        title: "Please fix the fields marked below",
        variant: "error",
      });
      return;
    }
    setLookupErrors({});
    setLoading(true);
    try {
      const { data } = await publicBookingService.lookupStudent(values);
      const matches = data.data?.students ?? [];
      if (!matches.length) {
        pushToast({ title: "No student found for this mobile number", variant: "error" });
        return;
      }
      setLookupMatches(matches);
      setLookupModalOpen(true);
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Unable to verify student",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChooseStudent = (student) => {
    setLookupModalOpen(false);
    setLookupMatches([]);
    setRoster(student);
    setContactEmail("");
    setStep(2);
    pushToast({ title: "Student verified" });
  };

  const closeLookupModal = () => {
    setLookupModalOpen(false);
    setLookupMatches([]);
  };

  const emailOk = isValidContactEmail(contactEmail);

  const handleBook = async (teacher) => {
    if (!roster || !teacher.canBook) return;
    if (!emailOk) {
      pushToast({ title: "Please enter a valid email for the meeting invite", variant: "error" });
      return;
    }
    setBookingInProgress(true);
    try {
      const { data } = await publicBookingService.bookSlot({
        mobile: roster.mobile,
        name: roster.name,
        rosterStudentId: roster.id,
        availabilityId: teacher.availabilityId,
        slotId: teacher.slotId,
        contactEmail: contactEmail.trim(),
      });
      // console.warn(
      //   "[Infinity Learn] Open booking API succeeded — LeadSquared section follows (same response as WhatsApp).",
      // );
      logParentWhatsAppFromApi(data);
      logLsqProspectActivityFromApi(data);
      await loadSlots(roster.id, selectedDate);
      await loadBookingHistory(roster.id, roster.mobile);
      setBookingSuccessEmail(contactEmail.trim());
      const link =
        typeof data.data?.meetingLink === "string" ? data.data.meetingLink.trim() : "";
      setBookingSuccessMeetingLink(link);
      setBookingSuccessOpen(true);
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Unable to book slot",
        variant: "error",
      });
    } finally {
      setBookingInProgress(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <BookingHero
          eyebrow="Open booking"
          title="Reserve your session"
          description="No login required. Verify your roster details, choose a day, and pick an available teacher slot. Meet links are sent to your email."
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-[#FFFFFF]/25 bg-[#FFFFFF]/10 px-3 py-1.5 text-xs font-semibold text-[#8BBCEB]">
            <FiCalendar className="h-4 w-4" />
            14-day horizon
          </span>
        </BookingHero>

        <BookingNotice title="Before you confirm">
          <p>
            <span className="font-bold text-[#0B3C5D]">You cannot cancel</span> through this portal once a booking is
            confirmed. To change or cancel, contact your coordinator or school office.
          </p>
        </BookingNotice>

        {step === 1 ? (
          <BookingPanel className="mx-auto max-w-lg">
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-[#F5F5F5] pb-5">
              <div>
                <h2 className="font-heading text-lg font-bold text-[#0B3C5D]">Verify your details</h2>
                <p className="mt-1 text-xs font-medium leading-relaxed text-[#1E73D8]/88">
                  Use the same <span className="font-bold text-[#0B3C5D]">10-digit mobile</span> on file (cannot start
                  with 0). We will show every roster profile linked to that number — tap yours to open booking.
                </p>
              </div>
              <div className="rounded-xl bg-[#F5F5F5] px-3 py-2 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#0B3C5D]">Step</p>
                <p className="font-heading text-xl font-black text-[#1E73D8]">01</p>
              </div>
            </div>
            <form className="space-y-4" onSubmit={handleLookup}>
              <Input
                tone="brand"
                label="Registered phone number"
                type="tel"
                inputMode="numeric"
                maxLength={20}
                value={lookupForm.mobile}
                error={lookupErrors.mobile}
                onChange={(event) => {
                  setLookupErrors((prev) => {
                    if (!prev.mobile) return prev;
                    const next = { ...prev };
                    delete next.mobile;
                    return next;
                  });
                  setLookupMatches([]);
                  setLookupModalOpen(false);
                  setLookupForm((prev) => ({ ...prev, mobile: event.target.value }));
                }}
                required
              />
              <Button type="submit" variant="adminPrimary" className="w-full justify-center py-3" disabled={loading}>
                {loading ? <Loader label="Checking…" variant="admin" /> : "Find student"}
              </Button>
            </form>
          </BookingPanel>
        ) : null}

        {step === 2 && roster ? (
          <div className="space-y-5">
            {slotReleasedBanner ? (
              <div
                className="relative overflow-hidden rounded-2xl border border-[#25D366]/45 bg-[#FFFFFF] p-4 shadow-[0_12px_32px_-16px_rgba(37,211,102,0.35)] md:p-5"
                role="status"
              >
                <div className="absolute left-0 top-0 h-full w-1.5 bg-[#25D366]" />
                <div className="flex gap-3 pl-4">
                  <FiCheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-[#25D366]" />
                  <div>
                    <p className="font-heading text-base font-bold text-[#0B3C5D]">You can book again</p>
                    <p className="mt-1 text-sm font-medium text-[#1E73D8]/90">
                      Your previous slot on this day was released. Choose a new time below.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <BookingPanel className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F5F5F5] text-[#1E73D8]">
                  <FiUser className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1E73D8]">Verified student</p>
                  <p className="font-heading text-xl font-bold text-[#0B3C5D]">{roster.name}</p>
                  <p className="mt-1 text-sm font-medium text-[#1E73D8]/90">
                    Grade {roster.grade}
                    {roster.display ? ` · Channel ${roster.display}` : ""}
                    {roster.batchId ? ` · Batch ID ${roster.batchId}` : ""}
                    {roster.batchName ? ` · ${roster.batchName}` : ""}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="adminGhost"
                onClick={() => {
                  setRoster(null);
                  setContactEmail("");
                  setOpenData(null);
                  setLookupMatches([]);
                  setLookupModalOpen(false);
                  setBookingHistory([]);
                  setBookingHistoryError("");
                  setBookingHistorySectionOpen(false);
                  setRescheduleNotice({ open: false, items: [] });
                  rescheduleNoticeShownRef.current = false;
                  setStep(1);
                }}
              >
                Change student
              </Button>
            </BookingPanel>

            <BookingPanel>
              <button
                type="button"
                className="mb-4 flex w-full items-center justify-between gap-3 border-b border-[#F5F5F5] pb-4 text-left transition hover:bg-[#F5F5F5]/60"
                onClick={() => setBookingHistorySectionOpen((open) => !open)}
                aria-expanded={bookingHistorySectionOpen}
                aria-controls="open-booking-history-panel"
                id="open-booking-history-heading"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FiList className="h-5 w-5 shrink-0 text-[#1E73D8]" aria-hidden />
                  <span className="font-heading text-lg font-bold text-[#0B3C5D]">Your booking history</span>
                </span>
                <FiChevronDown
                  aria-hidden
                  className={cn(
                    "h-5 w-5 shrink-0 text-[#1E73D8] transition-transform duration-200",
                    bookingHistorySectionOpen ? "rotate-180" : "rotate-0",
                  )}
                />
              </button>
              <div
                id="open-booking-history-panel"
                role="region"
                aria-labelledby="open-booking-history-heading"
                hidden={!bookingHistorySectionOpen}
              >
                <p className="mb-4 text-sm font-medium text-[#1E73D8]/88">
                  Up to 50 recent sessions for this profile (newest first). Same phone number and student record as when
                  you verified.
                </p>
                {bookingHistoryLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader label="Loading history…" variant="admin" />
                  </div>
                ) : bookingHistoryError ? (
                  <p className="text-sm font-medium text-[#B45309]">{bookingHistoryError}</p>
                ) : bookingHistory.length === 0 ? (
                  <p className="text-sm font-medium text-[#1E73D8]/80">No bookings yet for this student profile.</p>
                ) : (
                  <ul className="divide-y divide-[#8BBCEB]/25" aria-label="Booking history">
                    {bookingHistory.map((row) => {
                      const teacherName =
                        row.teacherId && typeof row.teacherId === "object"
                          ? row.teacherId.name
                          : "Teacher";
                      const meetLink =
                        typeof row.meetingLink === "string" ? row.meetingLink.trim() : "";
                      const meetLinkIsUrl = /^https?:\/\//i.test(meetLink);
                      const statusMeta = { rescheduledAt: row.rescheduledAt };
                      return (
                        <li
                          key={row._id}
                          className="flex flex-col gap-2 py-4 first:pt-0 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-[#0B3C5D]">
                              {toDateLabel(row.startTime)} · {toTimeLabel(row.startTime)} – {toTimeLabel(row.endTime)}{" "}
                              IST
                            </p>
                            <p className="mt-1 text-sm font-medium text-[#1E73D8]/90">{teacherName}</p>
                            <div className="mt-2 border-t border-[#8BBCEB]/20 pt-2">
                              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0B3C5D]/80">
                                Meeting link
                              </p>
                              {meetLink ? (
                                meetLinkIsUrl ? (
                                  <a
                                    href={meetLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-block max-w-full break-all text-sm font-semibold text-[#1E73D8] underline decoration-[#8BBCEB] underline-offset-2 hover:text-[#0B3C5D]"
                                  >
                                    {meetLink}
                                  </a>
                                ) : (
                                  <p className="mt-1 break-all text-sm font-medium text-[#0B3C5D]">{meetLink}</p>
                                )
                              ) : (
                                <p className="mt-1 text-xs font-medium text-[#1E73D8]/75">
                                  Not stored for this session — use the calendar invite from your email if you have one.
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 self-start rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                              bookingStatusChipClassName(row.status, statusMeta),
                            )}
                          >
                            {formatBookingStatusLabel(row.status, statusMeta)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {!bookingHistorySectionOpen ? (
                <p className="mt-2 text-xs font-medium text-[#1E73D8]/75">
                  Tap the heading above to show or hide your past and upcoming sessions.
                </p>
              ) : null}
            </BookingPanel>

            <BookingPanel>
              <div className="mb-4 flex items-center gap-2 border-b border-[#F5F5F5] pb-4">
                <FiMail className="h-5 w-5 text-[#1E73D8]" />
                <h2 className="font-heading text-lg font-bold text-[#0B3C5D]">Email for meeting link</h2>
              </div>
              <p className="mb-4 text-sm font-medium text-[#1E73D8]/88">
                The Google Meet link and booking details will be sent to this address.
              </p>
              <Input
                tone="brand"
                label="Your email"
                type="email"
                autoComplete="email"
                maxLength={254}
                value={contactEmail}
                error={
                  contactEmail.trim() && !emailOk
                    ? "Enter a valid email address (used for the Meet link)"
                    : undefined
                }
                onChange={(event) => setContactEmail(event.target.value)}
                required
              />
              {!emailOk && contactEmail.trim() === "" ? (
                <p className="mt-2 text-xs font-medium text-[#8BBCEB]">Required before you can book a slot.</p>
              ) : null}
            </BookingPanel>

            <BookingPanel>
              <div className="mb-4 flex items-center gap-2 border-b border-[#F5F5F5] pb-4">
                <FiClock className="h-5 w-5 text-[#F4D35E]" />
                <h2 className="font-heading text-lg font-bold text-[#0B3C5D]">Pick a day</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-7">
                {days.map((day) => {
                  const iso = toIsoDate(day);
                  const active = iso === selectedDate;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelectedDate(iso)}
                      className={cn(
                        "rounded-xl border px-2 py-3 text-center text-xs font-bold transition md:text-[11px]",
                        active
                          ? "border-[#1E73D8] bg-[#1E73D8] text-[#FFFFFF] shadow-[0_8px_20px_-8px_rgba(30,115,216,0.45)]"
                          : "border-[#8BBCEB]/45 bg-[#FFFFFF] text-[#0B3C5D] hover:border-[#1E73D8]/40 hover:bg-[#F5F5F5]",
                      )}
                    >
                      {day.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "2-digit",
                      })}
                    </button>
                  );
                })}
              </div>
            </BookingPanel>

            {openData?.hasBookingToday && openData?.currentBooking ? (
              <BookingPanel className="border-[#F4D35E]/55 bg-[#F4D35E]/12">
                <p className="font-heading text-sm font-bold text-[#0B3C5D]">You already have a booking on this day.</p>
                <p className="mt-2 text-sm font-semibold text-[#1E73D8]">
                  {toTimeLabel(openData.currentBooking.startTime)} – {toTimeLabel(openData.currentBooking.endTime)} IST
                </p>
                <p className="mt-3 text-xs font-medium leading-relaxed text-[#0B3C5D]/90">
                  Meeting cancellations are not available in this portal. If you need to change your session, please
                  contact your coordinator or school office.
                </p>
              </BookingPanel>
            ) : null}

            {openData?.slots?.length ? (
              <div className="space-y-4">
                {openData.slots.map((slot) => (
                  <BookingPanel key={`${slot.startTime}-${slot.endTime}`} className="!p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#F5F5F5] pb-3">
                      <p className="font-heading text-sm font-bold text-[#0B3C5D]">
                        {toTimeLabel(slot.startTime)} – {toTimeLabel(slot.endTime)} IST
                      </p>
                      <span className="rounded-full bg-[#8BBCEB]/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0B3C5D]">
                        Time band
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {slot.teachers.map((teacher) => (
                        <div
                          key={`${teacher.slotId}-${teacher.teacherId}`}
                          className={cn(
                            "rounded-2xl border p-4 transition hover:border-[#1E73D8]/35 hover:bg-[#FFFFFF]",
                            teacher.slotState === "cancelled"
                              ? "border-[#94A3B8]/45 bg-[#F1F5F9]/80"
                              : "border-[#8BBCEB]/35 bg-[#F5F5F5]/60",
                          )}
                        >
                          <p className="font-heading font-bold text-[#0B3C5D]">{teacher.teacherName}</p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#1E73D8]/80">
                            {publicSlotStateLabel(teacher.slotState)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {teacher.slotState === "yours" ? (
                              <span className="text-xs font-bold text-[#0B3C5D]">
                                Your booking (cancellation not available here)
                              </span>
                            ) : null}
                            {teacher.slotState === "available" ? (
                              <Button
                                variant="adminPrimary"
                                disabled={!teacher.canBook || loading || bookingInProgress || !emailOk}
                                onClick={() => handleBook(teacher)}
                                className="w-full justify-center sm:w-auto"
                              >
                                {teacher.canBook ? "Book this slot" : "Limit reached"}
                              </Button>
                            ) : null}
                            {teacher.slotState === "taken" ? (
                              <Button variant="adminGhost" disabled className="w-full justify-center sm:w-auto">
                                Booked
                              </Button>
                            ) : null}
                            {teacher.slotState === "cancelled" ? (
                              <Button variant="adminGhost" disabled className="w-full justify-center sm:w-auto">
                                Cancelled
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </BookingPanel>
                ))}
              </div>
            ) : loading ? (
              <div className="flex justify-center py-10">
                <Loader label="Loading slots…" variant="admin" />
              </div>
            ) : (
              <EmptyState
                tone="brand"
                title="No slots for this day"
                description="Ask your teacher to publish availability for this date."
              />
            )}
          </div>
        ) : null}

        {bookingInProgress ? (
          <div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-[#0B3C5D]/50 p-6 backdrop-blur-[2px]"
            role="alertdialog"
            aria-busy="true"
            aria-live="assertive"
            aria-label="Booking in progress"
          >
            <div className="flex max-w-sm flex-col items-center gap-5 rounded-2xl border border-[#8BBCEB]/45 bg-[#FFFFFF] px-10 py-12 text-center shadow-[0_24px_56px_-20px_rgba(11,60,93,0.4)]">
              <span
                className="h-14 w-14 shrink-0 animate-spin rounded-full border-4 border-[#8BBCEB] border-t-[#1E73D8]"
                aria-hidden
              />
              <div>
                <p className="font-heading text-lg font-bold text-[#0B3C5D]">Booking in progress</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-[#1E73D8]/90">
                  Please wait while we confirm your session…
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <InfoModal
          open={rescheduleNotice.open}
          tone="admin"
          title="Session time updated"
          onClose={closeRescheduleNotice}
        >
          <p className="text-sm font-medium leading-relaxed text-[#1E73D8]/90">
            Your teacher rescheduled{" "}
            {rescheduleNotice.items.length === 1 ? "an upcoming session" : `${rescheduleNotice.items.length} upcoming sessions`}.
            Please use the new time{rescheduleNotice.items.length === 1 ? "" : "s"} and Meet link in{" "}
            <span className="font-bold text-[#0B3C5D]">Your booking history</span> below. You should also receive an
            email with the update.
          </p>
          <ul className="mt-4 space-y-3 rounded-xl border border-[#8BBCEB]/40 bg-[#F5F5F5]/80 p-4">
            {rescheduleNotice.items.map((row) => (
              <li key={row.id} className="text-sm font-semibold text-[#0B3C5D]">
                <span className="block text-[#1E73D8]">{row.teacherName}</span>
                <span className="mt-1 block font-bold">
                  {toDateLabel(row.startTime)} · {toTimeLabel(row.startTime)} – {toTimeLabel(row.endTime)} IST
                </span>
              </li>
            ))}
          </ul>
        </InfoModal>

        <InfoModal
          open={bookingSuccessOpen}
          tone="admin"
          title="Booking confirmed"
          onClose={() => {
            setBookingSuccessOpen(false);
            setBookingSuccessMeetingLink("");
          }}
        >
          <p className="text-sm font-medium leading-relaxed text-[#1E73D8]/90">
            Your session is scheduled. The Google Meet link and full booking details will be sent to{" "}
            <span className="font-bold break-all text-[#0B3C5D]">{bookingSuccessEmail}</span>. Check your inbox
            (and spam folder) shortly.
          </p>
          {bookingSuccessMeetingLink ? (
            <div className="mt-5 rounded-xl border border-[#8BBCEB]/45 bg-[#F5F5F5]/90 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0B3C5D]">Join with Google Meet</p>
              {/^https?:\/\//i.test(bookingSuccessMeetingLink) ? (
                <a
                  href={bookingSuccessMeetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block break-all text-sm font-semibold text-[#1E73D8] underline decoration-[#8BBCEB] underline-offset-2 hover:text-[#0B3C5D]"
                >
                  {bookingSuccessMeetingLink}
                </a>
              ) : (
                <p className="mt-2 break-all text-sm font-semibold text-[#0B3C5D]">{bookingSuccessMeetingLink}</p>
              )}
              <p className="mt-3 text-xs font-medium leading-relaxed text-[#1E73D8]/85">
                Open the link to join when it&apos;s time; you can also use the invite from your email.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-xs font-medium text-[#1E73D8]/80">
              Your Meet link will appear in the calendar invite email shortly if it isn&apos;t shown here.
            </p>
          )}
        </InfoModal>

        <InfoModal
          open={lookupModalOpen && lookupMatches.length > 0}
          tone="admin"
          title={
            lookupMatches.length === 1
              ? "Student found"
              : `${lookupMatches.length} students found`
          }
          onClose={closeLookupModal}
        >
          <p className="text-sm font-medium text-[#1E73D8]/90">
            Registered number{" "}
            <span className="font-bold text-[#0B3C5D]">{lookupMatches[0]?.mobile}</span>. Tap the correct profile to
            continue to booking.
          </p>
          <ul className="mt-4 space-y-2">
            {lookupMatches.map((student) => (
              <li key={student.id}>
                <button
                  type="button"
                  onClick={() => handleChooseStudent(student)}
                  className="w-full rounded-xl border border-[#8BBCEB]/45 bg-[#F5F5F5]/60 p-4 text-left transition hover:border-[#1E73D8]/50 hover:bg-[#FFFFFF]"
                >
                  <p className="font-heading text-base font-bold text-[#0B3C5D]">{student.name}</p>
                  <p className="mt-1 text-xs font-semibold text-[#1E73D8]/90">
                    Grade {student.grade}
                    {student.display ? ` · Channel ${student.display}` : ""}
                    {student.batchId ? ` · Batch ID ${student.batchId}` : ""}
                    {student.batchName ? ` · ${student.batchName}` : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </InfoModal>
      </div>
    </div>
  );
};
