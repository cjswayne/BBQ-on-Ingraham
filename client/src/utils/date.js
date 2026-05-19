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

const pacificFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short"
});

const extractPacificParts = (date = new Date()) => {
  return pacificFormatter.formatToParts(date).reduce((accumulator, part) => {
    if (part.type !== "literal") {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {});
};

export const getClosestMondayInputValue = (date = new Date()) => {
  const pacificParts = extractPacificParts(date);
  const todayYear = Number(pacificParts.year);
  const todayMonth = Number(pacificParts.month);
  const todayDay = Number(pacificParts.day);
  const todayNum = todayYear * 10000 + todayMonth * 100 + todayDay;

  // Returns the day-of-month for the 1st Monday in the given year/month
  const getFirstMondayDay = (y, m) => {
    const probe = new Date(Date.UTC(y, m - 1, 1));
    const parts = extractPacificParts(probe);
    const idx = WEEKDAY_INDEX[parts.weekday] ?? 0;
    return 1 + (idx === 1 ? 0 : (8 - idx) % 7);
  };

  // Build ISO date string from year/month/day integers
  const toInputValue = (y, m, d) =>
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  // Check 1st and 3rd Monday of current month, then 1st of next month
  const firstDay = getFirstMondayDay(todayYear, todayMonth);
  const candidates = [
    { year: todayYear, month: todayMonth, day: firstDay },
    { year: todayYear, month: todayMonth, day: firstDay + 14 }
  ];

  for (const c of candidates) {
    const cNum = c.year * 10000 + c.month * 100 + c.day;
    if (todayNum <= cNum) return toInputValue(c.year, c.month, c.day);
  }

  // Both event Mondays this month have passed — use 1st Monday of next month
  const nextMonth = todayMonth === 12 ? 1 : todayMonth + 1;
  const nextYear = todayMonth === 12 ? todayYear + 1 : todayYear;
  const nextFirstDay = getFirstMondayDay(nextYear, nextMonth);
  return toInputValue(nextYear, nextMonth, nextFirstDay);
};

// Returns a "YYYY-MM-DD" string for the given date in Pacific time
const getPacificDateString = (date = new Date()) => {
  const parts = extractPacificParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const formatEventDateLabel = (dateValue) => {
  if (!dateValue) {
    return "Upcoming Monday";
  }

  const eventDate = new Date(dateValue);
  const eventDateString = getPacificDateString(eventDate);
  const todayString = getPacificDateString();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = getPacificDateString(tomorrow);

  if (eventDateString === todayString) return "Today";
  if (eventDateString === tomorrowString) return "Tomorrow";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(eventDate);
};
