import { useState, useEffect } from "react";
import {
  useTimeTrackerStore,
  TimeEntry,
  initTimeTrackerState,
} from "../store/timeTrackerStore";

/**
 * Convert Unix time duration (in milliseconds) to human readable string
 * @param {number} milliseconds - Duration in milliseconds
 * @param {Object} options - Formatting options
 * @param {boolean} options.short - Use short form (e.g. "2d 5h" instead of "2 days 5 hours")
 * @param {boolean} options.round - Round to most significant unit
 * @param {number} options.maxUnits - Maximum number of units to display (default: 2)
 * @returns {string} Human readable duration string
 */
function formatDuration(
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

const TimeTracker = () => {
  // Initialize default categories and projects on first render
  useEffect(() => {
    initTimeTrackerState();
  }, []);

  const {
    getTimeEntriesSorted,
    addTimeEntry,
    updateTimeEntry,
    getTimeEntry,
    deleteTimeEntry,
    getCategories,
    getCategory,
  } = useTimeTrackerStore();

  const [description, setDescription] = useState("");
  const [currentEntry, setCurrentEntry] = useState<string | null>(null);
  const [timeDisplay, setTimeDisplay] = useState("");
  const [timerInterval, setTimerInterval] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [categoryId, setCategoryId] = useState<string>("c1"); // Default to first category
  const [editCategoryId, setEditCategoryId] = useState<string>("");

  // Get all time entries, sorted by start time (most recent first)
  const sortedEntries = getTimeEntriesSorted("startTime", true);

  // Get all categories
  const categories = getCategories();

  // Check for running entries when component mounts
  useEffect(() => {
    const runningEntry = sortedEntries.find((entry) => !entry.endTime);
    if (runningEntry && !currentEntry) {
      setCurrentEntry(runningEntry.id);
      setDescription(runningEntry.description);
      setCategoryId(runningEntry.categoryId || "c1");
      startTimerInterval(runningEntry.startTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedEntries]);

  // Update description when current entry changes
  useEffect(() => {
    if (currentEntry) {
      const entry = getTimeEntry(currentEntry);
      if (entry) {
        setDescription(entry.description);
        setCategoryId(entry.categoryId || "c1");
      }
    }
  }, [currentEntry, getTimeEntry]);

  // Clean up timer interval on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  // Start timer interval for displaying elapsed time
  const startTimerInterval = (startTime: number) => {
    // Clear any existing interval
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    // Create new interval that updates every second
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      setTimeDisplay(formatDuration(elapsed));
    }, 1000);

    // Set initial display immediately
    setTimeDisplay(formatDuration(Date.now() - startTime));

    // Store interval ID for cleanup
    setTimerInterval(interval);
  };

  // Start a new timer
  const startTimer = () => {
    const id = `te_${Date.now()}`;
    const startTime = Date.now();

    addTimeEntry({
      id,
      description,
      startTime,
      projectId: "p1", // Use default project for now
      categoryId,
    });

    setCurrentEntry(id);
    startTimerInterval(startTime);

    const descriptionInput = document.querySelector(
      'input[placeholder="What are you working on?"]'
    );
    if (descriptionInput) {
      (descriptionInput as HTMLInputElement).focus();
    }
  };

  // Stop the current timer
  const stopTimer = () => {
    if (!currentEntry) return;
    if (description.trim() === "") return;

    // Clear timer interval
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }

    // Update entry with end time
    updateTimeEntry(currentEntry, { endTime: Date.now() });

    setCurrentEntry(null);
    setDescription("");
    setTimeDisplay("");
  };

  // Resume a previously running entry
  const resumeTimer = (entryId: string) => {
    // If already tracking, stop the current one first
    if (currentEntry) {
      stopTimer();
    }

    const entry = getTimeEntry(entryId);
    if (entry) {
      setCurrentEntry(entryId);
      startTimerInterval(entry.startTime);
    }
  };

  // Update description of current entry
  const updateDescription = (newDescription: string) => {
    setDescription(newDescription);

    if (currentEntry) {
      updateTimeEntry(currentEntry, { description: newDescription });
    }
  };

  // Update category of current entry
  const updateCategory = (newCategoryId: string) => {
    setCategoryId(newCategoryId);

    if (currentEntry) {
      updateTimeEntry(currentEntry, { categoryId: newCategoryId });
    }
  };

  // Toggle entry edit mode
  const startEditingEntry = (entry: TimeEntry) => {
    setEditingEntry(entry.id);
    setEditDescription(entry.description);
    setEditCategoryId(entry.categoryId || "c1");

    // Format timestamps for datetime-local input
    const startDate = new Date(entry.startTime);
    const formattedStart = new Date(
      startDate.getTime() - startDate.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);
    setEditStartTime(formattedStart);

    if (entry.endTime) {
      const endDate = new Date(entry.endTime);
      const formattedEnd = new Date(
        endDate.getTime() - endDate.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);
      setEditEndTime(formattedEnd);
    } else {
      setEditEndTime("");
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingEntry(null);
  };

  // Save edited entry
  const saveEdit = () => {
    if (!editingEntry) return;

    const startTimeMs = new Date(editStartTime).getTime();
    const updates: Partial<TimeEntry> = {
      description: editDescription,
      startTime: startTimeMs,
      categoryId: editCategoryId,
    };

    // Only set endTime if editEndTime has a value
    if (editEndTime) {
      const endTimeMs = new Date(editEndTime).getTime();

      // Validate times
      if (startTimeMs >= endTimeMs) {
        alert("End time must be after start time");
        return;
      }

      updates.endTime = endTimeMs;
    } else {
      // We need to explicitly remove endTime
      updates.endTime = undefined;
    }

    updateTimeEntry(editingEntry, updates);
    setEditingEntry(null);
  };

  // Handle description input key press
  const handleDescriptionKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (currentEntry) {
        stopTimer();
      } else {
        startTimer();
      }
    }
  };

  // Delete an entry
  const handleDeleteEntry = (id: string) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      // If deleting the current entry, stop the timer first
      if (id === currentEntry) {
        stopTimer();
      }
      deleteTimeEntry(id);
    }
  };

  // Get category label
  const getCategoryLabel = (catId?: string) => {
    if (!catId) return null;
    const category = getCategory(catId);
    if (!category) return null;

    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
        style={{
          backgroundColor: `${category.color}20`,
          color: category.color,
        }}
      >
        {category.name}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Timer input */}
      <div className="flex flex-col space-y-4">
        <input
          type="text"
          placeholder="What are you working on?"
          className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={description}
          onChange={(e) => updateDescription(e.target.value)}
          onKeyPress={handleDescriptionKeyPress}
        />

        {/* Category selector */}
        <div className="flex space-x-2">
          <label className="text-sm text-gray-600">Category:</label>
          <select
            value={categoryId}
            onChange={(e) => updateCategory(e.target.value)}
            className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-4">
          {!currentEntry ? (
            <button
              onClick={startTimer}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
            >
              Start Timer
            </button>
          ) : (
            <button
              onClick={stopTimer}
              disabled={description.trim() === ""}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-50"
            >
              Stop Timer
            </button>
          )}

          {currentEntry && (
            <div className="text-lg font-mono">{timeDisplay}</div>
          )}
        </div>
      </div>

      {/* Time entries list */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="text-2xl flex items-center">
              <svg
                className="w-6 h-6 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="font-semibold">Tracked time</span>
            </div>
            {currentEntry && (
              <div className="text-lg font-mono">{timeDisplay}</div>
            )}
          </div>
          <div className="flex space-x-2">
            <button className="flex items-center px-3 py-1 border rounded text-blue-600 hover:bg-blue-50">
              <svg
                className="w-4 h-4 mr-1"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M19 9l-7 7-7-7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Export
            </button>
            {!currentEntry ? (
              <button
                onClick={startTimer}
                disabled={!!currentEntry}
                className="flex items-center px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Start Timer
              </button>
            ) : (
              <button
                onClick={stopTimer}
                disabled={description.trim() === ""}
                className="flex items-center px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                Stop Timer
              </button>
            )}
          </div>
        </div>

        <div className="text-sm mb-4">
          Showing tracked time in{" "}
          <a href="#" className="text-blue-500 hover:underline">
            All categories
          </a>
        </div>

        {sortedEntries.length === 0 ? (
          <p className="text-gray-500">
            No time entries yet. Start your first timer!
          </p>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-4 py-2 border-b text-gray-500 font-medium text-sm">
              <div className="col-span-2">DATE</div>
              <div className="col-span-3">TIME</div>
              <div className="col-span-7">DETAILS</div>
            </div>

            <div className="space-y-1 mt-2">
              {sortedEntries.map((entry) => {
                const { id, description, startTime, endTime, categoryId } =
                  entry;
                const isRunning = !endTime;
                const isCurrentEntry = id === currentEntry;
                const isEditing = id === editingEntry;

                // Format date as APR 18
                const date = new Date(startTime);
                const monthAbbr = date
                  .toLocaleString("en", { month: "short" })
                  .toUpperCase();
                const day = date.getDate();

                // Format time as 4:33pm - 4:39pm
                const startTimeStr = new Date(startTime).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }
                );

                const endTimeStr = endTime
                  ? new Date(endTime).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "";

                const timeDisplay = isRunning
                  ? `${startTimeStr} - running`
                  : `${startTimeStr} - ${endTimeStr}`;

                const durationMinutes = isRunning
                  ? Math.round((Date.now() - startTime) / 60000)
                  : Math.round((endTime! - startTime) / 60000);

                return isEditing ? (
                  <div key={id} className="p-4 border rounded-lg bg-gray-50">
                    {/* Edit form stays the same */}
                    <div className="space-y-3">
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description"
                      />

                      <div>
                        <label className="block text-xs mb-1">Category</label>
                        <select
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(e.target.value)}
                          className="w-full px-3 py-2 border rounded"
                        >
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs mb-1">
                            Start Time
                          </label>
                          <input
                            type="datetime-local"
                            className="w-full px-3 py-2 border rounded"
                            value={editStartTime}
                            onChange={(e) => setEditStartTime(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">End Time</label>
                          <input
                            type="datetime-local"
                            className="w-full px-3 py-2 border rounded"
                            value={editEndTime}
                            onChange={(e) => setEditEndTime(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveEdit}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    key={id}
                    className="grid grid-cols-12 gap-4 py-3 border-b hover:bg-gray-50"
                  >
                    <div className="col-span-2 text-orange-500 font-medium">
                      {monthAbbr} {day}
                    </div>
                    <div className="col-span-4 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1 text-gray-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        <path
                          d="M12 6v6l4 2"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="font-medium">{durationMinutes} min</span>
                      <span className="text-xs text-gray-500 ml-1">
                        ( {timeDisplay} )
                      </span>
                    </div>
                    <div className="col-span-5 flex items-center">
                      <div className="mr-2">{getCategoryLabel(categoryId)}</div>
                      <span className="font-medium">{description}</span>
                    </div>
                    <div className="col-span-1 flex justify-end items-center space-x-1">
                      {isRunning && !isCurrentEntry && (
                        <button
                          onClick={() => resumeTimer(id)}
                          className="p-1 text-blue-500 hover:bg-blue-100 rounded"
                          title="Resume"
                        >
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path
                              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                              fill="currentColor"
                            />
                            <path
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              strokeWidth="2"
                            />
                          </svg>
                        </button>
                      )}

                      {!isRunning && (
                        <button
                          onClick={() => startEditingEntry(entry)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteEntry(id)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TimeTracker;
