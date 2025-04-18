import { useEffect } from "react";
import TimeTracker from "./components/TimeTracker";
import { initTimeTrackerState } from "./store/timeTrackerStore";
import "./App.css";

function App() {
  useEffect(() => {
    initTimeTrackerState();
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-7xl items-start gap-x-8 px-4 py-10 sm:px-6 lg:px-8">
        <main className="flex-1">
          <div className="relative px-4 py-10 bg-white shadow-lg rounded-lg sm:rounded-3xl sm:p-8 min-w-xs">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">
              Simple Time Tracker
            </h1>
            <TimeTracker />
          </div>
        </main>

        <aside className="sticky top-8 hidden w-96 shrink-0 xl:block">
          {/* Right column area */}
        </aside>
      </div>
    </div>
  );
}

export default App;
