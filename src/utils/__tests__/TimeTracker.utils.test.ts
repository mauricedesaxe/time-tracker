import {
  validateSingleRunningEntry,
  formatDuration,
} from "../TimeTrackerUtils";

// Extract formatDuration and validateSingleRunningEntry from the component file into their own utility file

describe("Time Tracker Utility Functions", () => {
  describe("validateSingleRunningEntry", () => {
    test("doesn't throw with no running entries", () => {
      const entries = [
        { id: "1", description: "Test", startTime: 1000, endTime: 2000 },
        { id: "2", description: "Test", startTime: 3000, endTime: 4000 },
      ];

      expect(() => validateSingleRunningEntry(entries)).not.toThrow();
    });

    test("doesn't throw with one running entry", () => {
      const entries = [
        { id: "1", description: "Test", startTime: 1000, endTime: 2000 },
        { id: "2", description: "Test", startTime: 3000 },
      ];

      expect(() => validateSingleRunningEntry(entries)).not.toThrow();
    });

    test("throws with multiple running entries", () => {
      const entries = [
        { id: "1", description: "Test", startTime: 1000 },
        { id: "2", description: "Test", startTime: 3000 },
      ];

      expect(() => validateSingleRunningEntry(entries)).toThrow(
        "Invariant violation"
      );
    });
  });

  describe("formatDuration", () => {
    test("formats zero duration", () => {
      expect(formatDuration(0)).toBe("0 seconds");
      expect(formatDuration(0, { short: true })).toBe("0s");
    });

    test("handles edge cases", () => {
      expect(formatDuration(NaN)).toBe("Invalid duration");
      expect(formatDuration(Infinity)).toBe("Invalid duration");
    });

    test("formats short durations", () => {
      expect(formatDuration(500)).toBe("less than 1 second");
      expect(formatDuration(500, { short: true })).toBe("< 1s");
    });

    test("formats seconds", () => {
      expect(formatDuration(1000)).toBe("1 second");
      expect(formatDuration(5000)).toBe("5 seconds");
    });

    test("formats minutes and seconds", () => {
      const oneMinute = 60 * 1000;
      expect(formatDuration(oneMinute)).toBe("1 minute");
      expect(formatDuration(oneMinute + 30000)).toBe("1 minute, 30 seconds");
    });

    test("formats hours, minutes, and seconds", () => {
      const oneHour = 60 * 60 * 1000;
      expect(formatDuration(oneHour)).toBe("1 hour");
      expect(formatDuration(oneHour + 5 * 60 * 1000 + 30 * 1000)).toBe(
        "1 hour, 5 minutes"
      );
    });

    test("respects maxUnits option", () => {
      const duration =
        1 * 24 * 60 * 60 * 1000 + // 1 day
        5 * 60 * 60 * 1000 + // 5 hours
        30 * 60 * 1000 + // 30 minutes
        45 * 1000; // 45 seconds

      expect(formatDuration(duration, { maxUnits: 1 })).toBe("1 day");
      expect(formatDuration(duration, { maxUnits: 2 })).toBe("1 day, 5 hours");
      expect(formatDuration(duration, { maxUnits: 3 })).toBe(
        "1 day, 5 hours, 30 minutes"
      );
      expect(formatDuration(duration, { maxUnits: 4 })).toBe(
        "1 day, 5 hours, 30 minutes, 45 seconds"
      );
    });

    test("handles short format", () => {
      const duration =
        1 * 24 * 60 * 60 * 1000 + // 1 day
        5 * 60 * 60 * 1000 + // 5 hours
        30 * 60 * 1000; // 30 minutes

      expect(formatDuration(duration, { short: true })).toBe("1d 5h");
      expect(formatDuration(duration, { short: true, maxUnits: 3 })).toBe(
        "1d 5h 30m"
      );
    });

    test("handles rounding option", () => {
      const duration =
        1 * 24 * 60 * 60 * 1000 + // 1 day
        5 * 60 * 60 * 1000 + // 5 hours
        30 * 60 * 1000; // 30 minutes

      expect(formatDuration(duration, { round: true })).toBe("1 day");

      const justHours = 5 * 60 * 60 * 1000 + 30 * 60 * 1000;
      expect(formatDuration(justHours, { round: true })).toBe("6 hours");

      const justMinutes = 55 * 60 * 1000;
      expect(formatDuration(justMinutes, { round: true })).toBe("55 minutes");
    });
  });
});
