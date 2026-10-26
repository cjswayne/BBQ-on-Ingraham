import { describe, expect, it } from "vitest";

import {
  getMondayDate,
  getNextMonday,
  getPacificMidnightUtcDate,
  isMonday
} from "../utils/dateUtils.js";

describe("dateUtils", () => {
  it("builds the UTC timestamp that represents Pacific midnight", () => {
    const result = getPacificMidnightUtcDate(2026, 12, 7);

    expect(result.toISOString()).toBe("2026-12-07T08:00:00.000Z");
  });

  describe("getMondayDate", () => {
    it("returns the same Monday when the reference date is already Monday in Pacific time", () => {
      const referenceDate = new Date("2026-04-20T18:00:00.000Z");
      const result = getMondayDate(referenceDate);

      expect(result).toEqual({ year: 2026, month: 4, day: 20 });
    });

    it("returns the upcoming Monday when the reference date is midweek", () => {
      const referenceDate = new Date("2026-04-22T18:00:00.000Z");
      const result = getMondayDate(referenceDate);

      expect(result).toEqual({ year: 2026, month: 4, day: 27 });
    });
  });

  describe("getNextMonday (weekly)", () => {
    it("returns today when today is Monday", () => {
      // May 18, 2026 is a Monday
      const referenceDate = new Date("2026-05-18T18:00:00.000Z");
      const result = getNextMonday(referenceDate);

      expect(isMonday(result)).toBe(true);
      expect(result.toISOString()).toBe("2026-05-18T07:00:00.000Z");
    });

    it("returns the following Monday when today is midweek", () => {
      // May 20, 2026 (Wednesday) -> May 25
      const referenceDate = new Date("2026-05-20T18:00:00.000Z");
      const result = getNextMonday(referenceDate);

      expect(result.toISOString()).toBe("2026-05-25T07:00:00.000Z");
    });

    it("returns the very next Monday even if it is not the 1st or 3rd of the month", () => {
      // May 5, 2026 (Tuesday) -> May 11 (2nd Monday)
      const referenceDate = new Date("2026-05-05T18:00:00.000Z");
      const result = getNextMonday(referenceDate);

      expect(result.toISOString()).toBe("2026-05-11T07:00:00.000Z");
    });

    it("rolls over to January of the next year when in late December", () => {
      // Dec 30, 2026 (Wednesday) -> Jan 4, 2027
      const referenceDate = new Date("2026-12-30T18:00:00.000Z");
      const result = getNextMonday(referenceDate);

      expect(result.toISOString()).toBe("2027-01-04T08:00:00.000Z");
    });
  });
});
