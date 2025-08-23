import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { Task, TaskCategory, AnalyticsTask, AnalyticsProps } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface AnalyticsData {
  dailyAverage: number;
  totalCompleted: number;
  categoryDistribution: { name: string; value: number; color: string }[];
  priorityDistribution: { name: string; value: number; color: string }[];
  completionTrend: { date: string; completed: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Analytics: React.FC<AnalyticsProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const { tasks, categories, isLoading, error } = useTasks({ userId: currentUserId, isDemo, demoUserId });

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const filteredTasks = useMemo(() => {
    if (!tasks || !dateRange?.from || !dateRange?.to) return [];
    const start = startOfMonth(dateRange.from);
    const end = endOfMonth(dateRange.to);

    return tasks.filter(task =>
      task.status === 'completed' &&
      task.created_at &&
      isWithinInterval(parseISO(task.created_at), { start, end })
    );
  }, [tasks, dateRange]);

  const analyticsData: AnalyticsData = useMemo(() => {
    const totalCompleted = filteredTasks.length;

    const categoryCounts = categories.map(cat => ({
      name: cat.name,
      value: filteredTasks.filter(task => task.category?.id === cat.id).length,
      color: cat.color,
    }));

    const priorityCounts = [
      { name: 'Urgent', value: filteredTasks.filter(task => task.priority === 'urgent').length, color: '#EF4444' },
      { name: 'High', value: filteredTasks.filter(task => task.priority === 'high').length, color: '#F97316' },
      { name: 'Medium', value: filteredTasks.filter(task => task.priority === 'medium').length, color: '#F59E0B' },
      { name: 'Low', value: filteredTasks.filter(task => task.priority === 'low').length, color: '#22C55E' },
    ];

    const completionTrendMap = new Map<string, number>();
    filteredTasks.forEach(task => {
      const date = format(parseISO(task.created_at), 'yyyy-MM-dd');
      completionTrendMap.set(date, (completionTrendMap.get(date) || 0) + 1);
    });
    const completionTrend = Array.from(completionTrendMap.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, completed]) => ({ date, completed }));

    const dailyAverage = totalCompleted / (completionTrend.length || 1);

    return {
      dailyAverage,
      totalCompleted,
      categoryDistribution: categoryCounts.filter(c => c.value > 0),
      priorityDistribution: priorityCounts.filter(p => p.value > 0),
      completionTrend,
    };
  }, [filteredTasks, categories]);

  if (isLoading || authLoading) return <p>Loading analytics...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>

      <div className="mb-6">
        <DateRangePicker
          dateRange={dateRange}
          setDateRange={setDateRange}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Tasks Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{analyticsData.totalCompleted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average Daily Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{analyticsData.dailyAverage.toFixed(1)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tasks Completed by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.categoryDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {analyticsData.categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks Completed by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.priorityDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {analyticsData.priorityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Daily Completion Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.completionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="completed" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;