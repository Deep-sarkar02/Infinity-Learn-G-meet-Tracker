import { FiMenu } from "react-icons/fi";
import { AppLogo } from "../../brand/AppLogo";
import { useAuthStore } from "../../../models/auth.store";

export const TeacherTopBar = ({ onOpenNav }) => {
  const user = useAuthStore((s) => s.user);
  const initial = String(user?.name || user?.email || "T")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex items-center justify-between gap-3 border-b border-[#8BBCEB]/35 bg-[#FFFFFF]/95 px-4 py-2.5 shadow-[0_8px_24px_-14px_rgba(11,60,93,0.1)] backdrop-blur-[20px] md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenNav}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#0B3C5D] transition hover:bg-[#F5F5F5] lg:hidden"
          aria-label="Open menu"
        >
          <FiMenu className="h-5 w-5" aria-hidden />
        </button>
        <AppLogo size="sm" className="shrink-0" linkTo="/" />
      </div>
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#FFFFFF] bg-[#8BBCEB]/45 text-xs font-bold text-[#0B3C5D] shadow-[0_0_0_2px_rgba(139,188,235,0.35)]"
        aria-hidden
      >
        {initial}
      </div>
    </header>
  );
};
