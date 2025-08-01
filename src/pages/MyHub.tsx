import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, BarChart3, Archive as ArchiveIcon, LayoutGrid, CalendarIcon, Clock, CheckCircle2, ListTodo, Target, Sun, Moon, MessageSquare } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, eachDayOfInterval, startOfMonth } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from 'react-day-picker';
import { Skeleton } from '@/components/ui/skeleton';
import WorkHoursSettings from '@/components/WorkHoursSettings';
import ProjectTrackerSettings from '@/components/ProjectTrackerSettings';
import { useTasks, Task } from '@/hooks/useTasks';
import TaskItem from '@/components/TaskItem';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { useAuth } from '@/context/AuthContext';
import TaskOverviewDialog from '@/components/TaskOverviewDialog'; // Import TaskOverviewDialog
import { useTheme } from 'next-themes'; // Import useTheme

// --- Analytics Logic (moved from src/pages/Analytics.tsx) ---
interface AnalyticsTask {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  is_daily_recurring: boolean;
  created_at: string;
  user_id: string;
  category: string;
  priority: string;
  due_date: string | null;
}

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

  const tasksByDate = (data as AnalyticsTask[]).reduce((acc, task) => {
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

  const categoryCounts = (data as AnalyticsTask[]).reduce((acc, task) => {
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

  const priorityCounts = (data as AnalyticsTask[]).reduce((acc, task) => {
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

// --- Settings Logic (moved from src/pages/Settings.tsx) ---
interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

// --- MyHub Component ---
const MyHub: React.FC = () => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const { theme, setTheme } = useTheme();

  // State for Analytics Tab
  const [analyticsDateRange, setAnalyticsDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [priorityData, setPriorityData] = useState<any>({});
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const analyticsColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // State for Settings Tab
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // State for Archive Tab
  const {
    tasks: allTasks, // Need all tasks for subtask filtering in overview
    filteredTasks: archivedTasks, 
    loading: archiveLoading,
    userId: archiveUserId, // This will be the same as currentUserId
    updateTask,
    deleteTask,
    sections, // Get sections from useTasks
    allCategories, // Get allCategories from useTasks
    setStatusFilter,
  } = useTasks({ viewMode: 'archive' });

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false); // New state for overview dialog
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null); // Task for overview dialog

  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // --- Effects for Analytics Tab ---
  useEffect(() => {
    const fetchData = async () => {
      if (!analyticsDateRange?.from || !analyticsDateRange?.to || !currentUserId) return;

      setAnalyticsLoading(true);
      try {
        const { dailyData, categoryData, priorityData } = await getAnalyticsData(analyticsDateRange.from, analyticsDateRange.to, currentUserId);
        setChartData(dailyData);
        setCategoryData(categoryData);
        setPriorityData(priorityData);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    if (currentUserId) {
      fetchData();
    }
  }, [analyticsDateRange, currentUserId]);

  const totalTasksCompleted = chartData.reduce((sum, day) => sum + day.tasksCompleted, 0);
  const totalTasksCreated = chartData.reduce((sum, day) => sum + day.totalTasks, 0);
  const averageCompletionRate = totalTasksCreated > 0 ? Math.round((totalTasksCompleted / totalTasksCreated) * 100) : 0;
  const mostProductiveDay = chartData.length > 0 
    ? chartData.reduce((max, day) => day.tasksCompleted > max.tasksCompleted ? day : max) 
    : null;

  // --- Effects for Settings Tab ---
  useEffect(() => {
    const getProfile = async () => {
      try {
        setProfileLoading(true);
        if (!currentUserId) return;

        const { data, error, status } = await supabase
          .from('profiles')
          .select(`id, first_name, last_name`)
          .eq('id', currentUserId)
          .single();

        if (error && status !== 406) {
          throw error;
        }

        if (data) {
          setProfile(data);
          setFirstName(data.first_name || '');
          setLastName(data.last_name || '');
        }
      } catch (error: any) {
        console.error('Error fetching profile:', error);
        // Consider adding a toast error here if needed
      } finally {
        setProfileLoading(false);
      }
    };
    if (currentUserId) {
      getProfile();
    }
  }, [currentUserId]);

  const updateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsSavingProfile(true);
      if (!currentUserId) return;

      const updates = {
        id: currentUserId,
        first_name: firstName,
        last_name: lastName,
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }
      // showSuccess('Profile updated successfully!'); // Re-add toast if needed
    } catch (error: any) {
      console.error('Error updating profile:', error);
      // showError(error.message); // Re-add toast if needed
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSavingProfile(true); // Use profile saving state for sign out button
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // showSuccess('Signed out successfully!'); // Re-add toast if needed
      window.location.href = '/'; 
    } catch (error: any) {
      console.error('Error signing out:', error);
      // showError(error.message); // Re-add toast if needed
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- Effects for Archive Tab ---
  useEffect(() => {
    setStatusFilter('archived');
  }, [setStatusFilter]);

  const handleTaskStatusChange = async (taskId: string, newStatus: Task['status']) => {
    await updateTask(taskId, { status: newStatus });
  };

  const handleOpenOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setIsTaskOverviewOpen(false); // Close overview
    setTaskToEdit(task);
    setIsTaskDetailOpen(true); // Open edit dialog
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-4xl mx-auto shadow-lg p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center">My Hub</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs defaultValue="settings" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="settings">
                  <SettingsIcon className="h-4 w-4 mr-2" /> Settings
                </TabsTrigger>
                <TabsTrigger value="analytics">
                  <BarChart3 className="h-4 w-4 mr-2" /> Analytics
                </TabsTrigger>
                <TabsTrigger value="archive">
                  <ArchiveIcon className="h-4 w-4 mr-2" /> Archive
                </TabsTrigger>
              </TabsList>

              {/* Settings Tab Content */}
              <TabsContent value="settings" className="mt-4 space-y-6">
                <Card className="w-full shadow-lg p-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl font-bold text-center">Profile Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {profileLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <form onSubmit={updateProfile} className="space-y-4">
                        <div>
                          <label htmlFor="firstName" className="block text-sm font-medium text-foreground">First Name</label>
                          <input
                            id="firstName"
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label htmlFor="lastName" className="block text-sm font-medium text-foreground">Last Name</label>
                          <input
                            id="lastName"
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={isSavingProfile}>
                          {isSavingProfile ? 'Saving...' : 'Update Profile'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full mt-4"
                          onClick={handleSignOut}
                          disabled={isSavingProfile}
                        >
                          Sign Out
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>

                {/* Theme Toggle */}
                <Card className="w-full shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      <Sun className="h-6 w-6 text-primary" /> Theme
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Switch between light and dark modes.</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <label htmlFor="dark-mode-toggle" className="text-base font-medium">Dark Mode</label>
                      <Button
                        id="dark-mode-toggle"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        aria-label="Toggle dark mode"
                      >
                        {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <WorkHoursSettings />
                <ProjectTrackerSettings />

                {/* Chat Link Placeholder */}
                <Card className="w-full shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      <MessageSquare className="h-6 w-6 text-primary" /> Support
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Need help? Contact our support team.</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <a href="#" className="text-blue-500 hover:underline text-sm">Chat with Support</a>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab Content */}
              <TabsContent value="analytics" className="mt-4 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-4">
                  <h2 className="text-2xl font-bold">Task Analytics</h2>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date"
                          variant={"outline"}
                          className={cn(
                            "w-full sm:w-[300px] justify-start text-left font-normal", // Adjusted width
                            !analyticsDateRange?.from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {analyticsDateRange?.from ? (
                            analyticsDateRange.to ? (
                              <>
                                {format(analyticsDateRange.from, "LLL dd, y")} -{" "}
                                {format(analyticsDateRange.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(analyticsDateRange.from, "LLL dd, y")
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
                          defaultMonth={analyticsDateRange?.from}
                          selected={analyticsDateRange}
                          onSelect={setAnalyticsDateRange}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {analyticsLoading ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-4">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                    <Skeleton className="h-80 w-full" />
                    <Skeleton className="h-80 w-full" />
                    <div className="grid md:grid-cols-2 gap-6">
                      <Skeleton className="h-80 w-full" />
                      <Skeleton className="h-80 w-full" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-4">
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

                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Tasks Completed Per Day</h3>
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
                        <h3 className="text-lg font-semibold mb-3">Daily Completion Rate</h3>
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

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Tasks by Category</h3>
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
                                    <Cell key={`cell-${index}`} fill={analyticsColors[index % analyticsColors.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold mb-3">Tasks by Priority</h3>
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
              </TabsContent>

              {/* Archive Tab Content */}
              <TabsContent value="archive" className="mt-4 space-y-6">
                <h2 className="text-2xl font-bold mb-4">Archived Tasks</h2>
                {archiveLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-lg" />
                    ))}
                  </div>
                ) : archivedTasks.length === 0 ? (
                  <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
                    <ArchiveIcon className="h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">No archived tasks found.</p>
                    <p className="text-sm">Completed tasks will appear here once you archive them from your daily view.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {archivedTasks.map((task) => (
                      <li key={task.id} className="relative border rounded-lg p-2 transition-all duration-200 ease-in-out group hover:shadow-md">
                        <TaskItem
                          task={task}
                          userId={archiveUserId}
                          onStatusChange={handleTaskStatusChange}
                          onDelete={deleteTask}
                          onUpdate={updateTask}
                          isSelected={false}
                          onToggleSelect={() => {}}
                          sections={sections}
                          onOpenOverview={handleOpenOverview} // Changed from onEditTask to onOpenOverview
                          currentDate={new Date()}
                          onMoveUp={async () => {}}
                          onMoveDown={async () => {}}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          userId={archiveUserId}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={allTasks} // Pass all tasks for subtask filtering
        />
      )}
      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          userId={archiveUserId}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
        />
      )}
    </div>
  );
};

export default MyHub;