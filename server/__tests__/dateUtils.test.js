import { describe, expect, it } from "vitest";

import {
  getEventMondaysOfMonth,
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

  describe("getEventMondaysOfMonth", () => {
    it("returns the 1st and 3rd Monday of May 2026", () => {
      // May 2026: May 1 is a Friday → 1st Monday is May 4, 3rd Monday is May 18
      const result = getEventMondaysOfMonth(2026, 5);

      expect(result[0]).toEqual({ year: 2026, month: 5, day: 4 });
      expect(result[1]).toEqual({ year: 2026, month: 5, day: 18 });
    });

    it("returns the 1st and 3rd Monday of June 2026", () => {
      // June 2026: June 1 is a Monday → 1st Monday is June 1, 3rd Monday is June 15
      const result = getEventMondaysOfMonth(2026, 6);

      expect(result[0]).toEqual({ year: 2026, month: 6, day: 1 });
      expect(result[1]).toEqual({ year: 2026, month: 6, day: 15 });
    });

    it("returns the 1st and 3rd Monday of January 2026", () => {
      // Jan 2026: Jan 1 is a Thursday → 1st Monday is Jan 5, 3rd Monday is Jan 19
      const result = getEventMondaysOfMonth(2026, 1);

      expect(result[0]).toEqual({ year: 2026, month: 1, day: 5 });
      expect(result[1]).toEqual({ year: 2026, month: 1, day: 19 });
    });
  });

  describe("getNextMonday (1st/3rd Monday selection)", () => {
    it("returns the 1st Monday when today is before it", () => {
      // May 1, 2026 (Friday) — 1st Monday is May 4
      const referenceDate = new Date("2026-05-01T18:00:00.000Z");
      const result = getNextMonday(referenceDate);

      expect(result.toISOString()).toBe("2026-05-04T07:00:00.000Z");
    });

    it("returns the 1st Monday when today is the 1st Monday", () => {
      // June 1, 2026 is a Monday — should return June 1
      const referenceDate = new Date("2026-06-01T18:00:00.000Z");
      const result = getNextMonday(referenceDate);

      expect(isMonday(result)).toBe(true);
      expect(result.toISOString()).toBe("2026-06-01T07:00:00.000Z");
    });

    it("returns the 3rd Monday when today is between 1st and 3rd Monday", () => {
      // May 10, 2026 (Sunday) — 1st Monday was May 4, 3rd is May 18
      const referenceDate = new Date("2026-05-10T18:00:00.000Z");
      const result = getNextMonday(referenceDate);

      expect(result.toISOString()).toBe("2026-05-18T07:00:00.000Z");
    });

    it("returns the 3rd Monday when today is the 3rd Monday", () => {
      // May 18, 2026 (Monday) — should return May 18
      const referenceDate = new Date("2026-05-18T18:00:00.000Z");
      const result = getNextMonday(referenceDate);

      expect(result.toISOString()).toBe("2026-05-18T07:00:00.000Z");
    });

    it("returns the 1st Monday of next month when both event Mondays have passed", () => {
      // May 20, 2026 (Wednesday) — both May 4 and May 18 have passed → June 1
      const referenceDate = new Date("2026-05-20T18:00:00.000Z");
      const result = getNextMonday(referenceDate);

      expect(result.toISOString()).toBe("2026-06-01T07:00:00.000Z");
    });

    it("rolls over to January of the next year when in late December", () => {
      // Dec 25, 2026 — 3rd Monday of Dec is Dec 21 → rolls to Jan 2027
      // Jan 2027: Jan 1 is a Friday → 1st Monday is Jan 4
      const referenceDate = new Date("2026-12-25T18:00:00.000Z");
      const result = getNextMonday(referenceDate);

      expect(result.toISOString()).toBe("2027-01-04T08:00:00.000Z");
    });
  });
});
