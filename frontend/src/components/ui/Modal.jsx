import { Button } from "./Button";
import { Loader } from "./Loader";

/**
 * @param {{ tone?: 'default' | 'admin' }} props
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
}) => {
  const admin = tone === "admin" || tone === "brand";
  return open ? (
    <div
      className={
        admin
          ? "fixed inset-0 z-40 grid place-items-center bg-[#0B3C5D]/55 p-4 transition"
          : "fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4 transition"
      }
    >
      <div
        className={
          admin
            ? "w-full max-w-lg rounded-2xl border border-[#8BBCEB]/45 bg-[#FFFFFF] p-6 shadow-[0_24px_56px_-20px_rgba(11,60,93,0.4)]"
            : "w-full max-w-lg rounded-2xl bg-white p-5 shadow-soft transition"
        }
      >
        <h2 className={admin ? "font-heading text-lg font-bold text-[#0B3C5D]" : "text-lg font-semibold"}>
          {title}
        </h2>
        <div className="mt-3">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
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
    </div>
  ) : null;
};
