import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTimeTrackerStore } from "../store/timeTrackerStore";
import Fuse from "fuse.js";

// Define interfaces for chart data
interface PieChartData {
  name: string;
  value: number;
  color: string;
  categoryId: string;
  hours: number;
}

interface DailyChartData {
  day: string;
  total: number;
  [categoryId: string]: string | number;
}

interface WorkTypeData {
  category: string;
  categoryId: string;
  [workType: string]: string | number;
}

// Helper functions to process data
const hoursFromMilliseconds = (ms: number) =>
  Number((ms / (1000 * 60 * 60)).toFixed(1));

const getDayOfWeek = (date: Date): string => {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
};

const formatDate = (date: Date): string => {
  return `${getDayOfWeek(date)} ${date.toLocaleDateString("en-US", {
    month: "short",
  })} ${date.getDate()}`;
};

const getWeekStart = (date: Date): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(d.setDate(diff));
  return `${monday.toLocaleDateString("en-US", {
    month: "short",
  })} ${monday.getDate()}`;
};

// Predefined work types with related terms
const WORK_TYPE_DEFINITIONS = [
  {
    id: "meeting",
    name: "Meeting",
    color: "#4E79A7",
    terms: [
      "meet",
      "call",
      "zoom",
      "conference",
      "discussion",
      "sync",
      "standup",
      "1on1",
      "chat",
      "huddle",
      "interview",
    ],
  },
  {
    id: "coding",
    name: "Coding",
    color: "#F28E2B",
    terms: [
      "code",
      "programming",
      "dev",
      "develop",
      "implementation",
      "debug",
      "fix",
      "bug",
      "feature",
      "refactor",
      "test",
    ],
  },
  {
    id: "content",
    name: "Content",
    color: "#E15759",
    terms: [
      "write",
      "blog",
      "article",
      "copy",
      "content",
      "documentation",
      "doc",
      "post",
      "draft",
      "edit",
      "proofread",
    ],
  },
  {
    id: "communication",
    name: "Communication",
    color: "#76B7B2",
    terms: [
      "email",
      "correspondence",
      "message",
      "reply",
      "slack",
      "dm",
      "chat",
      "contact",
      "respond",
    ],
  },
  {
    id: "design",
    name: "Design",
    color: "#59A14F",
    terms: [
      "design",
      "ui",
      "ux",
      "interface",
      "prototype",
      "mockup",
      "wireframe",
      "sketch",
      "figma",
    ],
  },
  {
    id: "research",
    name: "Research",
    color: "#EDC948",
    terms: [
      "research",
      "study",
      "learn",
      "explore",
      "investigate",
      "review",
      "analyze",
      "evaluate",
      "read",
    ],
  },
  {
    id: "planning",
    name: "Planning",
    color: "#B07AA1",
    terms: [
      "plan",
      "strategy",
      "roadmap",
      "backlog",
      "prioritize",
      "organize",
      "schedule",
      "outline",
    ],
  },
  {
    id: "admin",
    name: "Administration",
    color: "#FF9DA7",
    terms: [
      "admin",
      "manage",
      "organize",
      "coordinate",
      "setup",
      "configure",
      "maintenance",
    ],
  },
];

// Create a collection of all terms for fuzzy matching
const allTerms = WORK_TYPE_DEFINITIONS.flatMap((type) =>
  type.terms.map((term) => ({ term, typeId: type.id }))
);

// Initialize Fuse instance
const fuseOptions = {
  includeScore: true,
  threshold: 0.4,
  keys: ["term"],
};
const fuse = new Fuse(allTerms, fuseOptions);

// Generate a pleasant color based on string input
const stringToColor = (str: string) => {
  // Pleasant color palette with good contrast
  const colors = [
    "#4E79A7",
    "#F28E2B",
    "#E15759",
    "#76B7B2",
    "#59A14F",
    "#EDC948",
    "#B07AA1",
    "#FF9DA7",
    "#9C755F",
    "#BAB0AC",
    "#4dc9f6",
    "#f67019",
    "#f53794",
    "#537bc4",
    "#acc236",
    "#166a8f",
    "#00a950",
    "#58595b",
    "#8549ba",
  ];

  // Convert string to a number for selecting a color
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Use the hash to select a color from the palette
  return colors[Math.abs(hash) % colors.length];
};

