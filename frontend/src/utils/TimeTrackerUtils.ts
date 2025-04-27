import { TimeEntry } from "../store/timeTrackerStore";

/**
 * Verify the invariant that only a single time entry can be running at once
 * Throws an error if multiple running entries are found
 */
export function validateSingleRunningEntry(entries: TimeEntry[]) {
  const runningEntries = entries.filter((entry) => !entry.endTime);
  if (runningEntries.length > 1) {
    throw new Error(
      `Invariant violation: Found ${runningEntries.length} running time entries. Only one entry can be running at a time.`
    );
  }
}

/**
 * Convert Unix time duration (in milliseconds) to human readable string
 * @param {number} milliseconds - Duration in milliseconds
 * @param {Object} options - Formatting options
 * @param {boolean} options.short - Use short form (e.g. "2d 5h" instead of "2 days 5 hours")
 * @param {boolean} options.round - Round to most significant unit
 * @param {number} options.maxUnits - Maximum number of units to display (default: 2)
 * @returns {string} Human readable duration string
 */
export function formatDuration(
  milliseconds: number,
  options: { short?: boolean; round?: boolean; maxUnits?: number } = {}
) {
  // Handle edge cases
  if (milliseconds === 0) return options.short ? "0s" : "0 seconds";
  if (!Number.isFinite(milliseconds) || isNaN(milliseconds))
    return "Invalid duration";

  const seconds = milliseconds / 1000;

  // Default options
  const short = options.short || false;
  const round = options.round || false;
  const maxUnits = options.maxUnits || 2;

  // Define time units in seconds
  const units = [
    { name: "year", short: "y", seconds: 31536000 },
    { name: "month", short: "mo", seconds: 2592000 },
    { name: "week", short: "w", seconds: 604800 },
    { name: "day", short: "d", seconds: 86400 },
    { name: "hour", short: "h", seconds: 3600 },
    { name: "minute", short: "m", seconds: 60 },
    { name: "second", short: "s", seconds: 1 },
  ];

  // If rounding to significant unit
  if (round) {
    for (const unit of units) {
      if (seconds >= unit.seconds) {
        const value = Math.round(seconds / unit.seconds);
        const name = value === 1 ? unit.name : unit.name + "s";
        return short ? `${value}${unit.short}` : `${value} ${name}`;
      }
    }
  }

  let remainingSeconds = Math.abs(seconds);
  const parts = [];

  // Break down seconds into different units
  for (const unit of units) {
    if (remainingSeconds >= unit.seconds) {
      const value = Math.floor(remainingSeconds / unit.seconds);
      remainingSeconds %= unit.seconds;

      if (short) {
        parts.push(`${value}${unit.short}`);
      } else {
        const name = value === 1 ? unit.name : unit.name + "s";
        parts.push(`${value} ${name}`);
      }

      // Stop if we've reached maximum number of units
      if (parts.length >= maxUnits) break;
    }
  }

  // If no parts, it's less than 1 second
  if (parts.length === 0) {
    return short ? "< 1s" : "less than 1 second";
  }

  // Join the parts with appropriate separator
  return short ? parts.join(" ") : parts.join(", ");
}
