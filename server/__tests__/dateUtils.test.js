import { describe, expect, it } from "vitest";

import {
  getMondayDate,
  getNextMonday,
  getPacificMidnightUtcDate,
  isMonday
} from "../utils/dateUtils.js";

describe("dateUtils", () => {
  it("returns the same Monday when the reference date is already Monday in Pacific time", () => {
    const referenceDate = new Date("2026-04-20T18:00:00.000Z");
    const result = getNextMonday(referenceDate);

    expect(result.toISOString()).toBe("2026-04-20T07:00:00.000Z");
    expect(isMonday(result)).toBe(true);
  });

  it("returns the upcoming Monday when the reference date is midweek", () => {
    const referenceDate = new Date("2026-04-22T18:00:00.000Z");
    const result = getMondayDate(referenceDate);

    expect(result).toEqual({
      year: 2026,
      month: 4,
      day: 27
    });
  });

  it("builds the UTC timestamp that represents Pacific midnight", () => {
    const result = getPacificMidnightUtcDate(2026, 12, 7);

    expect(result.toISOString()).toBe("2026-12-07T08:00:00.000Z");
  });
});
