const IST = "Asia/Kolkata";

export const toDateLabel = (dateString) =>
  new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: IST,
  });

export const toTimeLabel = (isoString) =>
  new Date(isoString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: IST,
  });

export const toIsoDate = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}T00:00:00.000Z`;
};

export const nextDays = (daysCount) => {
  const days = [];
  const now = new Date();
  for (let index = 0; index < daysCount; index += 1) {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() + index);
    days.push(date);
  }
  return days;
};

/** YYYY-MM-DD for the given instant in Asia/Kolkata (IST). */
export const getKolkataYmd = (instant = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(instant)
    .reduce((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const addDaysToYmdKolkata = (ymd, daysToAdd) => {
  const anchor = new Date(`${ymd}T12:00:00+05:30`);
  anchor.setTime(anchor.getTime() + Number(daysToAdd) * 86400000);
  return getKolkataYmd(anchor);
};

/** Consecutive calendar days starting from today in Kolkata (as UTC-midnight Date for picker keys). */
export const nextKolkataDays = (daysCount) => {
  const baseYmd = getKolkataYmd();
  const days = [];
  for (let index = 0; index < daysCount; index += 1) {
    const ymd = addDaysToYmdKolkata(baseYmd, index);
    days.push(new Date(`${ymd}T00:00:00.000Z`));
  }
  return days;
};

/** HH:mm in IST for (now + offsetMs), for time inputs and presets. */
export const getMinStartHhmmKolkataAfterMs = (offsetMs = 3600000) => {
  const d = new Date(Date.now() + offsetMs);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  })
    .formatToParts(d)
    .reduce((acc, part) => {
      if (part.type === "hour" || part.type === "minute") acc[part.type] = part.value;
      return acc;
    }, {});
  return `${parts.hour}:${parts.minute}`;
};
