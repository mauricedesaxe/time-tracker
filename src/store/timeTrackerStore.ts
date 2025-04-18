import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TimeEntry {
  id: string;
  description: string;
  startTime: number;
  endTime?: number;
  projectId?: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

interface TimeTrackerState {
  timeEntries: Record<string, TimeEntry>;
  projects: Record<string, Project>;

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
}

export const useTimeTrackerStore = create<TimeTrackerState>()(
  persist(
    (set, get) => ({
      timeEntries: {},
      projects: {},

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
    }),
    {
      name: "time-tracker-store",
    }
  )
);

// Initialize with default project if needed
export const initDefaultProject = () => {
  const { projects, addProject } = useTimeTrackerStore.getState();

  if (Object.keys(projects).length === 0) {
    addProject({
      id: "p1",
      name: "Default Project",
      color: "#3b82f6",
    });
  }
};
