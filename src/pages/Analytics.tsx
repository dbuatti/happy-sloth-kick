import React, { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { Task, TaskCategory, AnalyticsTask } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar as CalendarIcon } from 'lucide-react';

interface AnalyticsData {
  dailyAverage: number;
  averageCompletion: number;
  tasksCompleted: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6F91'];

const Analytics: React.FC<AnalyticsProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const { tasks, categories, isLoading: tasksLoading, error: tasksError } = useTasks({ userId: currentUserId! });

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (!dateRange?.from || !dateRange?.to) return tasks;

    return tasks.filter(task =>
      task.created_at && isWithinInterval(parseISO(task.created_at), { start: dateRange.from!, end: dateRange.to! })
    );
  }, [tasks, dateRange]);

  const dailyTaskCompletion = useMemo(() => {
    const counts: { [key: string]: { completed: number; total: number } } = {};
    (filteredTasks as AnalyticsTask[]).forEach(task => {
      const date = format(parseISO(task.created_at), 'yyyy-MM-dd');
      if (!counts[date]) {
        counts[date] = { completed: 0, total: 0 };
      }
      counts[date].total++;
      if (task.status === 'completed') {
        counts[date].completed++;
      }
    });

    return Object.keys(counts).map(date => ({
      date,
      completed: counts[date].completed,
      total: counts[date].total,
      completionRate: counts[date].total > 0 ? (counts[date].completed / counts[date].total) * 100 : 0,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredTasks]);

  const categoryCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    (filteredTasks as AnalyticsTask[]).forEach(task => {
      const category = categories?.find(cat => cat.id === task.category)?.name || 'Uncategorized';
      counts[category] = (counts[category] || 0) + 1;
    });
    return Object.keys(counts).map(category => ({
      name: category,
      value: counts[category],
    }));
  }, [filteredTasks, categories]);

  const priorityCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    (filteredTasks as AnalyticsTask[]).forEach(task => {
      const priority = task.priority || 'None';
      counts[priority] = (counts[priority] || 0) + 1;
    });
    return Object.keys(counts).map(priority => ({
      name: priority,
      value: counts[priority],
    }));
  }, [filteredTasks]);

  if (tasksLoading || authLoading) {
    return <div className="flex justify-center items-center h-full">Loading analytics...</div>;
  }

  if (tasksError) {
    return <div className="flex justify-center items-center h-full text-red-500">Error: {tasksError.message}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Task Analytics</h1>

      <div className="mb-6 flex justify-end">
        <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{filteredTasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{filteredTasks.filter(task => task.status === 'completed').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {filteredTasks.length > 0
                ? ((filteredTasks.filter(task => task.status === 'completed').length / filteredTasks.length) * 100).toFixed(2)
                : 0}
              %
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Daily Task Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyTaskCompletion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed" fill="#8884d8" name="Completed" />
                <Bar dataKey="total" fill="#82ca9d" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryCounts}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Tasks by Priority</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityCounts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;