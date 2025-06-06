import { useEffect } from "react";
import TimeTracker from "./components/TimeTracker";
import { initTimeTrackerState } from "./store/timeTrackerStore";
import CategoryManager from "./components/CategoryManager";
import AnalyticsCharts from "./components/AnalyticsCharts";

function App() {
  useEffect(() => {
    initTimeTrackerState();
  }, []);

  return (
    <div className="flex min-h-full flex-col dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <div className="mx-auto flex w-full max-w-7xl items-start gap-x-8 px-4 py-10 sm:px-6 lg:px-8">
        <main className="flex-1">
          <div className="relative px-4 py-10 bg-white dark:bg-gray-800 shadow-lg rounded-lg sm:rounded-3xl sm:p-8 min-w-xs">
            <h1 className="sr-only">Simple Time Tracker</h1>
            <TimeTracker />
            <CategoryManager />
          </div>
        </main>

        <aside className="sticky top-8 hidden w-96 shrink-0 xl:block">
          <AnalyticsCharts />
        </aside>
      </div>

      <a
        href="https://alexlazar.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 text-xs bg-gray-800 dark:bg-gray-700 text-white px-2 py-1 rounded-full shadow-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200 opacity-70 hover:opacity-100"
      >
        built by Alex
      </a>
    </div>
  );
}

export default App;
