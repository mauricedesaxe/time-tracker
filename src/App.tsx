import { useEffect } from "react";
import { StoreProvider } from "./store/StoreContext";
import { timeTrackerStore, initPersistence } from "./store/timeTrackerStore";
import TimeTracker from "./components/TimeTracker";
import "./App.css";

function App() {
  useEffect(() => {
    // Initialize persistence
    initPersistence();

    // Add default project if none exists
    if (Object.keys(timeTrackerStore.getTable("projects")).length === 0) {
      timeTrackerStore.setRow("projects", "p1", {
        id: "p1",
        name: "Default Project",
        color: "#3b82f6", // blue-500
      });
    }
  }, []);

  return (
    <StoreProvider store={timeTrackerStore}>
      <div className="min-h-screen py-6 flex flex-col justify-center sm:py-12">
        <div className="relative py-3 sm:max-w-xl sm:mx-auto">
          <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">
              Simple Time Tracker
            </h1>
            <TimeTracker />
          </div>
        </div>
      </div>
    </StoreProvider>
  );
}

export default App;
