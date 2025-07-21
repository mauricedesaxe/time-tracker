import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  useTimeTrackerStore,
  TimeEntry,
  Category,
  initTimeTrackerState,
} from "../store/timeTrackerStore";
import {
  validateSingleRunningEntry,
  formatDuration,
} from "../utils/TimeTrackerUtils";

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
    getTimeEntries,
    exportTimeEntries,
    pruneAllTimeEntries,
    pruneOldTimeEntries,
  } = useTimeTrackerStore();

  const [currentEntry, setCurrentEntry] = useState<string | null>(null);
  const [timeDisplay, setTimeDisplay] = useState("");
  const [timerInterval, setTimerInterval] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editStartTime, setEditStartTime] = useState<Date | null>(null);
  const [editEndTime, setEditEndTime] = useState<Date | null>(null);
  const [categoryId, setCategoryId] = useState<string>("c1"); // Default to first category
  const [editCategoryId, setEditCategoryId] = useState<string>("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDescription, setModalDescription] = useState("");
  const [modalCategoryId, setModalCategoryId] = useState<string>("c1"); // Default to first category
  const [entryToSave, setEntryToSave] = useState<string | null>(null);

  // Export formats dropdown state
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Add new state for prune options dropdown
  const [showPruneOptions, setShowPruneOptions] = useState(false);

  // Store original title for restoration
  const [originalTitle, setOriginalTitle] = useState("");

  // Set up document title effect
  useEffect(() => {
    // Store original title on first mount
    if (!originalTitle) {
      setOriginalTitle(document.title || "Time Tracker");
    }

    // Update document title when timer is running
    if (currentEntry && timeDisplay) {
      document.title = `🔴 ${timeDisplay} - Time Tracker`;
    } else if (originalTitle) {
      // Restore original title when not tracking
      document.title = originalTitle;
    }

    // Cleanup function to restore original title when component unmounts
    return () => {
      if (originalTitle) {
        document.title = originalTitle;
      }
    };
  }, [currentEntry, timeDisplay, originalTitle]);

  // Ensure only one dropdown is open at a time
  useEffect(() => {
    if (showExportOptions && showPruneOptions) {
      setShowPruneOptions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showExportOptions]);

  useEffect(() => {
    if (showPruneOptions && showExportOptions) {
      setShowExportOptions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPruneOptions]);

  // Get all time entries, sorted by start time (most recent first)
  const sortedEntries = getTimeEntriesSorted("startTime", true);

  // Validate the invariant that only one entry can be running at a time
  useEffect(() => {
    validateSingleRunningEntry(sortedEntries);
  }, [sortedEntries]);

  // Get all categories
  const categories = getCategories().sort((a: Category, b: Category) =>
    a.name.localeCompare(b.name),
  );

  // Initialize modal category when categories are loaded
  useEffect(() => {
    if (categories.length > 0) {
      // Ensure a valid category ID is selected (prefer first category)
      if (!categories.some((cat) => cat.id === modalCategoryId)) {
        setModalCategoryId(categories[0].id);
      }
    }
  }, [categories, modalCategoryId]);

  // Effect to handle modal opening
  useEffect(() => {
    if (isModalOpen && categories.length > 0) {
      // If current modalCategoryId is not valid, set to first category
      if (!categories.some((cat) => cat.id === modalCategoryId)) {
        setModalCategoryId(categories[0].id);
      }
    }
  }, [isModalOpen, categories, modalCategoryId]);

  // Check for running entries when component mounts
  useEffect(() => {
    const runningEntry = sortedEntries.find((entry) => !entry.endTime);
    if (runningEntry && !currentEntry) {
      setCurrentEntry(runningEntry.id);
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

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle space key
      if (e.code !== "Space") return;

      // Don't trigger if in an input, textarea or modal is open
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        isModalOpen ||
        editingEntry
      ) {
        return;
      }

      // Prevent default space behavior (page scroll)
      e.preventDefault();

      // Toggle timer
      if (currentEntry) {
        stopTimer();
      } else {
        startTimer();
      }
    };

    // Add event listener
    window.addEventListener("keydown", handleKeyDown);

    // Clean up
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEntry, isModalOpen, editingEntry]);

  // Add Escape key handler for modal
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (e.key === "Escape") {
        cancelModal();
      }
    };

    window.addEventListener("keydown", handleEscapeKey);
    return () => {
      window.removeEventListener("keydown", handleEscapeKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);

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
    // Verify no running entries exist before starting a new one
    const entries = getTimeEntries();
    const runningEntries = entries.filter((entry) => !entry.endTime);
    if (runningEntries.length > 0) {
      throw new Error(
        "Cannot start a new timer while another timer is already running.",
      );
    }

    const id = `te_${Date.now()}`;
    const startTime = Date.now();

    addTimeEntry({
      id,
      description: "", // Start with empty description
      startTime,
      projectId: "p1", // Use default project for now
      categoryId, // Use currently selected category
    });

    setCurrentEntry(id);
    startTimerInterval(startTime);
  };

  // Stop the current timer and open modal
  const stopTimer = () => {
    if (!currentEntry) return;

    // Clear timer interval
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }

    // Get current entry data to pre-fill modal
    const entry = getTimeEntry(currentEntry);
    if (entry) {
      setModalDescription(entry.description || "");
      setModalCategoryId(
        entry.categoryId || (categories.length > 0 ? categories[0].id : "c1"),
      );
      setEntryToSave(currentEntry);

      // Open the modal
      setIsModalOpen(true);
    }
  };

  // Save the entry after modal confirmation
  const saveEntryFromModal = () => {
    if (!entryToSave) return;
    if (modalDescription.trim() === "") {
      alert("Please enter a description");
      return;
    }

    // Clear timer interval to prevent it from running in background
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }

    // Update entry with description, category and end time
    updateTimeEntry(entryToSave, {
      description: modalDescription,
      categoryId: modalCategoryId,
      endTime: Date.now(),
    });

    // Reset states
    setCurrentEntry(null);
    setTimeDisplay("");
    setEntryToSave(null);
    setIsModalOpen(false);
  };

  // Cancel modal without saving
  const cancelModal = () => {
    if (entryToSave && window.confirm("Do you want to keep tracking time?")) {
      // Resume tracking
      setCurrentEntry(entryToSave);
      const entry = getTimeEntry(entryToSave);
      if (entry) {
        startTimerInterval(entry.startTime);
      }
    } else if (entryToSave) {
      // Delete the entry
      deleteTimeEntry(entryToSave);
      setCurrentEntry(null);
    }

    setEntryToSave(null);
    setIsModalOpen(false);
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

  // Toggle entry edit mode
  const startEditingEntry = (entry: TimeEntry) => {
    setEditingEntry(entry.id);
    setEditDescription(entry.description);
    setEditCategoryId(entry.categoryId || "c1");

    // Convert timestamps to Date objects
    setEditStartTime(new Date(entry.startTime));
    if (entry.endTime) {
      setEditEndTime(new Date(entry.endTime));
    } else {
      setEditEndTime(null);
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingEntry(null);
  };

  // Save edited entry
  const saveEdit = () => {
    if (!editingEntry || !editStartTime) return;

    const startTimeMs = editStartTime.getTime();
    const updates: Partial<TimeEntry> = {
      description: editDescription,
      startTime: startTimeMs,
      categoryId: editCategoryId,
    };

    // Only set endTime if editEndTime has a value
    if (editEndTime) {
      const endTimeMs = editEndTime.getTime();

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

  // Delete an entry
  const handleDeleteEntry = (id: string) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      // If deleting the current entry, stop the timer first
      if (id === currentEntry) {
        if (timerInterval) {
          clearInterval(timerInterval);
          setTimerInterval(null);
        }
        setCurrentEntry(null);
      }
      deleteTimeEntry(id);
    }
  };

  // Get category label
  const getCategoryLabel = (catId?: string) => {
    if (!catId) return null;
    const category = getCategory(catId);
    if (!category) return null;

    if (catId === "running") {
      return (
        <span className="animate-pulse inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-white bg-red-600 dark:bg-red-700 space-x-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 dark:bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 dark:bg-red-300"></span>
          </span>
          <span className="font-medium">RECORDING</span>
        </span>
      );
    }

    return (
      <span
        className="inline-flex min-w-16 justify-center items-center px-2 py-0.5 rounded-full text-xs font-medium"
        style={{
          backgroundColor: `${category.color}20`,
          color: category.color,
        }}
      >
        {category.name}
      </span>
    );
  };

  // Handle exporting time entries
  const handleExport = (format: "csv" | "json") => {
    const exported = exportTimeEntries(format);
    const fileType = format === "csv" ? "text/csv" : "application/json";
    const fileName = `time-tracker-export-${new Date()
      .toISOString()
      .slice(0, 10)}.${format}`;

    // Create a Blob and download link
    const blob = new Blob([exported], { type: fileType });
    const url = URL.createObjectURL(blob);

    // Create a temporary link and trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    // Clean up
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    setShowExportOptions(false);
  };

  // Add new handler methods for pruning
  const handlePruneAll = () => {
    if (
      window.confirm(
        "Are you sure you want to delete ALL time entries? This cannot be undone.",
      )
    ) {
      // If there's a running timer, stop it first
      if (currentEntry) {
        if (timerInterval) {
          clearInterval(timerInterval);
          setTimerInterval(null);
        }
        setCurrentEntry(null);
      }

      pruneAllTimeEntries();
      setShowPruneOptions(false);
    }
  };

  const handlePruneOld = () => {
    const days = 90; // 90 days
    if (
      window.confirm(
        `Are you sure you want to delete all time entries older than ${days} days? This cannot be undone.`,
      )
    ) {
      pruneOldTimeEntries(days);
      setShowPruneOptions(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Time entries list */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="text-2xl flex items-center">
              <svg
                className="w-6 h-6 mr-2 text-gray-700 dark:text-gray-300"
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
              <div className="text-lg font-mono text-blue-600 dark:text-blue-400 truncate max-w-xs">
                Elapsed: {timeDisplay}
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            {/* Prune options */}
            <div className="relative">
              <button
                onClick={() => setShowPruneOptions(!showPruneOptions)}
                className="cursor-pointer flex items-center px-3 py-1 border dark:border-gray-600 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700"
              >
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
                Prune
              </button>

              {showPruneOptions && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={handlePruneOld}
                      className="cursor-pointer block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Older than 90 days
                    </button>
                    <button
                      onClick={handlePruneAll}
                      className="cursor-pointer block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                      All time entries
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Export options */}
            <div className="relative">
              <button
                onClick={() => setShowExportOptions(!showExportOptions)}
                className="cursor-pointer flex items-center px-3 py-1 border dark:border-gray-600 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700"
              >
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

              {showExportOptions && (
                <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={() => handleExport("csv")}
                      className="cursor-pointer block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => handleExport("json")}
                      className="cursor-pointer block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      JSON
                    </button>
                  </div>
                </div>
              )}
            </div>

            {!currentEntry ? (
              <button
                onClick={startTimer}
                disabled={!!currentEntry}
                className="whitespace-nowrap cursor-pointer flex items-center px-3 py-1 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 gap-2"
              >
                Start Timer
                <kbd className="kbd kbd-sm dark:bg-gray-800 text-gray-700 dark:text-gray-400">
                  Space
                </kbd>
              </button>
            ) : (
              <button
                onClick={stopTimer}
                className="whitespace-nowrap cursor-pointer flex items-center px-3 py-1 bg-red-500 dark:bg-red-600 text-white rounded hover:bg-red-600 dark:hover:bg-red-700 disabled:opacity-50 gap-2"
              >
                Stop Timer
                <kbd className="kbd kbd-sm dark:bg-gray-800 text-gray-700 dark:text-gray-400">
                  Space
                </kbd>
              </button>
            )}
          </div>
        </div>

        {sortedEntries.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            No time entries yet. Start your first timer!
          </p>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-4 py-2 border-b dark:border-gray-700 text-gray-500 dark:text-gray-400 font-medium text-sm">
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
                  },
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

                const durationMilliseconds = isRunning
                  ? Date.now() - startTime
                  : endTime! - startTime;
                const formattedDuration = formatDuration(durationMilliseconds, {
                  round: true,
                });

                return isEditing ? (
                  <div
                    key={id}
                    className="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    {/* Edit form */}
                    <div className="space-y-3">
                      <input
                        type="text"
                        className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description"
                      />

                      <div>
                        <label className="block text-xs mb-1 dark:text-gray-300">
                          Category
                        </label>
                        <select
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(e.target.value)}
                          className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                          <label className="block text-xs mb-1 dark:text-gray-300">
                            Start Time
                          </label>
                          <DatePicker
                            selected={editStartTime}
                            onChange={(date) => setEditStartTime(date)}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            dateFormat="MMMM d, yyyy h:mm aa"
                            className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholderText="Select start date and time"
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1 dark:text-gray-300">
                            End Time
                          </label>
                          <DatePicker
                            selected={editEndTime}
                            onChange={(date) => setEditEndTime(date)}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            dateFormat="MMMM d, yyyy h:mm aa"
                            className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholderText="Select end date and time"
                            isClearable
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={cancelEdit}
                          className="cursor-pointer px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveEdit}
                          className="cursor-pointer px-3 py-1 text-sm bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    key={id}
                    className="grid grid-cols-12 gap-4 py-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="col-span-2 text-orange-500 dark:text-orange-400 font-medium">
                      {monthAbbr} {day}
                    </div>
                    <div className="col-span-5 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400"
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
                      <span className="font-medium">{formattedDuration}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        ( {timeDisplay} )
                      </span>
                    </div>
                    <div className="col-span-4 flex items-center">
                      <div className="mr-2">
                        {getCategoryLabel(isRunning ? "running" : categoryId)}
                      </div>
                      <span className="font-medium">{description}</span>
                    </div>
                    <div className="col-span-1 flex justify-end items-center space-x-1">
                      {isRunning && !isCurrentEntry && (
                        <button
                          onClick={() => resumeTimer(id)}
                          className="cursor-pointer p-1 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
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
                          className="cursor-pointer p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
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
                        className="cursor-pointer p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
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

      {/* Modal for task description */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">
              What did you work on?
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  placeholder="What did you work on?"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <fieldset className="space-y-2 mt-1" role="radiogroup">
                  <legend className="sr-only">Select a category</legend>
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center">
                      <input
                        id={`category-${category.id}`}
                        type="radio"
                        name="modalCategory"
                        value={category.id}
                        checked={modalCategoryId === category.id}
                        onChange={() => setModalCategoryId(category.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                        aria-checked={modalCategoryId === category.id}
                      />
                      <label
                        htmlFor={`category-${category.id}`}
                        className="ml-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer w-full py-1.5 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <span
                          className="h-3 w-3 rounded-full inline-block"
                          style={{ backgroundColor: category.color }}
                          aria-hidden="true"
                        ></span>
                        {category.name}
                      </label>
                    </div>
                  ))}
                </fieldset>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={cancelModal}
                  className="cursor-pointer px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 gap-2"
                >
                  Cancel{" "}
                  <kbd className="kbd kbd-sm text-gray-700 dark:text-gray-400">
                    Esc
                  </kbd>
                </button>
                <button
                  onClick={saveEntryFromModal}
                  className="cursor-pointer px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
                  disabled={modalDescription.trim() === ""}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeTracker;