// Extract work type from description
const getWorkTypeFromDescription = (description: string): string => {
  if (!description || !description.trim()) return "unspecified";

  const lowerDesc = description.toLowerCase();

  // First try direct matches with common work type keywords
  for (const type of WORK_TYPE_DEFINITIONS) {
    // Check for exact matches (faster than fuzzy search)
    if (type.terms.some((term) => lowerDesc.includes(term))) {
      return type.id;
    }
  }

  // If no direct match, try fuzzy matching with Fuse.js
  // Extract important words from description (3+ chars)
  const words = lowerDesc.split(/\s+/).filter((word) => word.length > 2);

  if (words.length === 0) return "other";

  // Try to find the best match for each significant word
  const matches = words
    .map((word) => ({
      word,
      matches: fuse.search(word),
    }))
    .filter((result) => result.matches.length > 0);

  if (matches.length === 0) {
    // If no fuzzy matches found, use the first meaningful word as the type
    return words[0].toLowerCase();
  }

  // Find the best match (lowest score = best match)
  const bestMatch = matches
    .flatMap((result) => result.matches)
    .sort((a, b) => (a.score || 1) - (b.score || 1))[0];

  return bestMatch.item.typeId;
};

// Generate a pleasant color based on work type
const getWorkTypeColor = (workTypeId: string): string => {
  // Find predefined color if it exists
  const workType = WORK_TYPE_DEFINITIONS.find((type) => type.id === workTypeId);
  if (workType && workType.color) return workType.color;

  // Otherwise generate a color
  return stringToColor(workTypeId);
};

