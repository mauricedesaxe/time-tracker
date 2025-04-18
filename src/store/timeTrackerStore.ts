import { createStore } from "tinybase";

export interface TimeEntry {
  id: string;
  description: string;
  startTime: number;
  endTime?: number;
  projectId?: string;
}

export const createTimeTrackerStore = () => {
  const store = createStore();

  store.setTablesSchema({
    timeEntries: {
      id: { type: "string" },
      description: { type: "string" },
      startTime: { type: "number" },
      endTime: { type: "number", default: 0 },
      projectId: { type: "string", default: "" },
    },
    projects: {
      id: { type: "string" },
      name: { type: "string" },
      color: { type: "string" },
    },
  });

  store.setTable("timeEntries", {});
  store.setTable("projects", {});

  return store;
};

export const timeTrackerStore = createTimeTrackerStore();
