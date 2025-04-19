import { useTimeTrackerStore, initTimeTrackerState } from "../timeTrackerStore";
import { TimeEntry } from "../timeTrackerStore";

// Clear store between tests
beforeEach(() => {
  useTimeTrackerStore.setState({
    timeEntries: {},
    projects: {},
    categories: {},
  });
});

describe("Time Tracker Store", () => {
  // Initialization
  test("initializes with default project and categories", () => {
    initTimeTrackerState();

    const { getProjects, getCategories } = useTimeTrackerStore.getState();

    expect(getProjects()).toHaveLength(1);
    expect(getProjects()[0].name).toBe("Default Project");

    expect(getCategories()).toHaveLength(2);
    expect(getCategories().map((c) => c.name)).toContain("Work");
    expect(getCategories().map((c) => c.name)).toContain("Personal");
  });

  // Time entries
  test("adds and retrieves time entries", () => {
    const { addTimeEntry, getTimeEntries, getTimeEntry } =
      useTimeTrackerStore.getState();

    const entry = {
      id: "test1",
      description: "Test entry",
      startTime: Date.now(),
      categoryId: "c1",
    };

    addTimeEntry(entry);

    expect(getTimeEntries()).toHaveLength(1);
    expect(getTimeEntry("test1")).toEqual(entry);
  });

  test("updates time entries", () => {
    const { addTimeEntry, updateTimeEntry, getTimeEntry } =
      useTimeTrackerStore.getState();

    const entry = {
      id: "test1",
      description: "Original",
      startTime: 1000,
    };

    addTimeEntry(entry);
    updateTimeEntry("test1", { description: "Updated", endTime: 2000 });

    const updated = getTimeEntry("test1");
    expect(updated?.description).toBe("Updated");
    expect(updated?.endTime).toBe(2000);
    expect(updated?.startTime).toBe(1000); // Unchanged value
  });

  test("deletes time entries", () => {
    const { addTimeEntry, deleteTimeEntry, getTimeEntries } =
      useTimeTrackerStore.getState();

    addTimeEntry({ id: "test1", description: "Test 1", startTime: 1000 });
    addTimeEntry({ id: "test2", description: "Test 2", startTime: 2000 });

    expect(getTimeEntries()).toHaveLength(2);

    deleteTimeEntry("test1");
    expect(getTimeEntries()).toHaveLength(1);
    expect(getTimeEntries()[0].id).toBe("test2");
  });

  test("sorts time entries", () => {
    const { addTimeEntry, getTimeEntriesSorted } =
      useTimeTrackerStore.getState();

    addTimeEntry({ id: "test1", description: "Older", startTime: 1000 });
    addTimeEntry({ id: "test2", description: "Newer", startTime: 2000 });

    const ascendingOrder = getTimeEntriesSorted("startTime", false);
    expect(ascendingOrder[0].id).toBe("test1");
    expect(ascendingOrder[1].id).toBe("test2");

    const descendingOrder = getTimeEntriesSorted("startTime", true);
    expect(descendingOrder[0].id).toBe("test2");
    expect(descendingOrder[1].id).toBe("test1");
  });

  // Categories
  test("adds and retrieves categories", () => {
    const { addCategory, getCategories, getCategory } =
      useTimeTrackerStore.getState();

    const category = {
      id: "cat1",
      name: "Test Category",
      color: "#ff0000",
    };

    addCategory(category);

    expect(getCategories()).toHaveLength(1);
    expect(getCategory("cat1")).toEqual(category);
  });

  test("updates categories", () => {
    const { addCategory, updateCategory, getCategory } =
      useTimeTrackerStore.getState();

    addCategory({
      id: "cat1",
      name: "Original",
      color: "#000000",
    });

    updateCategory("cat1", { name: "Updated", color: "#ffffff" });

    const updated = getCategory("cat1");
    expect(updated?.name).toBe("Updated");
    expect(updated?.color).toBe("#ffffff");
  });

  test("deletes categories", () => {
    const { addCategory, deleteCategory, getCategories } =
      useTimeTrackerStore.getState();

    addCategory({ id: "cat1", name: "Category 1", color: "#ff0000" });
    addCategory({ id: "cat2", name: "Category 2", color: "#00ff00" });

    expect(getCategories()).toHaveLength(2);

    deleteCategory("cat1");
    expect(getCategories()).toHaveLength(1);
    expect(getCategories()[0].id).toBe("cat2");
  });

  // Special "running" category
  test("handles special 'running' category", () => {
    const { getCategory } = useTimeTrackerStore.getState();

    const runningCategory = getCategory("running");
    expect(runningCategory).toBeDefined();
    expect(runningCategory?.name).toBe("Tracker is running");
  });

  // Export functionality
  test("exports time entries to JSON", () => {
    const { addTimeEntry, addCategory, exportTimeEntries } =
      useTimeTrackerStore.getState();

    addCategory({
      id: "cat1",
      name: "Test Category",
      color: "#ff0000",
    });

    addTimeEntry({
      id: "entry1",
      description: "Test Entry",
      startTime: 1000,
      endTime: 2000,
      categoryId: "cat1",
    });

    const jsonExport = exportTimeEntries("json");
    const parsed = JSON.parse(jsonExport);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].description).toBe("Test Entry");
    expect(parsed[0].category).toBe("Test Category");
  });

  test("exports time entries to CSV", () => {
    const { addTimeEntry, addCategory, exportTimeEntries } =
      useTimeTrackerStore.getState();

    addCategory({
      id: "cat1",
      name: "Test Category",
      color: "#ff0000",
    });

    const startTime = new Date("2023-01-01T10:00:00Z").getTime();
    const endTime = new Date("2023-01-01T11:30:00Z").getTime();

    addTimeEntry({
      id: "entry1",
      description: "Test Entry",
      startTime,
      endTime,
      categoryId: "cat1",
    });

    const csvExport = exportTimeEntries("csv");

    expect(csvExport).toContain(
      "Date,Start Time,End Time,Category,Description"
    );
    expect(csvExport).toContain("2023-01-01");
    expect(csvExport).toContain("Test Category");
    expect(csvExport).toContain("Test Entry");
  });

  // Prune functionality
  test("prunes all time entries", () => {
    const { addTimeEntry, pruneAllTimeEntries, getTimeEntries } =
      useTimeTrackerStore.getState();

    addTimeEntry({ id: "test1", description: "Test 1", startTime: 1000 });
    addTimeEntry({ id: "test2", description: "Test 2", startTime: 2000 });

    expect(getTimeEntries()).toHaveLength(2);

    pruneAllTimeEntries();
    expect(getTimeEntries()).toHaveLength(0);
  });

  test("prunes old time entries", () => {
    const { addTimeEntry, pruneOldTimeEntries, getTimeEntries } =
      useTimeTrackerStore.getState();

    // Entry from 100 days ago
    const oldTime = Date.now() - 100 * 24 * 60 * 60 * 1000;
    addTimeEntry({ id: "old", description: "Old entry", startTime: oldTime });

    // Recent entry (1 day ago)
    const recentTime = Date.now() - 1 * 24 * 60 * 60 * 1000;
    addTimeEntry({
      id: "recent",
      description: "Recent entry",
      startTime: recentTime,
    });

    expect(getTimeEntries()).toHaveLength(2);

    // Prune entries older than 30 days
    pruneOldTimeEntries(30);

    const remainingEntries = getTimeEntries();
    expect(remainingEntries).toHaveLength(1);
    expect(remainingEntries[0].id).toBe("recent");
  });

  // FUZZ TESTS
  describe("Fuzz Tests", () => {
    // Helper function to generate random time entries
    function generateRandomTimeEntry(id: string) {
      const startTime =
        Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000);
      const duration = Math.floor(Math.random() * 8 * 60 * 60 * 1000); // Random duration up to 8 hours

      return {
        id,
        description: `Random entry ${id}`,
        startTime,
        endTime: Math.random() > 0.2 ? startTime + duration : undefined, // 20% chance to be running
        categoryId: Math.random() > 0.5 ? "c1" : "c2",
      };
    }

    test("handles bulk operations with many random entries", () => {
      const {
        addTimeEntry,
        getTimeEntries,
        getTimeEntriesSorted,
        pruneOldTimeEntries,
      } = useTimeTrackerStore.getState();

      // Add default categories
      initTimeTrackerState();

      // Add 100 random time entries, but ensure they're all older than 3 days
      const entryCount = 100;
      for (let i = 0; i < entryCount; i++) {
        const entry = generateRandomTimeEntry(`fuzz_${i}`);
        // Force all entries to be at least 3 days old
        entry.startTime = Date.now() - (3 * 24 * 60 * 60 * 1000 + i * 1000);
        addTimeEntry(entry);
      }

      const allEntries = getTimeEntries();
      expect(allEntries.length).toBe(entryCount);

      // Test sorting
      const sortedAsc = getTimeEntriesSorted("startTime", false);
      expect(sortedAsc.length).toBe(entryCount);
      for (let i = 1; i < sortedAsc.length; i++) {
        expect(sortedAsc[i].startTime).toBeGreaterThanOrEqual(
          sortedAsc[i - 1].startTime
        );
      }

      const sortedDesc = getTimeEntriesSorted("startTime", true);
      expect(sortedDesc.length).toBe(entryCount);
      for (let i = 1; i < sortedDesc.length; i++) {
        expect(sortedDesc[i].startTime).toBeLessThanOrEqual(
          sortedDesc[i - 1].startTime
        );
      }

      // Test pruning
      const veryRecentTime = Date.now() - 1 * 24 * 60 * 60 * 1000; // 1 day ago
      addTimeEntry({
        id: "recent_entry",
        description: "Very recent entry",
        startTime: veryRecentTime,
        categoryId: "c1",
      });

      // Prune entries older than 2 days
      pruneOldTimeEntries(2);

      const remainingEntries = getTimeEntries();
      // Should only have the very recent entry left
      expect(remainingEntries.length).toBe(1);
      expect(remainingEntries[0].id).toBe("recent_entry");
    });

    test("handles fuzzy descriptions with special characters", () => {
      const { addTimeEntry, getTimeEntry, exportTimeEntries } =
        useTimeTrackerStore.getState();

      // Add entry with special characters
      const specialChars = [
        "Test with \n newlines",
        'Test with "quotes"',
        "Test with ,commas,",
        "Test with <html> tags",
        "Test with emoji 😀 🚀",
        "Test with Unicode characters Ñáéíóú",
        "Test with SQL injection'; DROP TABLE users;--",
      ];

      // Add each special character entry
      specialChars.forEach((desc, index) => {
        addTimeEntry({
          id: `special_${index}`,
          description: desc,
          startTime: Date.now(),
          endTime: Date.now() + 3600000,
        });

        // Verify retrieval works
        const entry = getTimeEntry(`special_${index}`);
        expect(entry?.description).toBe(desc);
      });

      // Test export with special characters
      const jsonExport = exportTimeEntries("json");
      const parsed = JSON.parse(jsonExport);

      // Verify all descriptions are in the export
      specialChars.forEach((desc) => {
        const found = parsed.some(
          (entry: TimeEntry) => entry.description === desc
        );
        expect(found).toBe(true);
      });

      // Check CSV export (which is more prone to formatting issues)
      const csvExport = exportTimeEntries("csv");

      // CSV should properly escape quotes by doubling them
      expect(csvExport).toContain('Test with ""quotes""');
    });

    test("maintains data integrity with rapid sequential operations", () => {
      const {
        addTimeEntry,
        updateTimeEntry,
        deleteTimeEntry,

        getTimeEntry,
      } = useTimeTrackerStore.getState();

      // Create and immediately update the same entry multiple times
      for (let i = 0; i < 50; i++) {
        const id = `rapid_${i}`;

        // Add
        addTimeEntry({
          id,
          description: "Initial",
          startTime: Date.now(),
        });

        // Update several times in succession
        updateTimeEntry(id, { description: "Update 1" });
        updateTimeEntry(id, { description: "Update 2" });
        updateTimeEntry(id, { description: "Update 3" });
        updateTimeEntry(id, { categoryId: "c1" });
        updateTimeEntry(id, { endTime: Date.now() + 1000 });

        // Final state should reflect all updates
        const entry = getTimeEntry(id);
        expect(entry?.description).toBe("Update 3");
        expect(entry?.categoryId).toBe("c1");
        expect(entry?.endTime).toBeDefined();
      }

      // Test rapid add/delete cycles
      for (let i = 0; i < 50; i++) {
        const id = `temp_${i}`;

        addTimeEntry({
          id,
          description: "Temporary entry",
          startTime: Date.now(),
        });

        // Verify it exists
        expect(getTimeEntry(id)).toBeDefined();

        // Delete it
        deleteTimeEntry(id);

        // Verify it's gone
        expect(getTimeEntry(id)).toBeUndefined();
      }
    });
  });
});
