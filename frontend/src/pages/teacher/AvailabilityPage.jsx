import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCalendar, FiSliders, FiZap } from "react-icons/fi";
import { TimeInput } from "../../components/ui/TimeInput";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useTeacherController } from "../../controllers/teacher.controller";
import { useToast } from "../../hooks/useToast";
import { cn } from "../../utils/cn";
import { BookingHero, BookingPanel } from "../../components/teacher/TeacherWorkspaceChrome";
import {
  addDaysToYmdKolkata,
  getKolkataYmd,
  getMinStartHhmmKolkataAfterMs,
  nextKolkataDays,
  toIsoDate,
} from "../../utils/date";

const DATE_SUFFIX = "T00:00:00.000Z";
const CUSTOM_DEFAULT_SLOT = { startTime: "09:00", endTime: "09:15" };
const STEP_MINUTES = 15;
const QUICK_START_MINUTES = 9 * 60;
const QUICK_LAST_START_MINUTES = 19 * 60 + 45;

const istCalendarParts = (date) => {
  const wd = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
  const dayNum = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
  return { weekdayShort: wd.toUpperCase(), dayNum };
};

const hhmmToMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
};
const slotKey = (startTime, endTime) => `${startTime}-${endTime}`;

const toIstWallHhmm = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  if (raw.includes("T")) {
    const instant = new Date(raw);
    if (!Number.isNaN(instant.getTime())) {
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        hourCycle: "h23",
      }).format(instant);
    }
  }

  return raw.slice(0, 5);
};

const formatMinutesToHhmm = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const generateQuickSlots = () => {
  const slots = [];
  for (let start = QUICK_START_MINUTES; start <= QUICK_LAST_START_MINUTES; start += STEP_MINUTES) {
    slots.push({
      startTime: formatMinutesToHhmm(start),
      endTime: formatMinutesToHhmm(start + STEP_MINUTES),
    });
  }
  return slots;
};

const addMinutes = (hhmm, minutesToAdd) =>
  formatMinutesToHhmm(Math.min(hhmmToMinutes(hhmm) + minutesToAdd, 23 * 60 + 59));

