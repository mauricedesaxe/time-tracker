import { useEffect } from "react";
import TimeTracker from "./components/TimeTracker";
import { initDefaultProject } from "./store/timeTrackerStore";
import "./App.css";

function App() {
  useEffect(() => {
    // Initialize with default project if none exists
    initDefaultProject();
  }, []);

  return (
    <div className="min-h-screen py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg rounded-lg sm:rounded-3xl sm:p-8 min-w-xs">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            Simple Time Tracker
          </h1>
          <TimeTracker />
        </div>
      </div>
    </div>
  );
}

export default App;
