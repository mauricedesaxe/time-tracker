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

  // Get all time entries, sorted by start time (most recent first)
  const timeEntries = useRows(store, "timeEntries", undefined, {
    sortKey: "startTime",
    sortDirection: "desc",
  }) as unknown as TimeEntry[];

  // Create a new time entry
  const createTimeEntry = useCreateRow(store, "timeEntries");

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

  // Start a new timer
  const startTimer = () => {
    if (description.trim() === "") return;

    const id = `te_${Date.now()}`;
    createTimeEntry(id, {
      id,
      description,
      startTime: Date.now(),
      projectId: "p1", // Use default project for now
    });

    setCurrentEntry(id);
  };

  // Stop the current timer
  const stopTimer = () => {
    if (!currentEntry) return;

    store.setRow("timeEntries", currentEntry, {
      ...store.getRow("timeEntries", currentEntry),
      endTime: Date.now(),
    });

    setCurrentEntry(null);
    setDescription("");
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
        />

        <div className="flex items-center space-x-4">
          {!currentEntry ? (
            <button
              onClick={startTimer}
              disabled={description.trim() === ""}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
            >
              Start Timer
            </button>
          ) : (
            <button
              onClick={stopTimer}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
              Stop Timer
            </button>
          )}

          {currentEntry && (
            <div className="text-lg font-mono">
              {formatTime(
                Date.now() -
                  (store.getCell(
                    "timeEntries",
                    currentEntry,
                    "startTime"
                  ) as number)
              )}
            </div>
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

              return (
                <div key={id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex justify-between">
                    <h3 className="font-medium">{description}</h3>
                    <div className="flex items-center">
                      {isRunning ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Running
                        </span>
                      ) : (
                        <span className="text-gray-500">
                          {formatTime(getDuration(startTime, endTime))}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    Started: {formatDate(startTime)}
                    {endTime && ` • Ended: ${formatDate(endTime)}`}
                  </div>
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
