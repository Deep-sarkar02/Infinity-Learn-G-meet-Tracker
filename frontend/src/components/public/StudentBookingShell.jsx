import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiChevronDown, FiLogOut } from "react-icons/fi";
import { cn } from "../../utils/cn";
import { StudentProfileAvatar } from "./StudentProfileAvatar";

const formatGradeLabel = (grade) => {
  const value = String(grade ?? "").trim();
  if (!value) return "";
  return value.toLowerCase().startsWith("grade") ? value : `Grade ${value}`;
};

const StudentProfileDropdown = ({ student, onLogout }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-[#E8E8E8] bg-white py-1.5 pl-1.5 pr-3 transition hover:border-[#007BFF]/30 hover:bg-[#F8FBFF]"
      >
        <div className="h-9 w-9 overflow-hidden rounded-full">
          <StudentProfileAvatar name={student?.name} variant="b" compact />
        </div>
        <div className="hidden text-left sm:block">
          <p className="max-w-[8rem] truncate text-sm font-bold text-[#1A1A1A]">{student?.name}</p>
          {student?.grade ? (
            <p className="text-[11px] font-medium text-[#8A8A8A]">{formatGradeLabel(student.grade)}</p>
          ) : null}
        </div>
        <FiChevronDown
          className={cn("h-4 w-4 text-[#8A8A8A] transition-transform", open ? "rotate-180" : "")}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[11rem] overflow-hidden rounded-2xl border border-[#ECECEC] bg-white py-1.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              onLogout();
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-[#1A1A1A] transition hover:bg-[#F8FBFF]"
          >
            <FiLogOut className="h-4 w-4 text-[#007BFF]" aria-hidden />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
};

export const StudentBookingShell = ({
  student,
  onLogout,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const expanded = sidebarOpen;

  const handleAsideClick = (event) => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    if (event.target.closest("a, button")) return;
    setSidebarOpen((open) => !open);
  };

  return (
  <div className="flex min-h-screen bg-[#F0F2F5]" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
    <aside
      className={cn(
        "relative flex min-h-screen shrink-0 flex-col bg-[#004A85] py-5 transition-[width] duration-200 ease-out",
        expanded ? "w-[11rem]" : "w-[4.5rem]",
      )}
      onMouseEnter={() => setSidebarOpen(true)}
      onMouseLeave={() => setSidebarOpen(false)}
      onClick={handleAsideClick}
    >
      <Link
        to="/"
        title="Infinity Learn home"
        className="mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <img
          src="/il-login-logo.png"
          alt="Infinity Learn"
          className="h-8 w-8 object-contain brightness-0 invert"
        />
      </Link>

      <div className="flex-1" aria-hidden />

      <div className="mx-auto my-4 h-px w-8 bg-white/15" aria-hidden />

      <div className="px-3 pb-2">
        <button
          type="button"
          aria-label="Log out"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-full py-2.5 pl-3 pr-3 text-left text-white/80 transition hover:bg-white/10 hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center">
            <FiLogOut className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span
            className={cn(
              "whitespace-nowrap text-sm font-semibold transition-all duration-200",
              expanded ? "opacity-100" : "w-0 overflow-hidden opacity-0",
            )}
          >
            Log out
          </span>
        </button>
      </div>
    </aside>

    <div className="flex min-w-0 flex-1 flex-col p-2 sm:p-4 lg:p-5">
      <div className="min-h-[calc(100vh-1rem)] overflow-hidden rounded-[1.25rem] bg-white shadow-[0_8px_40px_-12px_rgba(12,25,41,0.12)] sm:min-h-[calc(100vh-2rem)] sm:rounded-[1.75rem]">

        <header className="flex items-center justify-between gap-4 border-b border-[#F0F0F0] px-5 py-4 sm:px-6">
          <h1 className="text-xl font-bold text-[#1A1A1A] sm:text-2xl">Home</h1>
          <StudentProfileDropdown student={student} onLogout={onLogout} />
        </header>

        <main className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">{children}</main>
      </div>
    </div>
  </div>
  );
};

export const StudentBookingHero = () => (
  <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#004A85] via-[#005FA3] to-[#007BFF] px-6 py-8 text-white sm:px-8 sm:py-10">
    <div className="relative z-10 max-w-lg">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">Infinity Learn</p>
      <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
        Book your 1:1 mentor session
      </h2>
      <p className="mt-3 text-sm font-medium leading-relaxed text-white/90">
        Pick a day, choose an open slot, and get your Google Meet link by email.
      </p>
      <p className="mt-5 inline-flex rounded-full bg-[#FFCC00] px-5 py-2.5 text-sm font-bold text-[#1A1A1A]">
        Sessions fill fast — book early
      </p>
    </div>
    <div
      className="pointer-events-none absolute -right-4 bottom-0 hidden h-40 w-40 opacity-90 sm:block"
      aria-hidden
    >
      <StudentProfileAvatar name="student" variant="a" />
    </div>
    <div className="mt-6 flex justify-center gap-1.5 sm:justify-start" aria-hidden>
      <span className="h-1.5 w-4 rounded-full bg-[#007BFF]" />
      <span className="h-1.5 w-1.5 rounded-full bg-white/35" />
      <span className="h-1.5 w-1.5 rounded-full bg-white/35" />
    </div>
  </section>
);

export const StudentSectionHeader = ({ title, subtitle, action }) => (
  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h3 className="text-lg font-bold text-[#1A1A1A]">{title}</h3>
      {subtitle ? <p className="mt-0.5 text-sm text-[#8A8A8A]">{subtitle}</p> : null}
    </div>
    {action}
  </div>
);

export const StudentSurfaceCard = ({ children, className }) => (
  <div
    className={cn(
      "rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)] sm:p-5",
      className,
    )}
  >
    {children}
  </div>
);

const DAY_CHIP_COLORS = [
  "bg-[#E8F4FF] border-[#B8D9F8] text-[#1A1A1A]",
  "bg-[#E8F8EF] border-[#B8E6C8] text-[#1A1A1A]",
  "bg-[#FFF4E8] border-[#F5D9B8] text-[#1A1A1A]",
  "bg-[#F3E8FF] border-[#D9B8F5] text-[#1A1A1A]",
  "bg-[#FFE8F0] border-[#F5B8D9] text-[#1A1A1A]",
  "bg-[#E8FFFE] border-[#B8F0EE] text-[#1A1A1A]",
  "bg-[#F5F5F5] border-[#E0E0E0] text-[#1A1A1A]",
];

export const StudentDayChip = ({ day, active, onClick, index }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex min-w-[4.5rem] flex-col items-center justify-center rounded-2xl border px-2 py-3 text-center transition",
      active
        ? "border-[#007BFF] bg-[#007BFF] text-white shadow-[0_8px_20px_-8px_rgba(0,123,255,0.45)]"
        : DAY_CHIP_COLORS[index % DAY_CHIP_COLORS.length],
    )}
  >
    <span className="text-[10px] font-semibold uppercase opacity-80">
      {day.toLocaleDateString("en-US", { weekday: "short" })}
    </span>
    <span className="mt-1 text-sm font-bold">
      {day.toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
    </span>
  </button>
);

export const StudentActivityCard = ({ icon: Icon, iconClass, title, meta, badge, children }) => (
  <div className="flex min-w-[16rem] max-w-[20rem] flex-1 flex-col rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.08)]">
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          iconClass ?? "bg-[#FFF4E8] text-[#E67E22]",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        {badge ? (
          <span className="mb-1 inline-block rounded-md bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-bold uppercase text-[#DC2626]">
            {badge}
          </span>
        ) : null}
        <p className="line-clamp-2 text-sm font-bold leading-snug text-[#1A1A1A]">{title}</p>
        {meta ? <p className="mt-1 text-xs font-medium text-[#8A8A8A]">{meta}</p> : null}
      </div>
    </div>
    {children ? <div className="mt-4">{children}</div> : null}
  </div>
);
