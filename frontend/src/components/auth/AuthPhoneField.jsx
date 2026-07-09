import { cn } from "../../utils/cn";
import { normalizeMobile } from "../../utils/mobile";

const digitsOnly = (raw) => String(raw ?? "").replace(/\D/g, "").slice(0, 10);

/** Infinity Learn–style phone field with +91 prefix. */
export const AuthPhoneField = ({ id = "student-phone", label = "Phone number", value, onChange, error }) => (
  <div>
    <div className="relative">
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={value}
        onChange={(event) => onChange(digitsOnly(event.target.value))}
        placeholder=" "
        className={cn(
          "peer w-full rounded-lg border bg-white py-[1.05rem] pl-[6.75rem] pr-4 text-[15px] text-[#1A1A1A] outline-none transition placeholder:text-transparent focus:ring-2",
          error
            ? "border-red-400 focus:border-red-400 focus:ring-red-100"
            : "border-[#007BFF]/80 focus:border-[#007BFF] focus:ring-[#007BFF]/15",
        )}
      />
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-3 top-0 -translate-y-1/2 bg-white px-1 text-[13px] font-medium transition",
          error ? "text-red-500" : "text-[#5C5C5C] peer-focus:text-[#007BFF]",
        )}
      >
        {label}
      </label>
      <div className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-2 text-[15px] text-[#1A1A1A]">
        <span className="text-lg leading-none" aria-hidden>
          🇮🇳
        </span>
        <span className="font-medium">+91</span>
        <span className="h-5 w-px bg-[#D9D9D9]" aria-hidden />
      </div>
    </div>
    {error ? <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p> : null}
  </div>
);

export const isValidStudentPhone = (raw) => /^[1-9]\d{9}$/.test(normalizeMobile(raw));
