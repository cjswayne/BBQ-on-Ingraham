const PACIFIC_TIME_ZONE = "America/Los_Angeles";
const WEEKDAY_INDEX = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

const pacificPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});

const pacificOffsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TIME_ZONE,
  timeZoneName: "shortOffset",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const extractParts = (formatter, date) => {
  return formatter.formatToParts(date).reduce((accumulator, part) => {
    if (part.type !== "literal") {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {});
};

export const getPacificDateParts = (date = new Date()) => {
  const parts = extractParts(pacificPartsFormatter, date);

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: parts.weekday
  };
};

export const getPacificOffsetMinutes = (date = new Date()) => {
  const parts = extractParts(pacificOffsetFormatter, date);
  const offsetText = parts.timeZoneName || "GMT-0";
  const match = offsetText.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);

  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || 0);

  return sign * (hours * 60 + minutes);
};

export const getPacificMidnightUtcDate = (year, month, day) => {
  const probeDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const offsetMinutes = getPacificOffsetMinutes(probeDate);
  const midnightUtcMs =
    Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMinutes * 60 * 1000;

  return new Date(midnightUtcMs);
};

export const getMondayDate = (date = new Date()) => {
  const pacificParts = getPacificDateParts(date);
  const currentWeekday = WEEKDAY_INDEX[pacificParts.weekday] ?? 0;
  const daysUntilMonday = currentWeekday === 1 ? 0 : (8 - currentWeekday) % 7;
  const seedDate = new Date(
    Date.UTC(pacificParts.year, pacificParts.month - 1, pacificParts.day)
  );

  seedDate.setUTCDate(seedDate.getUTCDate() + daysUntilMonday);

  return {
    year: seedDate.getUTCFullYear(),
    month: seedDate.getUTCMonth() + 1,
    day: seedDate.getUTCDate()
  };
};

// Returns the day-of-month for the first Monday of the given year/month
const getFirstMondayDayOfMonth = (year, month) => {
  // Probe noon UTC on the 1st to safely determine Pacific weekday regardless of DST
  const probeDate = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const parts = getPacificDateParts(probeDate);
  const weekdayIdx = WEEKDAY_INDEX[parts.weekday] ?? 0;
  const daysUntilMonday = weekdayIdx === 1 ? 0 : (8 - weekdayIdx) % 7;
  return 1 + daysUntilMonday;
};

// Returns { year, month, day } pairs for the 1st and 3rd Mondays of the given month
export const getEventMondaysOfMonth = (year, month) => {
  const firstMondayDay = getFirstMondayDayOfMonth(year, month);
  return [
    { year, month, day: firstMondayDay },
    { year, month, day: firstMondayDay + 14 }
  ];
};

// Returns the next event date: 1st or 3rd Monday of the month.
// If today is on or before the 1st Monday → 1st Monday.
// If today is on or before the 3rd Monday → 3rd Monday.
// If both have passed → 1st Monday of next month.
export const getNextMonday = (date = new Date()) => {
  const today = getPacificDateParts(date);
  const todayNum = today.year * 10000 + today.month * 100 + today.day;

  const currentMondays = getEventMondaysOfMonth(today.year, today.month);
  for (const m of currentMondays) {
    const mNum = m.year * 10000 + m.month * 100 + m.day;
    if (todayNum <= mNum) {
      return getPacificMidnightUtcDate(m.year, m.month, m.day);
    }
  }

  // Both event Mondays for this month have passed — advance to next month
  const nextMonth = today.month === 12 ? 1 : today.month + 1;
  const nextYear = today.month === 12 ? today.year + 1 : today.year;
  const nextMonthMondays = getEventMondaysOfMonth(nextYear, nextMonth);
  const first = nextMonthMondays[0];
  return getPacificMidnightUtcDate(first.year, first.month, first.day);
};

export const isMonday = (date = new Date()) => {
  const pacificParts = getPacificDateParts(date);

  return pacificParts.weekday === "Mon";
};

export const toPacificDateKey = (date = new Date()) => {
  const pacificParts = getPacificDateParts(date);
  const month = String(pacificParts.month).padStart(2, "0");
  const day = String(pacificParts.day).padStart(2, "0");

  return `${pacificParts.year}-${month}-${day}`;
};

export { PACIFIC_TIME_ZONE };
