import { createStore } from "tinybase";
import { createLocalPersister } from "tinybase/persisters/persister-browser";

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
      endTime: { type: "number" },
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

export const initPersistence = async () => {
  const persister = createLocalPersister(
    timeTrackerStore,
    "time-tracker-store"
  );

  await persister.startAutoLoad();

  await persister.startAutoSave();

  return persister;
};
