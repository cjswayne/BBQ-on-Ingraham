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
  const weekdayIndex = WEEKDAY_INDEX[pacificParts.weekday] ?? 0;
  const daysUntilMonday = weekdayIndex === 1 ? 0 : (8 - weekdayIndex) % 7;
  const mondayDate = new Date(
    Date.UTC(
      Number(pacificParts.year),
      Number(pacificParts.month) - 1,
      Number(pacificParts.day)
    )
  );

  mondayDate.setUTCDate(mondayDate.getUTCDate() + daysUntilMonday);

  const year = mondayDate.getUTCFullYear();
  const month = String(mondayDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(mondayDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
