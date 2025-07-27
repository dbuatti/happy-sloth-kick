import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, isSameDay, eachDayOfInterval, startOfMonth, endOfMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { CalendarIcon, TrendingUp, Target, Clock, CheckCircle2, ListTodo } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from 'react-day-picker';
import { MadeWithDyad } from "@/components/made-with-dyad"; // Ensure MadeWithDyad is imported

// Define the task type
interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  is_daily_recurring: boolean;
  created_at: string;
  user_id: string;
  category: string;
  priority: string;
  due_date: string | null;
  notes: string | null;
}

// Function to get aggregated task data for analytics
const getAnalyticsData = async (startDate: Date, endDate: Date, userId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lt('created_at', endDate.toISOString());

  if (error) {
    console.error('Error fetching analytics data:', error);
    return { dailyData: [], categoryData: [], priorityData: {} };
  }

  // Group tasks by date
  const tasksByDate = (data as Task[]).reduce((acc, task) => {
    const date = format(new Date(task.created_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = { completed: 0, total: 0 };
    }
    acc[date].total++;
    if (task.status === 'completed') {
      acc[date].completed++;
    }
    return acc;
  }, {} as Record<string, { completed: number; total: number }>);

  // Generate data for each day in the range
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
  const dailyData = dateRange.map(date => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayData = tasksByDate[dateKey] || { completed: 0, total: 0 };
    const completionRate = dayData.total > 0 ? (dayData.completed / dayData.total) * 100 : 0;
    
    return {
      date: format(date, 'MMM dd'),
      tasksCompleted: dayData.completed,
      totalTasks: dayData.total,
      completionRate: Math.round(completionRate),
    };
  });

  // Calculate category data
  const categoryCounts = (data as Task[]).reduce((acc, task) => {
    const category = task.category || 'general';
    if (!acc[category]) {
      acc[category] = { completed: 0, total: 0 };
    }
    acc[category].total++;
    if (task.status === 'completed') {
      acc[category].completed++;
    }
    return acc;
  }, {} as Record<string, { completed: number; total: number }>);

  const categoryData = Object.entries(categoryCounts).map(([name, counts]) => ({
    name,
    value: counts.total,
    completed: counts.completed,
    completionRate: Math.round((counts.completed / counts.total) * 100)
  }));

  // Calculate priority data
  const priorityCounts = (data as Task[]).reduce((acc, task) => {
    const priority = task.priority;
    if (!acc[priority]) {
      acc[priority] = { completed: 0, total: 0 };
    }
    acc[priority].total++;
    if (task.status === 'completed') {
      acc[priority].completed++;
    }
    return acc;
  }, {} as Record<string, { completed: number; total: number }>);

  return { dailyData, categoryData, priorityData: priorityCounts };
};

const Analytics = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [priorityData, setPriorityData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!dateRange?.from || !dateRange?.to || !userId) return;

      setLoading(true);
      try {
        const { dailyData, categoryData, priorityData } = await getAnalyticsData(dateRange.from, dateRange.to, userId);
        setChartData(dailyData);
        setCategoryData(categoryData);
        setPriorityData(priorityData);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [dateRange, userId]);

  // Calculate summary statistics from the chart data
  const totalTasksCompleted = chartData.reduce((sum, day) => sum + day.tasksCompleted, 0);
  const totalTasksCreated = chartData.reduce((sum, day) => sum + day.totalTasks, 0);
  const averageCompletionRate = totalTasksCreated > 0 ? Math.round((totalTasksCompleted / totalTasksCreated) * 100) : 0;

  // Calculate most productive day
  const mostProductiveDay = chartData.length > 0 
    ? chartData.reduce((max, day) => day.tasksCompleted > max.tasksCompleted ? day : max) 
    : null;

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-6"> {/* Increased p-4 to p-6 */}
        <Card className="w-full max-w-4xl mx-auto shadow-lg">
          <CardHeader className="pb-4"> {/* Increased pb-2 to pb-4 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <CardTitle className="text-3xl font-bold">Task Analytics</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-[300px] justify-start text-left font-normal",
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
          </CardHeader>
          <CardContent className="pt-0"> {/* Added pt-0 */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid gap-6 md:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Tasks Completed</CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalTasksCompleted}</div>
                      <p className="text-xs text-muted-foreground">Out of {totalTasksCreated} created</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Completion Rate</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{averageCompletionRate}%</div>
                      <p className="text-xs text-muted-foreground">Overall completion rate</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Most Productive Day</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{mostProductiveDay ? mostProductiveDay.date : 'N/A'}</div>
                      <p className="text-xs text-muted-foreground">
                        {mostProductiveDay ? `${mostProductiveDay.tasksCompleted} tasks completed` : 'No data'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Tasks Created</CardTitle>
                      <ListTodo className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalTasksCreated}</div>
                      <p className="text-xs text-muted-foreground">Across selected period</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Tasks Completed Per Day</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="tasksCompleted" fill="hsl(var(--primary))" name="Completed" />
                          <Bar dataKey="totalTasks" fill="hsl(var(--muted))" name="Total" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Daily Completion Rate</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Line type="monotone" dataKey="completionRate" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Tasks by Category</h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Tasks by Priority</h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={Object.entries(priorityData).map(([priority, data]: [string, any]) => ({
                            priority,
                            total: data.total,
                            completed: data.completed
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="priority" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="completed" fill="hsl(var(--primary))" name="Completed" />
                            <Bar dataKey="total" fill="hsl(var(--muted))" name="Total" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="p-6"> {/* Increased p-4 to p-6 */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} TaskMaster. Made with Dyad.
        </div>
      </footer>
    </div>
  );
};

export default Analytics;