import { useState, useEffect } from "react";
import { useStore } from "../store/StoreContext";
import { TimeEntry } from "../store/timeTrackerStore";
import { useRows, useCreateRow } from "../hooks/useStore";

// Format time in HH:MM:SS
const formatTime = (time: number): string => {
  const seconds = Math.floor((time / 1000) % 60);
  const minutes = Math.floor((time / (1000 * 60)) % 60);
  const hours = Math.floor((time / (1000 * 60 * 60)) % 24);

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
};

// Format date in readable format
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

// Calculate duration in milliseconds
const getDuration = (start: number, end: number): number => {
  return end - start;
};

const TimeTracker = () => {
  const store = useStore();
  const [description, setDescription] = useState("");
  const [currentEntry, setCurrentEntry] = useState<string | null>(null);
  const [timeDisplay, setTimeDisplay] = useState("");
  const [timerInterval, setTimerInterval] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");

  // Get all time entries, sorted by start time (most recent first)
  const timeEntries = useRows(store, "timeEntries", undefined, {
    sortKey: "startTime",
    sortDirection: "desc",
  }) as unknown as TimeEntry[];

  // Create a new time entry
  const createTimeEntry = useCreateRow(store, "timeEntries");

  // Check for running entries when component mounts
  useEffect(() => {
    const runningEntry = timeEntries.find((entry) => !entry.endTime);
    if (runningEntry && !currentEntry) {
      setCurrentEntry(runningEntry.id);
      setDescription(runningEntry.description);
      startTimerInterval(runningEntry.startTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeEntries]);

  // Update description when current entry changes
  useEffect(() => {
    if (currentEntry) {
      const entry = store.getRow(
        "timeEntries",
        currentEntry
      ) as unknown as TimeEntry;
      setDescription(entry.description);
    }
  }, [currentEntry, store]);

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
      setTimeDisplay(formatTime(elapsed));
    }, 1000);

    // Set initial display immediately
    setTimeDisplay(formatTime(Date.now() - startTime));

    // Store interval ID for cleanup
    setTimerInterval(interval);
  };

  // Start a new timer
  const startTimer = () => {
    const id = `te_${Date.now()}`;
    const startTime = Date.now();

    createTimeEntry(id, {
      id,
      description,
      startTime,
      projectId: "p1", // Use default project for now
    });

    setCurrentEntry(id);
    startTimerInterval(startTime);
  };

  // Stop the current timer
  const stopTimer = () => {
    if (!currentEntry) return;

    // Clear timer interval
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }

    // Update entry with end time
    store.setRow("timeEntries", currentEntry, {
      ...store.getRow("timeEntries", currentEntry),
      endTime: Date.now(),
    });

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

    const entry = store.getRow("timeEntries", entryId) as unknown as TimeEntry;
    setCurrentEntry(entryId);
    startTimerInterval(entry.startTime);
  };

  // Update description of current entry
  const updateDescription = (newDescription: string) => {
    setDescription(newDescription);

    if (currentEntry) {
      store.setRow("timeEntries", currentEntry, {
        ...store.getRow("timeEntries", currentEntry),
        description: newDescription,
      });
    }
  };

  // Toggle entry edit mode
  const startEditingEntry = (entry: TimeEntry) => {
    setEditingEntry(entry.id);
    setEditDescription(entry.description);

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

    // Handle empty end time case properly
    const updatedEntry = {
      ...(store.getRow("timeEntries", editingEntry) as unknown as TimeEntry),
      description: editDescription,
      startTime: startTimeMs,
    };

    // Only set endTime if editEndTime has a value
    if (editEndTime) {
      const endTimeMs = new Date(editEndTime).getTime();

      // Validate times
      if (startTimeMs >= endTimeMs) {
        alert("End time must be after start time");
        return;
      }

      updatedEntry.endTime = endTimeMs;
    } else {
      // Explicitly remove endTime if the field is empty
      delete updatedEntry.endTime;
    }

    store.setRow("timeEntries", editingEntry, updatedEntry);
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
        <h2 className="text-lg font-semibold mb-4">Time Entries</h2>

        {timeEntries.length === 0 ? (
          <p className="text-gray-500">
            No time entries yet. Start your first timer!
          </p>
        ) : (
          <div className="space-y-3">
            {timeEntries.map((entry) => {
              const { id, description, startTime, endTime } = entry;
              const isRunning = !endTime;
              const isCurrentEntry = id === currentEntry;
              const isEditing = id === editingEntry;

              return (
                <div key={id} className="p-4 border rounded-lg bg-gray-50">
                  {isEditing ? (
                    // Edit form
                    <div className="space-y-3">
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description"
                      />
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
                  ) : (
                    // Normal view
                    <>
                      <div className="flex justify-between">
                        <h3 className="font-medium">{description}</h3>
                        <div className="flex items-center space-x-2">
                          {isRunning ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Running
                            </span>
                          ) : (
                            <span className="text-gray-500">
                              {formatTime(getDuration(startTime, endTime))}
                            </span>
                          )}

                          {isRunning && !isCurrentEntry && (
                            <button
                              onClick={() => resumeTimer(id)}
                              className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Resume
                            </button>
                          )}

                          {!isRunning && (
                            <button
                              onClick={() => startEditingEntry(entry)}
                              className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        Started: {formatDate(startTime)}
                        {endTime && ` • Ended: ${formatDate(endTime)}`}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeTracker;
