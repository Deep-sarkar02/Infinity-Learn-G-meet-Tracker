import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { FiCalendar, FiClock, FiHome, FiLogOut, FiList } from "react-icons/fi";
import { useAuthStore } from "../../../models/auth.store";
import { cn } from "../../../utils/cn";
import { AppLogo } from "../../brand/AppLogo";

const itemClass = (active) =>
  cn(
    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
    active
      ? "bg-[#FFFFFF] text-[#1E73D8] shadow-[0_8px_24px_-12px_rgba(11,60,93,0.2)]"
      : "text-[#1E73D8]/70 hover:bg-[#FFFFFF]/70 hover:text-[#0B3C5D]",
  );

export const TeacherSideNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const firstName = String(user?.name || "Teacher").trim().split(" ")[0];

  const availabilityActive = pathname === "/teacher/availability";
  const dashboardActive = pathname === "/teacher";
  const calendarActive = pathname === "/teacher/calendar";
  const historyActive = pathname === "/teacher/history";
  const handleLogout = () => {
    logout();
    navigate("/login/teacher", { replace: true });
  };

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-[#8BBCEB]/30 bg-[#F5F5F5] lg:flex">
      <div className="flex flex-1 flex-col gap-8 p-6">
        <AppLogo size="sm" className="mb-1" linkTo="/" />
        <div>
          <p className="text-xl font-bold tracking-[-0.025em] text-[#0B3C5D]">Hi, {firstName}</p>
          {user?.grade ? (
            <p className="mt-2 text-sm font-semibold text-[#0B3C5D]">
              Grade taught: <span className="text-[#1E73D8]">{user.grade}</span>
            </p>
          ) : null}
          {user?.display ? (
            <p className="mt-1 text-sm font-semibold text-[#0B3C5D]">
              Channel: <span className="text-[#1E73D8]">{user.display}</span>
            </p>
          ) : null}
          {user?.batchId ? (
            <p className="mt-1 text-sm font-semibold text-[#0B3C5D]">
              Batch: <span className="text-[#1E73D8]">{user.batchId}</span>
              {user?.batchName ? <span className="text-[#1E73D8]/80"> ({user.batchName})</span> : null}
            </p>
          ) : null}
        </div>

        <nav className="flex flex-col gap-2" aria-label="Workspace">
          <NavLink
            to="/teacher"
            end
            className={() => itemClass(dashboardActive)}
          >
            <FiHome className="h-[18px] w-[18px] shrink-0" aria-hidden />
            Dashboard
          </NavLink>
          <NavLink
            to="/teacher/availability"
            className={() => itemClass(availabilityActive)}
          >
            <FiClock className="h-[18px] w-[18px] shrink-0" aria-hidden />
            Availability
          </NavLink>
          <NavLink to="/teacher/calendar" className={() => itemClass(calendarActive)}>
            <FiCalendar className="h-[18px] w-[18px] shrink-0" aria-hidden />
            Calendar
          </NavLink>
          <NavLink to="/teacher/history" className={() => itemClass(historyActive)}>
            <FiList className="h-[18px] w-[18px] shrink-0" aria-hidden />
            Booking history
          </NavLink>
        </nav>

        <div className="mt-auto space-y-4 pt-8">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-[#1E73D8]/75 transition hover:text-[#0B3C5D]"
          >
            <FiLogOut className="h-4 w-4" aria-hidden />
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
};