const AnalyticsCharts = () => {
  const { getTimeEntriesSorted, getCategories, getCategory } =
    useTimeTrackerStore();

  // Memoize these values to prevent re-renders
  const entries = useMemo(
    () =>
      getTimeEntriesSorted("startTime", true).filter(
        (entry) => !!entry.endTime
      ),
    [getTimeEntriesSorted]
  );

  const categories = useMemo(() => getCategories(), [getCategories]);

  // Memoize the getCategory function to maintain stable reference
  const stableGetCategory = useCallback(getCategory, [getCategory]);

  // State for chart data
  const [currentWeekData, setCurrentWeekData] = useState<PieChartData[]>([]);
  const [dailyData, setDailyData] = useState<DailyChartData[]>([]);
  const [workTypeData, setWorkTypeData] = useState<WorkTypeData[]>([]);
  const [workTypes, setWorkTypes] = useState<
    { id: string; name: string; color: string }[]
  >([]);
  const [totalHours, setTotalHours] = useState<number>(0);

  // Process data for charts when entries change
  useEffect(() => {
    if (entries.length === 0) return;

    // Get completed entries (with endTime)
    const completedEntries = entries.filter((entry) => entry.endTime);

    // Get current date and start of current week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start from Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    // Get entries from current week
    const currentWeekEntries = completedEntries.filter(
      (entry) => new Date(entry.startTime) >= startOfWeek
    );

    // Calculate total hours for current week
    let weekTotal = 0;
    const categoryHours: Record<string, number> = {};

    // Process current week data for pie chart
    currentWeekEntries.forEach((entry) => {
      if (!entry.endTime) return;

      const duration = entry.endTime - entry.startTime;
      const hours = hoursFromMilliseconds(duration);
      weekTotal += hours;

      const categoryId = entry.categoryId || "uncategorized";
      categoryHours[categoryId] = (categoryHours[categoryId] || 0) + hours;
    });

    // Format data for pie chart
    const pieChartData = Object.entries(categoryHours).map(
      ([categoryId, hours]) => {
        const category = stableGetCategory(categoryId);
        return {
          name: category?.name || "Uncategorized",
          value: hours,
          color: category?.color || "#CCCCCC",
          categoryId,
          hours,
        };
      }
    );

    setCurrentWeekData(pieChartData);
    setTotalHours(weekTotal);

    // Process weekly data (past 6 weeks)
    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42); // 6 weeks ago

    const weeklyEntries = completedEntries.filter(
      (entry) => new Date(entry.startTime) >= sixWeeksAgo
    );

    // Group by week and category
    const weekData: Record<string, Record<string, number>> = {};

    weeklyEntries.forEach((entry) => {
      if (!entry.endTime) return;

      const entryDate = new Date(entry.startTime);
      const weekStart = getWeekStart(entryDate);
      const categoryId = entry.categoryId || "uncategorized";

      if (!weekData[weekStart]) {
        weekData[weekStart] = {};
      }

      const duration = entry.endTime - entry.startTime;
      const hours = hoursFromMilliseconds(duration);

      weekData[weekStart][categoryId] =
        (weekData[weekStart][categoryId] || 0) + hours;
    });

    // Process daily data (past 6 days)
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    sixDaysAgo.setHours(0, 0, 0, 0);

    const recentEntries = completedEntries.filter(
      (entry) => new Date(entry.startTime) >= sixDaysAgo
    );

    // Group by day and category
    const dayData: Record<string, Record<string, number>> = {};

    // Initialize all days
    for (let i = 0; i < 7; i++) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dayKey = formatDate(day);
      dayData[dayKey] = {};
    }

    recentEntries.forEach((entry) => {
      if (!entry.endTime) return;

      const entryDate = new Date(entry.startTime);
      const dayKey = formatDate(entryDate);
      const categoryId = entry.categoryId || "uncategorized";

      if (!dayData[dayKey]) {
        dayData[dayKey] = {};
      }

      const duration = entry.endTime - entry.startTime;
      const hours = hoursFromMilliseconds(duration);

      dayData[dayKey][categoryId] = (dayData[dayKey][categoryId] || 0) + hours;
    });

    // Convert to array format for charts
    const dailyChartData = Object.entries(dayData)
      .map(([day, categoryData]) => {
        const dataPoint: DailyChartData = { day, total: 0 };

        // Add hours for each category
        Object.entries(categoryData).forEach(([categoryId, hours]) => {
          const category = stableGetCategory(categoryId);
          dataPoint[categoryId] = hours;
          dataPoint[`${categoryId}_name`] = category?.name || "Uncategorized";
          dataPoint.total += hours;
        });

        return dataPoint;
      })
      .sort((a, b) => {
        // Sort by date (from oldest to newest)
        const dateA = new Date(a.day);
        const dateB = new Date(b.day);
        return dateA.getTime() - dateB.getTime();
      });

    setDailyData(dailyChartData);

    // Process work type data based on descriptions
    // Extract work types from descriptions
    const workTypeSet = new Set<string>();
    const workTypesByEntry: Record<string, string> = {};

    currentWeekEntries.forEach((entry) => {
      const workType = getWorkTypeFromDescription(entry.description);
      workTypesByEntry[entry.id] = workType;
      workTypeSet.add(workType);
    });

    // Create work type colors map
    const workTypeColors: { id: string; name: string; color: string }[] =
      Array.from(workTypeSet).map((type) => ({
        id: type,
        name: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize
        color: getWorkTypeColor(type),
      }));

    setWorkTypes(workTypeColors);

    const workTypeHours: Record<string, Record<string, number>> = {};

    // Initialize by category
    categories.forEach((category) => {
      if (!workTypeHours[category.id]) {
        workTypeHours[category.id] = {};
        // Initialize all work types with 0 hours
        workTypeColors.forEach((workType) => {
          workTypeHours[category.id][workType.id] = 0;
        });
      }
    });

    // Add uncategorized if it has entries
    if (currentWeekEntries.some((entry) => !entry.categoryId)) {
      workTypeHours["uncategorized"] = {};
      workTypeColors.forEach((workType) => {
        workTypeHours["uncategorized"][workType.id] = 0;
      });
    }

    // Fill in data
    currentWeekEntries.forEach((entry) => {
      if (!entry.endTime) return;

      const categoryId = entry.categoryId || "uncategorized";
      const workType = workTypesByEntry[entry.id];

      const duration = entry.endTime - entry.startTime;
      const hours = hoursFromMilliseconds(duration);

      if (!workTypeHours[categoryId]) {
        workTypeHours[categoryId] = {};
        workTypeColors.forEach((wt) => {
          workTypeHours[categoryId][wt.id] = 0;
        });
      }

      workTypeHours[categoryId][workType] =
        (workTypeHours[categoryId][workType] || 0) + hours;
    });

    // Format data for stacked chart
    const workTypeChartData = Object.entries(workTypeHours)
      .filter(([, data]) => Object.values(data).some((hours) => hours > 0))
      .map(([categoryId, typeData]) => {
        const category = stableGetCategory(categoryId);
        const result: WorkTypeData = {
          category: category?.name || "Uncategorized",
          categoryId,
        };

        // Add all work types to the result
        Object.entries(typeData).forEach(([workType, hours]) => {
          result[workType] = hours;
        });

        return result;
      });

    setWorkTypeData(workTypeChartData);
  }, [entries, stableGetCategory, categories]);

  // If no data, show a placeholder
  if (entries.length === 0) {
    return (
      <div className="space-y-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <h2 className="text-lg font-medium dark:text-white">Analytics</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Start tracking time to see analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Chart with Summary Legend */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <h2 className="text-lg font-medium mb-3 dark:text-white">
          Time Tracked by Category (Past 6 Days)
        </h2>
        <p className="text-gray-600 dark:text-gray-300 font-medium mb-4">
          This Week Total: {totalHours.toFixed(1)}h
        </p>

        {/* Category Summary Legend */}
        <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-2">
          {currentWeekData.map((entry, index) => (
            <div
              key={`legend-${index}`}
              className="flex items-center text-sm p-2 rounded-md bg-gray-100 dark:bg-gray-700 px-4 overflow-hidden"
            >
              <div
                className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                style={{
                  backgroundColor: entry.color,
                }}
              ></div>
              <span className="ml-auto pl-1 whitespace-nowrap text-gray-500 dark:text-gray-400 flex-shrink-0">
                ({entry.hours.toFixed(1)}h)
              </span>
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day" stroke="#9CA3AF" />
            <YAxis unit="h" stroke="#9CA3AF" />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "total") return [`${value.toFixed(1)}h`, "Total"];

                const match = name.match(/^(.+)_name$/);
                const actualName = match
                  ? dailyData.find((d) => d[match[1] + "_name"])?.[
                      match[1] + "_name"
                    ]
                  : name;
                return [`${value.toFixed(1)}h`, actualName || name];
              }}
              contentStyle={{
                backgroundColor: "rgba(30, 41, 59, 0.8)",
                borderColor: "#475569",
                color: "#E5E7EB",
              }}
              itemStyle={{ color: "#E5E7EB" }}
              labelStyle={{ color: "#E5E7EB" }}
            />
            <Legend wrapperStyle={{ color: "#E5E7EB" }} />
            {categories.map((category) => (
              <Bar
                key={category.id}
                dataKey={category.id}
                name={category.name}
                stackId="a"
                fill={category.color}
              />
            ))}
            <Bar
              dataKey="uncategorized"
              name="Uncategorized"
              stackId="a"
              fill="#CCCCCC"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Work Type Chart */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4 dark:text-white">
          Current Week: Time Distribution by Task Type
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={workTypeData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" unit="h" stroke="#9CA3AF" />
            <YAxis
              type="category"
              dataKey="category"
              width={120}
              stroke="#9CA3AF"
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                const workType = workTypes.find((t) => t.id === name);
                return [`${value.toFixed(1)}h`, workType?.name || name];
              }}
              contentStyle={{
                backgroundColor: "rgba(30, 41, 59, 0.8)",
                borderColor: "#475569",
                color: "#E5E7EB",
              }}
              itemStyle={{ color: "#E5E7EB" }}
              labelStyle={{ color: "#E5E7EB" }}
            />
            <Legend wrapperStyle={{ color: "#E5E7EB" }} />
            {workTypes.map((type) => (
              <Bar
                key={type.id}
                dataKey={type.id}
                name={type.name}
                stackId="a"
                fill={type.color}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsCharts;
