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

export const getNextMonday = (date = new Date()) => {
  const mondayDate = getMondayDate(date);

  return getPacificMidnightUtcDate(
    mondayDate.year,
    mondayDate.month,
    mondayDate.day
  );
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
