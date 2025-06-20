import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TimeEntry {
  id: string;
  description: string;
  startTime: number;
  endTime?: number;
  projectId?: string;
  categoryId?: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  weeklyTargetHours?: number;
}

interface TimeTrackerState {
  timeEntries: Record<string, TimeEntry>;
  projects: Record<string, Project>;
  categories: Record<string, Category>;

  // Actions
  addTimeEntry: (entry: TimeEntry) => void;
  updateTimeEntry: (id: string, entry: Partial<TimeEntry>) => void;
  deleteTimeEntry: (id: string) => void;
  getTimeEntries: () => TimeEntry[];
  getTimeEntriesSorted: (
    sortKey: keyof TimeEntry,
    desc?: boolean
  ) => TimeEntry[];
  getTimeEntry: (id: string) => TimeEntry | undefined;

  addProject: (project: Project) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  getProjects: () => Project[];

  addCategory: (category: Category) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  getCategories: () => Category[];
  getCategory: (id: string) => Category | undefined;

  exportTimeEntries: (format: "csv" | "json") => string;
  pruneAllTimeEntries: () => void;
  pruneOldTimeEntries: (olderThanDays: number) => void;
}

export const useTimeTrackerStore = create<TimeTrackerState>()(
  persist(
    (set, get) => ({
      timeEntries: {},
      projects: {},
      categories: {},

      addTimeEntry: (entry) =>
        set((state) => ({
          timeEntries: { ...state.timeEntries, [entry.id]: entry },
        })),

      updateTimeEntry: (id, entry) =>
        set((state) => ({
          timeEntries: {
            ...state.timeEntries,
            [id]: { ...state.timeEntries[id], ...entry },
          },
        })),

      deleteTimeEntry: (id) =>
        set((state) => {
          const newTimeEntries = { ...state.timeEntries };
          delete newTimeEntries[id];
          return { timeEntries: newTimeEntries };
        }),

      getTimeEntries: () => {
        const state = get();
        return Object.values(state.timeEntries);
      },

      getTimeEntriesSorted: (sortKey, desc = false) => {
        const entries = Object.values(get().timeEntries);
        return entries.sort((a, b) => {
          if (desc) {
            return (b[sortKey] as number) > (a[sortKey] as number) ? 1 : -1;
          }
          return (a[sortKey] as number) > (b[sortKey] as number) ? 1 : -1;
        });
      },

      getTimeEntry: (id) => get().timeEntries[id],

      addProject: (project) =>
        set((state) => ({
          projects: { ...state.projects, [project.id]: project },
        })),

      updateProject: (id, project) =>
        set((state) => ({
          projects: {
            ...state.projects,
            [id]: { ...state.projects[id], ...project },
          },
        })),

      getProjects: () => Object.values(get().projects),

      addCategory: (category) =>
        set((state) => ({
          categories: { ...state.categories, [category.id]: category },
        })),

      updateCategory: (id, category) =>
        set((state) => ({
          categories: {
            ...state.categories,
            [id]: { ...state.categories[id], ...category },
          },
        })),

      deleteCategory: (id) =>
        set((state) => {
          const newCategories = { ...state.categories };
          delete newCategories[id];
          return { categories: newCategories };
        }),

      getCategories: () => Object.values(get().categories),

      getCategory: (id) =>
        id === "running"
          ? { id: "running", name: "Tracker is running", color: "#000000" }
          : get().categories[id],

      exportTimeEntries: (format) => {
        const { timeEntries } = get();
        const entries = Object.values(timeEntries);

        const sortedEntries = entries.sort((a, b) => b.startTime - a.startTime);

        if (format === "json") {
          const exportData = sortedEntries.map((entry) => {
            const category = entry.categoryId
              ? get().categories[entry.categoryId]
              : null;
            return {
              ...entry,
              category: category ? category.name : null,
            };
          });

          return JSON.stringify(exportData, null, 2);
        } else {
          const header = "Date,Start Time,End Time,Category,Description\n";

          const rows = sortedEntries
            .map((entry) => {
              const startDate = new Date(entry.startTime);
              const endDate = entry.endTime ? new Date(entry.endTime) : null;

              const date = startDate.toISOString().split("T")[0];
              const startTimeStr = startDate.toISOString();
              const endTimeStr = endDate ? endDate.toISOString() : "";

              const category = entry.categoryId
                ? get().categories[entry.categoryId]
                : null;
              const categoryName = category ? category.name : "";

              const safeDescription = entry.description.replace(/"/g, '""');

              return `${date},${startTimeStr},${endTimeStr},${categoryName},"${safeDescription}"`;
            })
            .join("\n");

          return header + rows;
        }
      },

      pruneAllTimeEntries: () => set({ timeEntries: {} }),

      pruneOldTimeEntries: (olderThanDays) =>
        set((state) => {
          const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
          const newTimeEntries = { ...state.timeEntries };

          Object.entries(newTimeEntries).forEach(([id, entry]) => {
            if (entry.startTime < cutoffTime) {
              delete newTimeEntries[id];
            }
          });

          return { timeEntries: newTimeEntries };
        }),
    }),
    {
      name: "time-tracker-store",
    }
  )
);

// Initialize with default project and category if needed
export const initTimeTrackerState = () => {
  const { projects, addProject, categories, addCategory } =
    useTimeTrackerStore.getState();

  if (Object.keys(projects).length === 0) {
    addProject({
      id: "p1",
      name: "Default Project",
      color: "#3b82f6",
    });
  }

  if (Object.keys(categories).length === 0) {
    addCategory({
      id: "c1",
      name: "Work",
      color: "#10b981",
      weeklyTargetHours: 40,
    });

    addCategory({
      id: "c2",
      name: "Personal",
      color: "#8b5cf6",
      weeklyTargetHours: 10,
    });
  }
};
