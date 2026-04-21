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

export const formatEventDateLabel = (dateValue) => {
  if (!dateValue) {
    return "Upcoming Monday";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(dateValue));
};
