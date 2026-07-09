const pad2 = (n) => String(n).padStart(2, "0");

/** Consecutive 7-day buckets within a calendar month (IST week split used in analytics). */
export const getWeeksInMonth = (monthYyyyMm) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthYyyyMm)) return [];
  const [y, m] = monthYyyyMm.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weeks = [];
  for (let startDay = 1; startDay <= lastDay; startDay += 7) {
    const endDay = Math.min(startDay + 6, lastDay);
    const fromYmd = `${monthYyyyMm}-${pad2(startDay)}`;
    const toYmd = `${monthYyyyMm}-${pad2(endDay)}`;
    weeks.push({
      week: weeks.length + 1,
      fromYmd,
      toYmd,
      label: `${fromYmd} — ${toYmd}`,
    });
  }
  return weeks;
};

export const formatWeekOptionLabel = (week) => {
  const fmt = (ymd) => {
    const d = new Date(`${ymd}T12:00:00+05:30`);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  };
  return `Week ${week.week} (${fmt(week.fromYmd)} – ${fmt(week.toYmd)})`;
};
