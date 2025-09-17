import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, CalendarIcon, CheckCircle2, TrendingUp, Target, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, eachDayOfInterval, isSameDay, parseISO, differenceInDays, isBefore } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DateRange } from 'react-day-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { useHabits } from '@/hooks/useHabits';

interface HabitAnalyticsDashboardProps {
  dateRange: DateRange | undefined;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
  isDemo?: boolean;
  demoUserId?: string;
}

const HabitAnalyticsDashboard: React.FC<HabitAnalyticsDashboardProps> = ({ dateRange, setDateRange, demoUserId }) => {
  const { habits, loading } = useHabits({
    userId: demoUserId,
    startDate: dateRange?.from || startOfMonth(new Date()),
    endDate: dateRange?.to || new Date(),
  });

  const analyticsData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to || habits.length === 0) return [];

    const interval = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const dailyDataMap = new Map<string, { completed: number; total: number }>();

    interval.forEach(day => {
      dailyDataMap.set(format(day, 'yyyy-MM-dd'), { completed: 0, total: 0 });
    });

    habits.forEach(habit => {
      habit.logs.forEach(log => {
        const logDate = format(parseISO(log.log_date), 'yyyy-MM-dd');
        if (dailyDataMap.has(logDate)) {
          const entry = dailyDataMap.get(logDate)!;
          entry.total++;
          if (log.is_completed) {
            entry.completed++;
          }
        }
      });
    });

    return interval.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const entry = dailyDataMap.get(dateKey)!;
      const completionRate = entry.total > 0 ? (entry.completed / entry.total) * 100 : 0;
      return {
        date: format(day, 'MMM dd'),
        completedHabits: entry.completed,
        totalHabits: entry.total,
        completionRate: Math.round(completionRate),
      };
    });
  }, [habits, dateRange]);

  const { totalCompleted, totalTracked, overallCompletionRate, avgDailyCompletionRate, longestStreak, currentStreak } = useMemo(() => {
    if (analyticsData.length === 0) {
      return {
        totalCompleted: 0,
        totalTracked: 0,
        overallCompletionRate: 0,
        avgDailyCompletionRate: 0,
        longestStreak: 0,
        currentStreak: 0,
      };
    }

    const totalCompleted = analyticsData.reduce((sum, day) => sum + day.completedHabits, 0);
    const totalTracked = analyticsData.reduce((sum, day) => sum + day.totalHabits, 0);
    const overallCompletionRate = totalTracked > 0 ? (totalCompleted / totalTracked) * 100 : 0;
    const avgDailyCompletionRate = analyticsData.reduce((sum, day) => sum + day.completionRate, 0) / analyticsData.length;

    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    analyticsData.forEach(day => {
      const dayDate = parseISO(format(new Date(day.date), 'yyyy-MM-dd')); // Re-parse to ensure date object
      if (day.completedHabits > 0 && day.completedHabits === day.totalHabits) { // All habits completed for the day
        if (lastDate === null || differenceInDays(dayDate, lastDate) === 1) {
          tempStreak++;
        } else if (differenceInDays(dayDate, lastDate) > 1) {
          tempStreak = 1;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
      }
      lastDate = dayDate;
    });
    longestStreak = Math.max(longestStreak, tempStreak);

    // Calculate current streak up to today
    tempStreak = 0;
    lastDate = null;
    const today = startOfMonth(new Date()); // Use startOfMonth for consistency with dateRange
    for (let i = analyticsData.length - 1; i >= 0; i--) {
      const day = analyticsData[i];
      const dayDate = parseISO(format(new Date(day.date), 'yyyy-MM-dd'));
      if (isSameDay(dayDate, today) || isBefore(dayDate, today)) { // Only consider up to today
        if (day.completedHabits > 0 && day.completedHabits === day.totalHabits) {
          if (lastDate === null || differenceInDays(lastDate, dayDate) === 1) { // Check backwards
            tempStreak++;
          } else if (differenceInDays(lastDate, dayDate) > 1) {
            tempStreak = 1;
          }
          lastDate = dayDate;
        } else {
          break;
        }
      }
    }
    currentStreak = tempStreak;


    return {
      totalCompleted,
      totalTracked,
      overallCompletionRate: Math.round(overallCompletionRate),
      avgDailyCompletionRate: Math.round(avgDailyCompletionRate),
      longestStreak,
      currentStreak,
    };
  }, [analyticsData, habits]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-4">
        <h2 className="text-2xl font-bold">Habit Insights</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full sm:w-[300px] justify-start text-left font-normal h-9",
                  !dateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : habits.length === 0 ? (
        <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
          <Flame className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">No habits found for this period.</p>
          <p className="text-sm">Add habits in the Tracker tab to see insights here!</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Habits Completed</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCompleted}</div>
                <p className="text-xs text-muted-foreground">across all habits</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallCompletionRate}%</div>
                <p className="text-xs text-muted-foreground">of all tracked habits</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Daily Completion</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgDailyCompletionRate}%</div>
                <p className="text-xs text-muted-foreground">average per day</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                <Flame className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentStreak} days</div>
                <p className="text-xs text-muted-foreground">all habits completed</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Longest Streak</CardTitle>
                <Flame className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{longestStreak} days</div>
                <p className="text-xs text-muted-foreground">all habits completed</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Habits Tracked</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTracked}</div>
                <p className="text-xs text-muted-foreground">individual habit logs</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-xl">
            <CardHeader>
              <h3 className="text-lg font-semibold mb-3">Daily Habit Completion Rate</h3>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Completion Rate']} />
                    <Line type="monotone" dataKey="completionRate" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <h3 className="text-lg font-semibold mb-3">Habits Completed vs. Total Tracked Daily</h3>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completedHabits" fill="hsl(var(--primary))" name="Completed" />
                    <Bar dataKey="totalHabits" fill="hsl(var(--muted))" name="Total Tracked" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HabitAnalyticsDashboard;