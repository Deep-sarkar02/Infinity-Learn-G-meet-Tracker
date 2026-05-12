import { useEffect, useState } from "react";
import { FiCalendar } from "react-icons/fi";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAdminController } from "../../controllers/admin.controller";
import { cn } from "../../utils/cn";
import { AdminPageHero, AdminPanel } from "../../components/admin/AdminPageChrome";
import { Loader } from "../../components/ui/Loader";

const PRESETS = [7, 14, 21, 30, 45, 60];

export const BookingWindowPage = () => {
  const { setBookingWindow, loadBookingWindow, loading } = useAdminController();
  const [days, setDays] = useState(7);
  const [currentWindowDays, setCurrentWindowDays] = useState(null);

  useEffect(() => {
    let active = true;
    const loadCurrent = async () => {
      const current = await loadBookingWindow();
      if (!active || current == null) return;
      setCurrentWindowDays(current);
      setDays(current);
    };
    void loadCurrent();
    return () => {
      active = false;
    };
  }, [loadBookingWindow]);

  const onSubmit = async (event) => {
    event.preventDefault();
    const updated = await setBookingWindow(Number(days));
    if (!updated) return;
    const updatedDays = Number(updated.bookingWindowDays) || Number(days);
    setCurrentWindowDays(updatedDays);
    setDays(updatedDays);
  };

  const n = Number(days);
  const valid = !Number.isNaN(n) && n >= 1 && n <= 60;

  return (
    <div className="space-y-6 pb-4">
      <AdminPageHero
        eyebrow="Scheduling policy"
        title="Booking window"
        description="Control how far ahead learners can reserve sessions. Changes apply platform-wide for new booking attempts."
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-[#FFFFFF]/25 bg-[#FFFFFF]/10 px-3 py-1.5 text-xs font-semibold text-[#F4D35E]">
          <FiCalendar className="h-4 w-4" />
          {currentWindowDays ?? "—"} days set
        </span>
      </AdminPageHero>

      <div className="grid gap-6 lg:grid-cols-5">
        <AdminPanel className="lg:col-span-3">
          <h2 className="font-heading text-lg font-bold text-[#0B3C5D]">Horizon length</h2>
          <p className="mt-1 text-sm font-medium text-[#1E73D8]/85">
            Pick a preset or enter a custom value (1–60). Students only see slots inside this window.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-[#0B3C5D]">
              Current set window length:{" "}
              <span className="text-[#1E73D8]">{currentWindowDays ?? "—"} day(s)</span>
            </p>
            {loading ? <Loader label="Updating..." variant="admin" /> : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  "rounded-xl border px-4 py-2 text-sm font-bold transition",
                  Number(days) === d
                    ? "border-[#1E73D8] bg-[#1E73D8] text-[#FFFFFF] shadow-[0_8px_20px_-8px_rgba(30,115,216,0.45)]"
                    : "border-[#8BBCEB]/50 bg-[#FFFFFF] text-[#0B3C5D] hover:border-[#1E73D8]/40 hover:bg-[#F5F5F5]",
                )}
              >
                {d}d
              </button>
            ))}
          </div>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <Input
              tone="admin"
              label="Booking window in days (1–60)"
              type="number"
              min={1}
              max={60}
              value={days}
              onChange={(event) => setDays(event.target.value)}
              required
            />
            <Button type="submit" variant="adminPrimary" disabled={loading || !valid}>
              {loading ? "Saving…" : "Save window"}
            </Button>
          </form>
        </AdminPanel>

        <AdminPanel className="relative overflow-hidden lg:col-span-2">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#F4D35E]/20 blur-2xl" aria-hidden />
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#1E73D8]">Preview</p>
          <p className="mt-4 font-heading text-5xl font-black tabular-nums text-[#0B3C5D]">
            {valid ? n : "—"}
          </p>
          <p className="mt-2 text-sm font-semibold text-[#1E73D8]">days forward</p>
          <p className="mt-1 text-xs font-semibold text-[#0B3C5D]/75">
            Current saved value: {currentWindowDays ?? "—"} day(s)
          </p>
          <div className="mt-6 space-y-2 rounded-2xl border border-[#8BBCEB]/35 bg-[#F5F5F5] p-4 text-xs font-medium leading-relaxed text-[#0B3C5D]">
            <p className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#25D366]" />
              Shorter windows reduce long-range noise.
            </p>
            <p className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F4D35E]" />
              Longer windows help planners who schedule far ahead.
            </p>
          </div>
        </AdminPanel>
      </div>
    </div>
  );
};
