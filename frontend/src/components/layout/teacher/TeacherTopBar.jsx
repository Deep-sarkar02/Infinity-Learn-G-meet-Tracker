import { NavLink } from "react-router-dom";
import { AppLogo } from "../../brand/AppLogo";
import { useAuthStore } from "../../../models/auth.store";
import { cn } from "../../../utils/cn";

const navClass = ({ isActive }) =>
  cn(
    "text-base font-semibold transition-colors",
    isActive ? "text-[#1E73D8]" : "text-[#1E73D8]/55 hover:text-[#0B3C5D]",
  );

export const TeacherTopBar = () => {
  const user = useAuthStore((s) => s.user);
  const initial = String(user?.name || user?.email || "T")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex items-center justify-between border-b border-[#8BBCEB]/35 bg-[#FFFFFF]/95 px-6 py-4 shadow-[0_12px_40px_-16px_rgba(11,60,93,0.12)] backdrop-blur-[20px] md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-8">
        <AppLogo size="md" className="shrink-0" linkTo="/" />
        <nav className="flex flex-wrap items-center gap-3 text-sm md:gap-6 md:text-base" aria-label="Primary">
          <NavLink to="/teacher" className={navClass} end>
            Dashboard
          </NavLink>
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#FFFFFF] bg-[#8BBCEB]/45 text-sm font-bold text-[#0B3C5D] shadow-[0_0_0_2px_rgba(139,188,235,0.35)]"
          aria-hidden
        >
          {initial}
        </div>
      </div>
    </header>
  );
};
