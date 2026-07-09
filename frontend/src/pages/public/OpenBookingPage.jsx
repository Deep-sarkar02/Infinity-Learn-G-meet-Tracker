import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InfoModal } from "../../components/ui/InfoModal";
import { OpenBookingLegacyDashboard } from "../../components/public/OpenBookingLegacyDashboard";
import {
  AuthCheckbox,
  AuthPrimaryButton,
  InfinityLearnLoginLayout,
} from "../../components/auth/InfinityLearnLoginLayout";
import { AuthPhoneField, isValidStudentPhone } from "../../components/auth/AuthPhoneField";
import { publicBookingService } from "../../services/public.service";
import { useToast } from "../../hooks/useToast";
import { getKolkataYmd, nextKolkataDays, toDateLabel, toIsoDate, toTimeLabel } from "../../utils/date";
import { isValidContactEmail, validateLookupForm } from "../../utils/validators";
import { logParentWhatsAppFromApi } from "../../utils/parentWhatsAppConsole";
import { logLsqProspectActivityFromApi } from "../../utils/lsqProspectActivityConsole";
import { SwitchProfileModal } from "../../components/public/SwitchProfileModal";
import { renderModalPortal } from "../../components/ui/modalPortal";

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

export const OpenBookingPage = () => {
  const { pushToast } = useToast();
  const [step, setStep] = useState(1);
  const [lookupForm, setLookupForm] = useState({ mobile: "" });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [whatsappUpdates, setWhatsappUpdates] = useState(false);
  const [lookupFieldError, setLookupFieldError] = useState("");
  const [lookupMatches, setLookupMatches] = useState([]);
  const [lookupModalOpen, setLookupModalOpen] = useState(false);
  const [roster, setRoster] = useState(null);
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingWindowDays, setBookingWindowDays] = useState(7);
  const [selectedDate, setSelectedDate] = useState(() => `${getKolkataYmd()}T00:00:00.000Z`);
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

  const days = useMemo(
    () => nextKolkataDays(Math.max(Number(bookingWindowDays) || 7, 1)),
    [bookingWindowDays],
  );

  useEffect(() => {
    let active = true;
    const loadWindow = async () => {
      try {
        const { data } = await publicBookingService.getBookingWindow();
        const nextDays = Number(data.data?.bookingWindowDays);
        if (active && Number.isFinite(nextDays) && nextDays >= 1) {
          setBookingWindowDays(nextDays);
        }
      } catch {
        /* keep default window */
      }
    };
    void loadWindow();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!days.length) return;
    const valid = days.some((day) => toIsoDate(day) === selectedDate);
    if (!valid) {
      setSelectedDate(toIsoDate(days[0]));
    }
  }, [days, selectedDate]);

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

  const finishLookup = (matches) => {
    if (!matches.length) {
      pushToast({ title: "No student found", variant: "error" });
      return;
    }
    if (matches.length === 1) {
      setLookupMatches(matches);
      setLookupModalOpen(false);
      setRoster(matches[0]);
      setContactEmail("");
      setStep(2);
      pushToast({ title: "Student verified" });
      return;
    }
    setLookupMatches(matches);
    setLookupModalOpen(true);
  };

  const handlePhoneSubmit = async (event) => {
    event.preventDefault();
    if (!agreedToTerms || !whatsappUpdates) {
      pushToast({ title: "Please accept both options to continue", variant: "error" });
      return;
    }
    const { ok, errors, values } = validateLookupForm(lookupForm);
    if (!ok) {
      setLookupFieldError(errors.mobile || "Enter a valid 10-digit mobile number");
      return;
    }
    setLookupFieldError("");
    setLookupErrors({});
    setLoading(true);
    try {
      const { data } = await publicBookingService.lookupStudent({ mobile: values.mobile });
      finishLookup(data.data?.students ?? []);
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "No student found for this mobile number",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChooseStudent = (student) => {
    setLookupModalOpen(false);
    setRoster(student);
    setContactEmail("");
    setStep(2);
    pushToast({ title: "Student verified" });
  };

  const resetBookingSession = () => {
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

  const lookupModal = (
    <SwitchProfileModal
      open={lookupModalOpen && lookupMatches.length > 0}
      students={lookupMatches}
      onClose={closeLookupModal}
      onConfirm={handleChooseStudent}
    />
  );

  const canSubmitPhone =
    isValidStudentPhone(lookupForm.mobile) && agreedToTerms && whatsappUpdates;

  if (step === 1) {
    return (
      <>
        <InfinityLearnLoginLayout
          welcomeRole="Student"
          welcomeSubtitle="Please enter your phone number to continue booking your session."
          backTo="/"
          footerLinks={[]}
        >
          <form className="space-y-5" onSubmit={handlePhoneSubmit}>
            <AuthPhoneField
              value={lookupForm.mobile}
              onChange={(digits) => {
                setLookupFieldError("");
                setLookupMatches([]);
                setLookupModalOpen(false);
                setLookupForm({ mobile: digits });
              }}
              error={lookupFieldError}
            />

            <AuthCheckbox
              id="book-terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
            >
              By signing up you agree to our{" "}
              <a href="#" className="font-semibold text-[#007BFF] hover:underline">
                T&amp;C
              </a>{" "}
              and{" "}
              <a href="#" className="font-semibold text-[#007BFF] hover:underline">
                Privacy Policy
              </a>
            </AuthCheckbox>

            <AuthCheckbox
              id="book-whatsapp"
              checked={whatsappUpdates}
              onChange={(e) => setWhatsappUpdates(e.target.checked)}
            >
              <span className="inline-flex items-center gap-1.5">
                Receive updates on WhatsApp
                <span className="text-base leading-none text-[#25D366]" aria-hidden>
                  ●
                </span>
              </span>
            </AuthCheckbox>

            <AuthPrimaryButton disabled={!canSubmitPhone} loading={loading}>
              Book
            </AuthPrimaryButton>
          </form>
        </InfinityLearnLoginLayout>
        {lookupModal}
      </>
    );
  }

  if (step === 2 && roster) {
    return (
      <>
        <OpenBookingLegacyDashboard
          roster={roster}
          bookingWindowDays={bookingWindowDays}
          slotReleasedBanner={slotReleasedBanner}
          bookingHistorySectionOpen={bookingHistorySectionOpen}
          setBookingHistorySectionOpen={setBookingHistorySectionOpen}
          bookingHistoryLoading={bookingHistoryLoading}
          bookingHistoryError={bookingHistoryError}
          bookingHistory={bookingHistory}
          contactEmail={contactEmail}
          setContactEmail={setContactEmail}
          emailOk={emailOk}
          days={days}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          openData={openData}
          loading={loading}
          bookingInProgress={bookingInProgress}
          onLogout={resetBookingSession}
          onBook={handleBook}
        />

        {bookingInProgress
          ? renderModalPortal(
              <div
                className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0B3C5D]/55 p-6 backdrop-blur-[2px]"
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
              </div>,
            )
          : null}

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

        {lookupModal}
      </>
    );
  }

  return null;
};
