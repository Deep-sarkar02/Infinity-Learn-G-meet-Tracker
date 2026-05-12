import { useEffect, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { Loader } from "../ui/Loader";
import { toDateLabel, toTimeLabel } from "../../utils/date";
import { cn } from "../../utils/cn";

/**
 * @param {{ open: boolean, booking: { id?: string, learnerName?: string } | null, onClose: () => void, fetchOptions: (bookingId: string) => Promise<Array<{ availabilityId: string, date: string, slots: Array<{ slotId: string, startTime: string, endTime: string }> }>>, onConfirm: (bookingId: string, payload: { availabilityId: string, slotId: string }) => Promise<boolean> }} props
 */
export const RescheduleBookingModal = ({ open, booking, onClose, fetchOptions, onConfirm }) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => {
    if (!open || !booking?.id) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setSelectedKey(null);
      const rows = await fetchOptions(booking.id);
      if (!cancelled) setOptions(Array.isArray(rows) ? rows : []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, booking?.id, fetchOptions]);

  const flatChoices = useMemo(() => {
    const list = [];
    for (const row of options) {
      for (const slot of row.slots || []) {
        list.push({
          key: `${row.availabilityId}|${slot.slotId}`,
          availabilityId: row.availabilityId,
          slotId: slot.slotId,
          date: row.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    }
    return list;
  }, [options]);

  const handleClose = () => {
    setSelectedKey(null);
    setOptions([]);
    onClose();
  };

  const handleConfirm = async () => {
    if (!booking?.id || !selectedKey) return;
    const choice = flatChoices.find((c) => c.key === selectedKey);
    if (!choice) return;
    setSubmitting(true);
    const ok = await onConfirm(booking.id, {
      availabilityId: choice.availabilityId,
      slotId: choice.slotId,
    });
    setSubmitting(false);
    if (ok) handleClose();
  };

  return (
    <Modal
      open={open && Boolean(booking)}
      title="Reschedule session"
      tone="brand"
      confirmLabel="Move session here"
      onClose={handleClose}
      onConfirm={handleConfirm}
      confirmDisabled={!selectedKey || flatChoices.length === 0}
      confirmLoading={submitting}
    >
      <div className="space-y-4 text-sm font-medium text-[#1E73D8]/90">
        <p>
          Choose another open slot you already published for{" "}
          <span className="font-bold text-[#0B3C5D]">{booking?.learnerName || "this learner"}</span>, on the{" "}
          <span className="font-bold text-[#0B3C5D]">same day or any later date</span> (not an earlier day). The new
          slot must start <span className="font-bold text-[#0B3C5D]">more than one hour from now</span>. If you stay on
          the <span className="font-bold text-[#0B3C5D]">same calendar day</span>, it must start{" "}
          <span className="font-bold text-[#0B3C5D]">after your current session ends</span>. The previous time opens up
          again; the learner gets an email with the new time and Meet link.
        </p>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader label="Loading open slots…" variant="admin" />
          </div>
        ) : flatChoices.length === 0 ? (
          <p className="rounded-xl border border-[#F4D35E]/50 bg-[#FFF9E6] px-4 py-3 text-sm font-semibold text-[#0B3C5D]">
            No qualifying open slots in your booking window (after the one-hour lead time, and same-day picks must be
            after your session ends). Add availability first, then reschedule.
          </p>
        ) : (
          <ul
            className="max-h-[min(360px,50vh)] space-y-2 overflow-y-auto rounded-xl border border-[#8BBCEB]/35 bg-[#F5F5F5]/80 p-3"
            role="listbox"
            aria-label="Open slots"
          >
            {flatChoices.map((c) => {
              const active = selectedKey === c.key;
              return (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(c.key)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-3 text-left text-sm transition",
                      active
                        ? "border-[#1E73D8] bg-[#8BBCEB]/30 font-bold text-[#0B3C5D]"
                        : "border-[#8BBCEB]/40 bg-[#FFFFFF] text-[#0B3C5D] hover:border-[#1E73D8]/40",
                    )}
                  >
                    <span className="block font-semibold text-[#0B3C5D]">{toDateLabel(c.date)}</span>
                    <span className="mt-0.5 block text-[#1E73D8]">
                      {toTimeLabel(c.startTime)} – {toTimeLabel(c.endTime)} IST
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
};
