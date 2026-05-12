import { Modal } from "../ui/Modal";
import { toDateLabel, toTimeLabel } from "../../utils/date";

export const BookingConfirmationModal = ({
  open,
  selection,
  onClose,
  onConfirm,
}) => (
  <Modal
    open={open}
    title="Confirm booking"
    confirmLabel="Confirm slot"
    tone="brand"
    onClose={onClose}
    onConfirm={onConfirm}
  >
    {selection ? (
      <div className="space-y-2 text-sm font-medium text-[#1E73D8]/90">
        <p>
          <span className="font-bold text-[#0B3C5D]">Teacher:</span>{" "}
          <span className="text-[#0B3C5D]">{selection.teacher.teacherName}</span>
        </p>
        <p>
          <span className="font-bold text-[#0B3C5D]">Date:</span>{" "}
          <span className="text-[#0B3C5D]">{toDateLabel(selection.slot.startTime)}</span>
        </p>
        <p>
          <span className="font-bold text-[#0B3C5D]">Time:</span>{" "}
          <span className="text-[#0B3C5D]">
            {toTimeLabel(selection.slot.startTime)} – {toTimeLabel(selection.slot.endTime)} UTC
          </span>
        </p>
      </div>
    ) : null}
  </Modal>
);