export const AvailabilityPage = () => {
  const navigate = useNavigate();
  const {
    calendar,
    bookingWindowDays,
    loading,
    loadCalendar,
    saveAvailability,
  } = useTeacherController();
  const { pushToast } = useToast();
  const initialYmd = getKolkataYmd();
  const initialIsoDate = `${initialYmd}${DATE_SUFFIX}`;
  const [selectedIsoDate, setSelectedIsoDate] = useState(initialIsoDate);
  const [selectedDateInput, setSelectedDateInput] = useState(initialYmd);
  const [mode, setMode] = useState("quick");
  const [customSlot, setCustomSlot] = useState({ ...CUSTOM_DEFAULT_SLOT });
  const [quickSelectedSlots, setQuickSelectedSlots] = useState([]);
  const [pendingSlots, setPendingSlots] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const todayYmd = getKolkataYmd();
  const maxDateInput = useMemo(
    () => addDaysToYmdKolkata(getKolkataYmd(), Math.max(Number(bookingWindowDays) - 1, 0)),
    [bookingWindowDays],
  );
  const selectableDays = useMemo(
    () => nextKolkataDays(Math.max(Number(bookingWindowDays), 1)),
    [bookingWindowDays],
  );
  const isTodaySelected = selectedDateInput === todayYmd;
  const minStartTimeToday = getMinStartHhmmKolkataAfterMs(3600000);
  const allQuickSlots = useMemo(() => generateQuickSlots(), []);
  const availablePresetSlots = useMemo(
    () =>
      isTodaySelected
        ? allQuickSlots.filter((slot) => slot.startTime >= minStartTimeToday)
        : allQuickSlots,
    [allQuickSlots, isTodaySelected, minStartTimeToday],
  );
  const existingSlotsForSelectedDate = useMemo(() => {
    const day = calendar.find((row) => String(row.date).slice(0, 10) === selectedDateInput);
    if (!day) return [];
    return day.slots.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      isBooked: slot.isBooked,
    }));
  }, [calendar, selectedDateInput]);
  const existingSlotStatusByKey = useMemo(() => {
    const byKey = new Map();
    existingSlotsForSelectedDate.forEach((slot) => {
      const start = toIstWallHhmm(slot.startTime);
      const end = toIstWallHhmm(slot.endTime);
      byKey.set(slotKey(start, end), {
        isBooked: Boolean(slot.isBooked),
      });
    });
    return byKey;
  }, [existingSlotsForSelectedDate]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const normalizeCustomSlotForToday = (slot) => {
    const startTime = slot.startTime < minStartTimeToday ? minStartTimeToday : slot.startTime;
    const endTime = slot.endTime <= startTime ? addMinutes(startTime, STEP_MINUTES) : slot.endTime;
    return { startTime, endTime };
  };

  const setDateFromInput = (nextDate) => {
    if (!nextDate) return;
    if (nextDate < todayYmd || nextDate > maxDateInput) {
      pushToast({
        title: `Pick a date within the allowed ${bookingWindowDays}-day window (IST calendar)`,
        variant: "error",
      });
      return;
    }
    setSelectedDateInput(nextDate);
    setSelectedIsoDate(`${nextDate}${DATE_SUFFIX}`);
    if (nextDate === todayYmd) {
      setCustomSlot((prev) => normalizeCustomSlotForToday(prev));
      setQuickSelectedSlots((prev) => prev.filter((s) => s.startTime >= minStartTimeToday));
    } else {
      setQuickSelectedSlots([]);
    }
    setConfirmOpen(false);
    setPendingSlots([]);
  };

  const hasOverlapWithExisting = (slot) =>
    existingSlotsForSelectedDate.some((existing) => {
      const existingStart = hhmmToMinutes(toIstWallHhmm(existing.startTime));
      const existingEnd = hhmmToMinutes(toIstWallHhmm(existing.endTime));
      const slotStart = hhmmToMinutes(slot.startTime);
      const slotEnd = hhmmToMinutes(slot.endTime);
      return slotStart < existingEnd && existingStart < slotEnd;
    });

  const validateSlot = (slot) => {
    if (slot.endTime <= slot.startTime) {
      pushToast({
        title: "Slot end time must be later than start time",
        variant: "error",
      });
      return false;
    }
    if (isTodaySelected && slot.startTime < minStartTimeToday) {
      pushToast({
        title: `For today (IST), start time must be ${minStartTimeToday} or later`,
        variant: "error",
      });
      return false;
    }
    if (hasOverlapWithExisting(slot)) {
      pushToast({
        title: "This slot overlaps with an existing saved slot for this date",
        variant: "error",
      });
      return false;
    }
    return true;
  };

  const toggleQuickSlot = (slot) => {
    if (isTodaySelected && slot.startTime < minStartTimeToday) {
      pushToast({
        title: `For today (IST), choose slots from ${minStartTimeToday} or later`,
        variant: "error",
      });
      return;
    }
    const key = slotKey(slot.startTime, slot.endTime);
    setQuickSelectedSlots((prev) => {
      const exists = prev.some(
        (s) => slotKey(s.startTime, s.endTime) === key,
      );
      if (exists) {
        return prev.filter((s) => slotKey(s.startTime, s.endTime) !== key);
      }
      return [...prev, { ...slot }].sort(
        (a, b) => hhmmToMinutes(a.startTime) - hhmmToMinutes(b.startTime),
      );
    });
  };

  const onSaveClick = (event) => {
    event.preventDefault();
    if (mode === "quick") {
      if (!quickSelectedSlots.length) {
        pushToast({ title: "Select one or more quick slots first", variant: "error" });
        return;
      }
      const sorted = [...quickSelectedSlots].sort(
        (a, b) => hhmmToMinutes(a.startTime) - hhmmToMinutes(b.startTime),
      );
      for (const slot of sorted) {
        if (!validateSlot(slot)) return;
      }
      setPendingSlots(sorted);
      setConfirmOpen(true);
      return;
    }
    if (!validateSlot(customSlot)) return;
    setPendingSlots([{ ...customSlot }]);
    setConfirmOpen(true);
  };

  const onConfirmSave = async () => {
    if (!pendingSlots.length) return;
    const ok = await saveAvailability({
      date: selectedIsoDate,
      slots: pendingSlots,
    });
    if (ok) {
      setQuickSelectedSlots([]);
      setPendingSlots([]);
      setConfirmOpen(false);
      navigate("/teacher/calendar", {
        state: { selectedDate: selectedDateInput },
      });
      return;
    }

    setConfirmOpen(false);
    setPendingSlots([]);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BookingHero
        eyebrow="Planner"
        title="Availability planner"
        description="Select dates and time slots within your admin booking window. Times are IST (Asia/Kolkata)."
      />

      <BookingPanel className="relative !overflow-hidden">
        <header className="space-y-2 border-b border-[#F5F5F5] pb-6">
          <p className="text-sm font-medium leading-relaxed text-[#1E73D8]/88">
            Pick a day, then choose exactly <span className="font-bold text-[#0B3C5D]">one slot at a time</span> for
            that date. You can only manage availability within the next {bookingWindowDays} day(s) as configured by
            admin.
            {isTodaySelected
              ? ` For today, start times must be ${minStartTimeToday} IST or later (at least 1 hour from now).`
              : ""}
          </p>
        </header>

        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-black uppercase tracking-[0.14em] text-[#0B3C5D]">Select dates</h2>
            <FiCalendar className="h-5 w-5 shrink-0 text-[#8BBCEB]" aria-hidden />
          </div>

          <div className="flex flex-wrap gap-3 pb-2">
            {selectableDays.map((day) => {
              const iso = toIsoDate(day);
              const active = iso === selectedIsoDate;
              const { weekdayShort, dayNum } = istCalendarParts(day);
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setDateFromInput(iso.slice(0, 10))}
                  className={cn(
                    "flex h-20 w-16 shrink-0 flex-col items-center justify-center rounded-xl border transition",
                    active
                      ? "border-transparent bg-[#F4D35E] text-[#0B3C5D] shadow-md"
                      : "border-[#8BBCEB]/50 bg-[#FFFFFF] text-[#0B3C5D] hover:bg-[#F5F5F5]",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-bold uppercase tracking-tight",
                      active ? "opacity-100" : "opacity-70",
                    )}
                  >
                    {weekdayShort}
                  </span>
                  <span className="text-lg font-black leading-tight">{dayNum}</span>
                </button>
              );
            })}
          </div>
        </div>

        <form className="mt-8 space-y-8" onSubmit={onSaveClick}>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <button
              type="button"
              onClick={() => setMode("quick")}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-bold transition",
                mode === "quick"
                  ? "bg-[#F4D35E] text-[#0B3C5D] shadow-sm"
                  : "border border-[#8BBCEB]/50 bg-[#FFFFFF] text-[#0B3C5D] hover:bg-[#F5F5F5]",
              )}
            >
              <FiZap className="h-4 w-4 shrink-0" aria-hidden />
              Quick add slot
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("custom");
                if (isTodaySelected) {
                  setCustomSlot((prev) => normalizeCustomSlotForToday(prev));
                }
              }}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3 text-base font-bold transition",
                mode === "custom"
                  ? "border-2 border-[#0B3C5D] bg-[#FFFFFF] text-[#0B3C5D] shadow-sm"
                  : "border border-[#8BBCEB]/50 bg-[#FFFFFF] text-[#0B3C5D] hover:bg-[#F5F5F5]",
              )}
            >
              <FiSliders className="h-4 w-4 shrink-0" aria-hidden />
              Add your slot (customize)
            </button>
          </div>

          {mode === "quick" ? (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#0B3C5D]">
                Quick add slots — times are IST (tap to select or deselect)
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {availablePresetSlots.map((slot) => {
                  const key = slotKey(slot.startTime, slot.endTime);
                  const status = existingSlotStatusByKey.get(key);
                  const isBooked = Boolean(status?.isBooked);
                  const isAlreadySaved = Boolean(status);
                  const isPicked =
                    !isAlreadySaved &&
                    quickSelectedSlots.some(
                      (s) => s.startTime === slot.startTime && s.endTime === slot.endTime,
                    );

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={isAlreadySaved}
                      onClick={() => toggleQuickSlot(slot)}
                      className={cn(
                        "rounded-lg border px-3 py-3 text-center text-sm transition",
                        isBooked &&
                          "cursor-not-allowed border-[#F4D35E]/70 bg-[#F4D35E]/25 font-semibold text-[#0B3C5D]",
                        isAlreadySaved &&
                          !isBooked &&
                          "cursor-not-allowed border-[#25D366]/50 bg-[#25D366]/15 font-semibold text-[#0B3C5D]",
                        !isAlreadySaved &&
                          isPicked &&
                          "border-2 border-[#1E73D8] bg-[#8BBCEB]/40 font-bold text-[#0B3C5D] shadow-inner",
                        !isAlreadySaved &&
                          !isPicked &&
                          "border border-[#8BBCEB]/45 bg-[#FFFFFF] font-medium text-[#0B3C5D] hover:bg-[#F5F5F5]",
                      )}
                    >
                      {slot.startTime} – {slot.endTime}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-medium text-[#1E73D8]/75">
                Gold tint = booked by a student. Green tint = saved but still open. These cannot be picked again.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#8BBCEB]/40 bg-[#F5F5F5]/50 p-5">
              <p className="text-sm font-bold text-[#0B3C5D]">Customize your slot (IST)</p>
              <p className="mt-0.5 text-xs font-medium text-[#1E73D8]/80">24-hour time. End time must be after start.</p>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
                <div className="min-w-0 flex-1">
                  <TimeInput
                    tone="brand"
                    label="Start"
                    min={isTodaySelected ? minStartTimeToday : undefined}
                    value={customSlot.startTime}
                    onChange={(event) => {
                      const startTime = event.target.value;
                      setCustomSlot((prev) => {
                        const endTime =
                          prev.endTime <= startTime
                            ? addMinutes(startTime, STEP_MINUTES)
                            : prev.endTime;
                        return { ...prev, startTime, endTime };
                      });
                    }}
                    required
                  />
                </div>
                <div
                  className="hidden h-11 shrink-0 items-center pb-0.5 text-lg font-light text-[#8BBCEB] sm:flex"
                  aria-hidden
                >
                  →
                </div>
                <div className="min-w-0 flex-1">
                  <TimeInput
                    tone="brand"
                    label="End"
                    min={addMinutes(customSlot.startTime, 1)}
                    value={customSlot.endTime}
                    onChange={(event) =>
                      setCustomSlot((prev) => ({ ...prev, endTime: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-[#8BBCEB]/30 pt-6">
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "rounded-xl bg-[#0B3C5D] px-10 py-3.5 text-base font-bold text-[#FFFFFF]",
                "shadow-[0_8px_24px_-10px_rgba(11,60,93,0.45)]",
                "transition hover:bg-[#1E73D8] disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {loading ? "Saving…" : "Save slot"}
            </button>
          </div>
        </form>
      </BookingPanel>

      <Modal
        open={confirmOpen}
        title={pendingSlots.length > 1 ? "Confirm slots save" : "Confirm slot save"}
        confirmLabel="Confirm save"
        tone="brand"
        onClose={() => {
          setConfirmOpen(false);
          setPendingSlots([]);
        }}
        onConfirm={onConfirmSave}
        confirmLoading={loading}
      >
        {pendingSlots.length ? (
          <div className="space-y-3 text-sm font-medium text-[#1E73D8]/90">
            <p>
              <span className="font-bold text-[#0B3C5D]">Date (IST): </span>
              {selectedDateInput}
            </p>
            <div>
              <p className="font-bold text-[#0B3C5D]">
                {pendingSlots.length > 1 ? "Slots (IST)" : "Slot (IST)"}
              </p>
              <ul className="mt-2 max-h-48 list-none space-y-1.5 overflow-y-auto rounded-lg border border-[#8BBCEB]/35 bg-[#F5F5F5]/80 p-3">
                {pendingSlots.map((s) => (
                  <li
                    key={slotKey(s.startTime, s.endTime)}
                    className="font-semibold text-[#0B3C5D]"
                  >
                    {s.startTime} – {s.endTime}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-[#0B3C5D]">
              {pendingSlots.length > 1
                ? `Please confirm to save these ${pendingSlots.length} slots.`
                : "Please confirm to save this slot."}
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
