import { NavLink } from "react-router-dom";
import { navigationByRole } from "../../models/navigation.model";
import { cn } from "../../utils/cn";
import { AppLogo } from "../brand/AppLogo";

export const Sidebar = ({ role }) => {
  const links = navigationByRole[role] || [];
  const teacher = role === "teacher";
  const admin = role === "admin";

  return (
    <aside
      className={cn(
        "hidden w-60 shrink-0 lg:block",
        teacher
          ? "border-r border-teacher-line bg-white p-4"
          : admin
            ? "border-r border-admin-primary/25 bg-admin-dark p-4 shadow-[4px_0_24px_-8px_rgba(11,60,93,0.35)]"
            : "border-r border-brand-100/70 bg-white/90 p-5",
      )}
    >
      <div
        className={cn(
          "mb-8",
          teacher && "border-b border-slate-100 pb-5",
          admin && "border-b border-white/10 pb-6",
        )}
      >
        <AppLogo
          size="sm"
          className={cn("mb-3", admin && "focus-visible:ring-offset-[#0B3C5D]")}
          linkTo="/"
        />
        <p
          className={cn(
            "font-heading text-[1.05rem] font-semibold tracking-tight",
            teacher ? "text-teacher-ink" : admin ? "text-lg font-bold text-admin-white" : "text-lg font-bold text-brand-700",
          )}
        >
          MeetReserve
        </p>
        {teacher ? (
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
            Instructor
          </p>
        ) : admin ? (
          <p className="mt-2 inline-flex rounded-full bg-admin-gold/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-admin-gold">
            Admin
          </p>
        ) : null}
      </div>
      <nav className="space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 text-sm font-medium transition-colors",
                teacher
                  ? [
                      "rounded-lg px-3 py-2.5",
                      isActive
                        ? "bg-teacher-navy text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-teacher-ink",
                    ]
                  : admin
                    ? [
                        "rounded-xl px-3 py-2.5",
                        isActive
                          ? "bg-admin-primary text-admin-white shadow-md shadow-admin-dark/20"
                          : "text-admin-light hover:bg-white/10 hover:text-admin-white",
                      ]
                    : [
                        "rounded-xl px-3 py-2 text-slate-600",
                        isActive ? "bg-brand-600 text-white" : "hover:bg-brand-50",
                      ],
              )
            }
          >
            <link.icon
              className={cn(
                "h-[1.1rem] w-[1.1rem] shrink-0",
                teacher && "opacity-90",
                admin && "opacity-95",
              )}
            />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
