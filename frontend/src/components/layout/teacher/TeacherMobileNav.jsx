import { useEffect } from "react";
import { cn } from "../../../utils/cn";
import { TeacherNavPanel } from "./TeacherSideNav";

export const TeacherMobileNav = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <div
      className={cn("fixed inset-0 z-50 lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
    >
      <button
        type="button"
        className={cn(
          "absolute inset-0 bg-[#0B3C5D]/40 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
      />
      <aside
        className={cn(
          "absolute inset-y-0 left-0 flex w-[16.5rem] max-w-[85vw] flex-col border-r border-[#8BBCEB]/30 bg-[#F5F5F5] shadow-[8px_0_32px_-8px_rgba(11,60,93,0.25)] transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Teacher navigation"
        aria-hidden={!open}
      >
        <TeacherNavPanel showClose onClose={onClose} onNavigate={onClose} />
      </aside>
    </div>
  );
};
