import { useState } from "react";
import { Modal } from "../ui/Modal";

/**
 * @param {{ open: boolean, booking: { id?: string, learnerName?: string } | null, onClose: () => void, onConfirm: (bookingId: string, payload: { reason?: string }) => Promise<boolean> }} props
 */
export const CancelBookingModal = ({ open, booking, onClose, onConfirm }) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setReason("");
    onClose();
  };

  const handleConfirm = async () => {
    if (!booking?.id) return;
    setLoading(true);
    const payload = reason.trim() ? { reason: reason.trim().slice(0, 500) } : {};
    const ok = await onConfirm(booking.id, payload);
    setLoading(false);
    if (ok) handleClose();
  };

  return (
    <Modal
      open={open && Boolean(booking)}
      title="Cancel booking"
      tone="brand"
      confirmLabel="Confirm cancellation"
      onClose={handleClose}
      onConfirm={handleConfirm}
      confirmLoading={loading}
    >
      <div className="space-y-4 text-sm font-medium text-[#1E73D8]/90">
        <p>
          Cancel the session for{" "}
          <span className="font-bold text-[#0B3C5D]">{booking?.learnerName || "this learner"}</span>? The time block
          stays closed and will not be offered to other students. The learner is notified by email.
        </p>
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-[#0B3C5D]">Message to include (optional)</span>
          <textarea
            className="min-h-[88px] w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm text-[#0B3C5D] outline-none transition placeholder:text-[#1E73D8]/40 focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Short note for the cancellation email (optional)"
          />
        </label>
      </div>
    </Modal>
  );
};
