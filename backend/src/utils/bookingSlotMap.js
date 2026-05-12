/**
 * When multiple bookings reference the same slot (e.g. teacher cancel then rebook),
 * prefer the scheduled row for availability and UI.
 */
function pickDominantSlotBooking(current, next) {
  if (!current) return next;
  if (current.status === "scheduled") return current;
  if (next.status === "scheduled") return next;
  const cu = new Date(current.updatedAt || 0).getTime();
  const nu = new Date(next.updatedAt || 0).getTime();
  return nu > cu ? next : current;
}

module.exports = { pickDominantSlotBooking };
