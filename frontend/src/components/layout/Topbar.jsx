import { FiLogOut } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../models/auth.store";
import { cn } from "../../utils/cn";
import { AppLogo } from "../brand/AppLogo";
import { Button } from "../ui/Button";

const TEACHER_PAGE_TITLE = {
  "/teacher": "Overview",
  "/teacher/availability": "Availability",
  "/teacher/calendar": "Calendar",
};

export const Topbar = () => {
  const { user, logout } = useAuthStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const teacher = user?.role === "teacher";
  const admin = user?.role === "admin";
  const pageTitle = teacher ? TEACHER_PAGE_TITLE[pathname] ?? "Workspace" : null;
  const handleLogout = () => {
    logout();
    navigate(admin ? "/login/admin" : "/", { replace: true });
  };

  return (
    <header
      className={cn(
        "flex items-center justify-between px-5 py-4 md:px-6",
        teacher
          ? "border-b border-slate-200/90 bg-white"
          : admin
            ? "border-b border-admin-light/40 bg-admin-white"
            : "border-b border-brand-100/70 bg-white/80 backdrop-blur-sm",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <AppLogo
          size="sm"
          className={cn("hidden shrink-0 sm:inline-flex", admin && "focus-visible:ring-offset-[#FFFFFF]")}
          linkTo="/"
        />
        <div className="min-w-0">
          {teacher ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Teacher workspace
              </p>
              <h1 className="font-heading text-xl font-semibold tracking-tight text-teacher-ink">
                {pageTitle}
              </h1>
              <p className="mt-0.5 max-w-md truncate text-sm text-slate-500">{user?.email}</p>
            </>
          ) : admin ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-admin-primary">Operations</p>
              <h1 className="font-heading text-xl font-bold tracking-tight text-admin-dark">Admin dashboard</h1>
              <p className="mt-0.5 max-w-md truncate text-sm text-admin-primary">{user?.email}</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold capitalize">{user?.role} Dashboard</h1>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </>
          )}
        </div>
      </div>
      <Button
        variant={teacher ? "teacherGhost" : "ghost"}
        className={cn(
          "inline-flex items-center gap-2",
          admin &&
            "!rounded-xl border-admin-light/60 bg-admin-white text-admin-dark hover:bg-admin-grey hover:border-admin-primary/30",
        )}
        onClick={handleLogout}
      >
        <FiLogOut />
        Logout
      </Button>
    </header>
  );
};
