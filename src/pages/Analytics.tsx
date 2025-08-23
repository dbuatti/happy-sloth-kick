import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { Task, TaskCategory, AnalyticsProps } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

const Analytics: React.FC<AnalyticsProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const { tasks, categories, isLoading, error } = useTasks({ userId: currentUserId, isDemo, demoUserId });

  const defaultMonth = startOfMonth(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: defaultMonth,
    to: endOfMonth(defaultMonth),
  });

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(task => {
      if (!task.created_at || !dateRange?.from || !dateRange?.to) return true; // Include if no date or no range
      const taskDate = parseISO(task.created_at);
      return isWithinInterval(taskDate, { start: dateRange.from, end: dateRange.to });
    });
  }, [tasks, dateRange]);

  const completedTasks = filteredTasks.filter(task => task.status === 'completed').length;
  const totalTasks = filteredTasks.length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const categoryCounts = useMemo(() => {
    if (!categories) return [];
    return categories.map((cat: TaskCategory) => ({
      name: cat.name,
      value: filteredTasks.filter((task: Task) => task.category === cat.id).length,
      color: cat.color,
    }));
  }, [categories, filteredTasks]);

  if (authLoading || isLoading) {
    return <div className="p-4 text-center">Loading analytics...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading data: {error.message}</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              Tasks in selected period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              Tasks marked as done
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Percentage of tasks completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active categories
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryCounts.length === 0 ? (
            <p className="text-muted-foreground">No categories with tasks in this period.</p>
          ) : (
            <div className="space-y-2">
              {categoryCounts.map(cat => (
                <div key={cat.name} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: cat.color }} />
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  <span>{cat.value} tasks</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;