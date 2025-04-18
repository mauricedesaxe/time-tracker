import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
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

// Define interfaces for chart data
interface PieChartData {
  name: string;
  value: number;
  color: string;
  categoryId: string;
  hours: number;
}

interface WeeklyChartData {
  week: string;
  [categoryId: string]: string | number;
}

interface DailyChartData {
  day: string;
  total: number;
  [categoryId: string]: string | number;
}

interface WorkTypeData {
  category: string;
  categoryId: string;
  regular: number;
  content: number;
  meeting: number;
  coding: number;
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

const COLORS = [
  "#FF6384",
  "#36A2EB",
  "#FFCE56",
  "#4BC0C0",
  "#9966FF",
  "#FF9F40",
  "#FF6384",
  "#C9CBCF",
];

const WORK_TYPES = [
  { id: "regular", name: "Regular Work", color: "#4299E1" },
  { id: "content", name: "Content", color: "#F6AD55" },
  { id: "meeting", name: "Meeting", color: "#48BB78" },
  { id: "coding", name: "Coding", color: "#E53E3E" },
];

const AnalyticsCharts = () => {
  const { getTimeEntriesSorted, getCategories, getCategory } =
    useTimeTrackerStore();
  const entries = getTimeEntriesSorted("startTime", true).filter(
    (entry) => !!entry.endTime
  );
  const categories = getCategories();

  // State for chart data
  const [currentWeekData, setCurrentWeekData] = useState<PieChartData[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyChartData[]>([]);
  const [dailyData, setDailyData] = useState<DailyChartData[]>([]);
  const [workTypeData, setWorkTypeData] = useState<WorkTypeData[]>([]);
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
        const category = getCategory(categoryId);
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

    // Convert to array format for charts
    const weeklyChartData = Object.entries(weekData)
      .map(([week, categoryData]) => {
        const dataPoint: WeeklyChartData = { week };

        // Add hours for each category
        Object.entries(categoryData).forEach(([categoryId, hours]) => {
          const category = getCategory(categoryId);
          dataPoint[categoryId] = hours;
          dataPoint[`${categoryId}_name`] = category?.name || "Uncategorized";
        });

        return dataPoint;
      })
      .sort((a, b) => {
        // Sort by date
        const dateA = new Date(a.week);
        const dateB = new Date(b.week);
        return dateA.getTime() - dateB.getTime();
      });

    setWeeklyData(weeklyChartData);

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
          const category = getCategory(categoryId);
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

    // Process work type data
    // Simulate work types for now based on categories
    // In a real app, you would have a workType field in your entries
    const workTypesByCategory: Record<string, string> = {
      c1: "coding", // Assign work types based on category
      c2: "regular",
    };

    const workTypeHours: Record<string, Record<string, number>> = {};

    // Initialize by category
    categories.forEach((category) => {
      if (!workTypeHours[category.id]) {
        workTypeHours[category.id] = {
          regular: 0,
          content: 0,
          meeting: 0,
          coding: 0,
        };
      }
    });

    // Fill in data
    currentWeekEntries.forEach((entry) => {
      if (!entry.endTime || !entry.categoryId) return;

      const categoryId = entry.categoryId;
      const workType = workTypesByCategory[categoryId] || "regular";

      const duration = entry.endTime - entry.startTime;
      const hours = hoursFromMilliseconds(duration);

      if (!workTypeHours[categoryId]) {
        workTypeHours[categoryId] = {
          regular: 0,
          content: 0,
          meeting: 0,
          coding: 0,
        };
      }

      workTypeHours[categoryId][workType] += hours;
    });

    // Format data for stacked chart
    const workTypeChartData = Object.entries(workTypeHours)
      .filter(([, data]) => Object.values(data).some((hours) => hours > 0))
      .map(([categoryId, typeData]) => {
        const category = getCategory(categoryId);
        return {
          category: category?.name || "Uncategorized",
          categoryId,
          regular: typeData.regular || 0,
          content: typeData.content || 0,
          meeting: typeData.meeting || 0,
          coding: typeData.coding || 0,
        };
      });

    setWorkTypeData(workTypeChartData);
  }, [entries, getCategory, categories]);

  // If no data, show a placeholder
  if (entries.length === 0) {
    return (
      <div className="space-y-6 bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-lg font-medium">Analytics</h2>
        <p className="text-gray-500">Start tracking time to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Week Summary */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-lg font-medium mb-3">Current Week</h2>
        <p className="text-gray-600 font-medium mb-4">
          Total: {totalHours.toFixed(1)}h
        </p>

        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={currentWeekData}
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={80}
              dataKey="value"
              nameKey="name"
              label={({ value }) => `${value.toFixed(1)}h`}
            >
              {currentWeekData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [
                `${value.toFixed(1)}h (${((value / totalHours) * 100).toFixed(
                  1
                )}%)`,
                "Hours",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-2">
          {currentWeekData.map((entry, index) => (
            <div
              key={`legend-${index}`}
              className="flex items-center text-sm mb-1"
            >
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{
                  backgroundColor: entry.color || COLORS[index % COLORS.length],
                }}
              ></div>
              <span className="font-medium">{entry.name}</span>
              <span className="ml-2 text-gray-500">
                ({entry.hours.toFixed(1)}h)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">
          Time Tracked by Category (Past 6 Weeks)
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis unit="h" />
            <Tooltip
              formatter={(value: number, name: string) => {
                const match = name.match(/^(.+)_name$/);
                const actualName = match
                  ? weeklyData.find((d) => d[match[1] + "_name"])?.[
                      match[1] + "_name"
                    ]
                  : name;
                return [`${value.toFixed(1)}h`, actualName || name];
              }}
            />
            <Legend />
            {categories.map((category, index) => (
              <Bar
                key={category.id}
                dataKey={category.id}
                name={category.name}
                stackId="a"
                fill={category.color || COLORS[index % COLORS.length]}
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

      {/* Daily Chart */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">
          Time Tracked by Category (Past 6 Days)
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis unit="h" />
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
            />
            <Legend />
            {categories.map((category, index) => (
              <Bar
                key={category.id}
                dataKey={category.id}
                name={category.name}
                stackId="a"
                fill={category.color || COLORS[index % COLORS.length]}
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
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">
          Current Week: Time Distribution by Work Type
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={workTypeData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" unit="h" />
            <YAxis type="category" dataKey="category" width={120} />
            <Tooltip
              formatter={(value: number, name: string) => {
                const workType = WORK_TYPES.find((t) => t.id === name);
                return [`${value.toFixed(1)}h`, workType?.name || name];
              }}
            />
            <Legend />
            {WORK_TYPES.map((type) => (
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
