import { cn } from "../../utils/cn";

const variants = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "bg-accent-400 text-slate-900 hover:bg-accent-300",
  ghost: "border border-brand-100 bg-white text-brand-700 hover:bg-brand-50",
  /** Teacher workspace — navy / gold / white */
  teacherPrimary:
    "!rounded-lg bg-teacher-navy text-white shadow-sm hover:bg-teacher-ink",
  teacherSecondary:
    "!rounded-lg bg-teacher-goldBright text-teacher-ink shadow-sm hover:bg-teacher-gold",
  teacherGhost:
    "!rounded-lg border border-teacher-line bg-white text-teacher-navy hover:bg-slate-50 hover:border-slate-300",
  teacherGhostActive:
    "!rounded-lg border border-teacher-navy/25 bg-teacher-blueWash text-teacher-navy shadow-sm",
  /** Strict admin palette — MeetReserve admin shell */
  adminPrimary:
    "!rounded-2xl bg-[#1E73D8] text-[#FFFFFF] shadow-[0_10px_28px_-10px_rgba(11,60,93,0.45)] hover:bg-[#0B3C5D]",
  adminSecondary:
    "!rounded-2xl bg-[#F4D35E] text-[#0B3C5D] shadow-[0_8px_20px_-8px_rgba(244,211,94,0.5)] hover:brightness-95",
  adminGhost:
    "!rounded-xl border border-[#8BBCEB]/70 bg-[#FFFFFF] text-[#0B3C5D] hover:bg-[#F5F5F5]",
  /** Infinity Learn student booking — #007BFF from provided mocks */
  ilPrimary:
    "!rounded-full bg-[#007BFF] text-[#FFFFFF] shadow-[0_8px_20px_-8px_rgba(0,123,255,0.35)] hover:bg-[#0069D9] active:bg-[#005FCC]",
  ilGhost:
    "!rounded-full border border-[#E5E5E5] bg-[#FFFFFF] text-[#1A1A1A] hover:border-[#007BFF]/40 hover:bg-[#F8FBFF]",
};

const focusRingClass = (variant) => {
  if (!variant || typeof variant !== "string") return "focus:ring-brand-300";
  if (variant === "teacherSecondary") return "focus:ring-amber-400/50";
  if (variant.startsWith("teacher")) return "focus:ring-teacher-navy/35";
  if (variant.startsWith("admin")) return "focus:ring-[#8BBCEB]/60";
  if (variant.startsWith("il")) return "focus:ring-[#007BFF]/30";
  return "focus:ring-brand-300";
};

export const Button = ({
  children,
  type = "button",
  variant = "primary",
  className,
  disabled,
  ...props
}) => (
  <button
    type={type}
    disabled={disabled}
    className={cn(
      "rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out focus:outline-none focus:ring-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
      focusRingClass(variant),
      variants[variant] ?? variants.primary,
      className,
    )}
    {...props}
  >
    {children}
  </button>
);
