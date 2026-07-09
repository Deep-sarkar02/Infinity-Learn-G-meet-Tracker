import { useEffect } from "react";
import { Button } from "./Button";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { renderModalPortal } from "./modalPortal";

/**
 * Read-only modal with a single Close action (no confirm flow).
 * @param {{ tone?: 'default' | 'admin' | 'il' }} props
 */
export const InfoModal = ({ open, title, onClose, children, footer, tone = "default" }) => {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const admin = tone === "admin";
  const il = tone === "il";

  return open
    ? renderModalPortal(
    <div
      className={
        il
          ? "fixed inset-0 z-[200] flex items-end justify-center overflow-hidden bg-[#0B0B0B]/55 p-4 sm:items-center"
          : admin
            ? "fixed inset-0 z-[200] flex items-end justify-center overflow-hidden bg-[#0B3C5D]/55 p-4 sm:items-center"
            : "fixed inset-0 z-[200] flex items-end justify-center overflow-hidden bg-slate-900/50 p-4 sm:items-center"
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      onClick={onClose}
    >
      <div
        className={
          il
            ? "flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.2)]"
            : admin
              ? "flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#8BBCEB]/50 bg-[#FFFFFF] shadow-[0_24px_48px_-12px_rgba(11,60,93,0.35)]"
              : "flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={
            il || admin
              ? "flex items-start justify-between gap-3 border-b border-[#F0F0F0] px-5 py-4"
              : "flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4"
          }
        >
          <h2
            id="info-modal-title"
            className={
              il
                ? "text-lg font-bold text-[#1A1A1A]"
                : admin
                  ? "text-lg font-bold text-[#0B3C5D]"
                  : "text-lg font-semibold text-slate-900"
            }
          >
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            className={
              il
                ? "!border-[#E5E5E5] !px-2 !py-1 !text-[#007BFF] hover:!bg-[#F8FBFF]"
                : admin
                  ? "!border-[#8BBCEB]/50 !px-2 !py-1 !text-[#1E73D8] hover:!bg-[#F5F5F5]"
                  : "!px-2 !py-1 text-slate-500"
            }
            onClick={onClose}
          >
            Close
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className={il || admin ? "border-t border-[#F0F0F0] px-5 py-3" : "border-t border-slate-100 px-5 py-3"}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
      )
    : null;
};
