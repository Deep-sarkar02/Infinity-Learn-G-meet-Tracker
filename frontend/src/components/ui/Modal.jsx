import { useEffect } from "react";
import { Button } from "./Button";
import { Loader } from "./Loader";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { renderModalPortal } from "./modalPortal";

/**
 * @param {{ tone?: 'default' | 'admin', maxWidth?: 'md' | 'lg' }} props
 */
export const Modal = ({
  open,
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel,
  confirmDisabled,
  confirmLoading,
  tone = "default",
  maxWidth = "md",
}) => {
  const admin = tone === "admin" || tone === "brand";
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = maxWidth === "lg" ? "max-w-2xl" : "max-w-lg";

  return renderModalPortal(
    <div
      className={
        admin
          ? "fixed inset-0 z-[200] flex items-end justify-center overflow-hidden bg-[#0B3C5D]/55 p-4 sm:items-center"
          : "fixed inset-0 z-[200] flex items-end justify-center overflow-hidden bg-slate-900/40 p-4 sm:items-center"
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[min(90vh,100%)] w-full ${widthClass} flex-col overflow-hidden rounded-2xl shadow-[0_24px_56px_-20px_rgba(11,60,93,0.4)] ${
          admin
            ? "border border-[#8BBCEB]/45 bg-[#FFFFFF]"
            : "bg-white shadow-soft"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`shrink-0 px-6 pt-6 ${admin ? "" : "px-5 pt-5"}`}>
          <h2
            id="modal-title"
            className={admin ? "font-heading text-lg font-bold text-[#0B3C5D]" : "text-lg font-semibold"}
          >
            {title}
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-3">{children}</div>
        <div
          className={`flex shrink-0 justify-end gap-2 border-t px-6 py-4 ${
            admin ? "border-[#F5F5F5]" : "border-slate-100"
          }`}
        >
          <Button variant={admin ? "adminGhost" : "ghost"} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={admin ? "adminSecondary" : "secondary"}
            onClick={onConfirm}
            disabled={confirmDisabled || confirmLoading}
          >
            {confirmLoading ? (
              <Loader label="Saving..." variant={admin ? "admin" : "default"} />
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>,
  );
};
