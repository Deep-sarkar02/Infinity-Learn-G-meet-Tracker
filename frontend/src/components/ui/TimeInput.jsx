import { useEffect, useMemo, useRef } from "react";
import { FiClock } from "react-icons/fi";
import { cn } from "../../utils/cn";

const timeToMinutes = (t) => {
  if (!t || typeof t !== "string") return null;
  const [hs, ms] = t.split(":");
  const h = Number(hs);
  const m = Number(ms);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const parseValue = (v) => {
  if (!v || typeof v !== "string") return null;
  const [hs, ms] = v.split(":");
  const h = Number(hs);
  const m = Number(ms);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h: Math.min(23, Math.max(0, h)), m: Math.min(59, Math.max(0, m)) };
};

const formatTime = (h, m) =>
  `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

/** Hours that can contain at least one valid minute under min/max. */
function getHourOptions(min, max) {
  const minM = timeToMinutes(min);
  const maxM = timeToMinutes(max);
  const rangeMin = minM ?? 0;
  const rangeMax = maxM ?? 23 * 60 + 59;
  const hours = [];
  for (let h = 0; h <= 23; h += 1) {
    const start = h * 60;
    const end = h * 60 + 59;
    if (end < rangeMin || start > rangeMax) continue;
    hours.push(h);
  }
  return hours;
}

function getMinuteOptions(hour, min, max) {
  const minM = timeToMinutes(min);
  const maxM = timeToMinutes(max);
  const rangeMin = minM ?? 0;
  const rangeMax = maxM ?? 23 * 60 + 59;
  const mins = [];
  for (let m = 0; m <= 59; m += 1) {
    const t = hour * 60 + m;
    if (t >= rangeMin && t <= rangeMax) mins.push(m);
  }
  return mins;
}

const selectClassDefault = cn(
  "min-w-[4.25rem] flex-1 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-2 pr-8",
  "text-center text-base font-semibold tabular-nums text-slate-900 shadow-sm outline-none transition",
  "focus:border-brand-400 focus:ring-2 focus:ring-brand-100",
  "hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50",
  "bg-[length:0.875rem] bg-[right_0.4rem_center] bg-no-repeat",
  "[background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")]",
);

const selectClassBrand = cn(
  "min-w-[4.25rem] flex-1 cursor-pointer appearance-none rounded-lg border border-[#8BBCEB]/60 bg-[#FFFFFF] py-2.5 pl-2 pr-8",
  "text-center text-base font-semibold tabular-nums text-[#0B3C5D] shadow-sm outline-none transition",
  "focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35",
  "hover:border-[#1E73D8]/50 disabled:cursor-not-allowed disabled:opacity-50",
  "bg-[length:0.875rem] bg-[right_0.4rem_center] bg-no-repeat",
  "[background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238BBCEB'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")]",
);

/**
 * Hour + minute dropdowns (no native time picker popup). Value format HH:mm (24h).
 * @param {{ tone?: 'default' | 'brand' }} props — brand = strict 7-color palette
 */
export const TimeInput = ({
  label,
  error,
  className,
  required,
  value,
  onChange,
  min,
  max,
  disabled,
  tone = "default",
}) => {
  const strict = tone === "brand" || tone === "admin";
  const hourOptions = useMemo(() => getHourOptions(min, max), [min, max]);
  const parsed = parseValue(value);

  const safeHour = useMemo(() => {
    if (hourOptions.length === 0) return 0;
    if (parsed && hourOptions.includes(parsed.h)) return parsed.h;
    return hourOptions[0];
  }, [parsed, hourOptions]);

  const minuteOptions = useMemo(
    () => getMinuteOptions(safeHour, min, max),
    [safeHour, min, max],
  );

  const safeMinute = useMemo(() => {
    if (minuteOptions.length === 0) return 0;
    if (parsed && minuteOptions.includes(parsed.m)) return parsed.m;
    return minuteOptions[0];
  }, [parsed, minuteOptions]);

  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const correct = formatTime(safeHour, safeMinute);
    if (value !== correct) {
      onChangeRef.current?.({ target: { value: correct } });
    }
  }, [value, safeHour, safeMinute]);

  const fire = (h, m) => {
    onChange?.({ target: { value: formatTime(h, m) } });
  };

  const onHourChange = (e) => {
    const h = Number(e.target.value);
    const mo = getMinuteOptions(h, min, max);
    const nextM = mo.includes(safeMinute) ? safeMinute : mo[0] ?? 0;
    fire(h, nextM);
  };

  const onMinuteChange = (e) => {
    fire(safeHour, Number(e.target.value));
  };

  const selectClass = strict ? selectClassBrand : selectClassDefault;

  return (
    <label className={cn("block space-y-1.5", className)}>
      {label ? (
        <span
          className={
            strict
              ? "text-xs font-bold uppercase tracking-wide text-[#0B3C5D]"
              : "text-xs font-semibold uppercase tracking-wide text-slate-500"
          }
        >
          {label}
          {required ? (
            <span className={strict ? "text-[#F4D35E]" : "text-red-500"} aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </span>
      ) : null}
      <div className="relative">
        <FiClock
          className={
            strict
              ? "pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[#8BBCEB]"
              : "pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-brand-600/90"
          }
          aria-hidden
        />
        <div
          className={cn(
            strict
              ? "flex min-h-[2.75rem] items-center gap-2 rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] pl-10 pr-3 shadow-sm focus-within:border-[#1E73D8] focus-within:ring-2 focus-within:ring-[#8BBCEB]/35"
              : "flex min-h-[2.75rem] items-center gap-2 rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 pl-10 pr-3 shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100",
            error
              ? strict
                ? "border-[#F4D35E] focus-within:ring-[#F4D35E]/30"
                : "border-red-300 focus-within:ring-red-100"
              : "",
            disabled ? "pointer-events-none opacity-60" : "",
          )}
        >
          <select
            aria-label={label ? `${label} hour` : "Hour"}
            className={selectClass}
            disabled={disabled}
            value={safeHour}
            onChange={onHourChange}
          >
            {hourOptions.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}
              </option>
            ))}
          </select>
          <span
            className={strict ? "select-none text-lg font-light text-[#8BBCEB]" : "select-none text-lg font-light text-slate-400"}
            aria-hidden
          >
            :
          </span>
          <select
            aria-label={label ? `${label} minute` : "Minute"}
            className={selectClass}
            disabled={disabled}
            value={safeMinute}
            onChange={onMinuteChange}
          >
            {minuteOptions.map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error ? (
        <p className={strict ? "text-xs font-medium text-[#0B3C5D]" : "text-xs text-red-600"}>{error}</p>
      ) : null}
    </label>
  );
};
