import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { FiCalendar, FiClock, FiHome, FiLogOut, FiList, FiBookOpen, FiX } from "react-icons/fi";
import { useAuthStore } from "../../../models/auth.store";
import { cn } from "../../../utils/cn";
import { AppLogo } from "../../brand/AppLogo";

const itemClass = (active) =>
  cn(
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
    active
      ? "bg-[#FFFFFF] text-[#1E73D8] shadow-[0_8px_24px_-12px_rgba(11,60,93,0.2)]"
      : "text-[#1E73D8]/70 hover:bg-[#FFFFFF]/70 hover:text-[#0B3C5D]",
  );

export const TeacherNavPanel = ({ onNavigate, showClose = false, onClose }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const firstName = String(user?.name || "Teacher").trim().split(" ")[0];

  const availabilityActive = pathname === "/teacher/availability";
  const dashboardActive = pathname === "/teacher";
  const calendarActive = pathname === "/teacher/calendar";
  const historyActive = pathname === "/teacher/history";
  const assignmentsActive = pathname === "/teacher/assignments";

  const handleLogout = () => {
    logout();
    onNavigate?.();
    navigate("/login/teacher", { replace: true });
  };

  const linkProps = { onClick: () => onNavigate?.() };

  return (
    <div className="flex h-full flex-col gap-5 p-4">
      <div className="flex items-center justify-between gap-2">
        <AppLogo size="sm" className="mb-0" linkTo="/" />
        {showClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0B3C5D] hover:bg-[#FFFFFF]/80"
            aria-label="Close menu"
          >
            <FiX className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
      </div>
      <div>
        <p className="text-base font-bold tracking-[-0.02em] text-[#0B3C5D]">Hi, {firstName}</p>
      </div>

      <nav className="flex flex-col gap-1" aria-label="Workspace">
        <NavLink to="/teacher" end className={() => itemClass(dashboardActive)} {...linkProps}>
          <FiHome className="h-4 w-4 shrink-0" aria-hidden />
          Dashboard
        </NavLink>
        <NavLink to="/teacher/availability" className={() => itemClass(availabilityActive)} {...linkProps}>
          <FiClock className="h-4 w-4 shrink-0" aria-hidden />
          Availability
        </NavLink>
        <NavLink to="/teacher/calendar" className={() => itemClass(calendarActive)} {...linkProps}>
          <FiCalendar className="h-4 w-4 shrink-0" aria-hidden />
          Calendar
        </NavLink>
        <NavLink to="/teacher/history" className={() => itemClass(historyActive)} {...linkProps}>
          <FiList className="h-4 w-4 shrink-0" aria-hidden />
          Booking history
        </NavLink>
        <NavLink to="/teacher/assignments" className={() => itemClass(assignmentsActive)} {...linkProps}>
          <FiBookOpen className="h-4 w-4 shrink-0" aria-hidden />
          What I teach
        </NavLink>
      </nav>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-semibold text-[#1E73D8]/75 transition hover:text-[#0B3C5D]"
        >
          <FiLogOut className="h-4 w-4" aria-hidden />
          Log out
        </button>
      </div>
    </div>
  );
};

export const TeacherSideNav = () => (
  <aside className="hidden w-[13.5rem] shrink-0 flex-col border-r border-[#8BBCEB]/30 bg-[#F5F5F5] lg:flex">
    <TeacherNavPanel />
  </aside>
);
