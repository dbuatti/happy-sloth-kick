import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, isSameDay } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar"; // Import the Sidebar component

// Mock function to get aggregated task data for analytics
// This simulates what a real backend would do
const getAnalyticsData = () => {
  // This is a simplified example. In a real app, you'd query a database.
  const data = [];
  const today = new Date();

  // Generate mock data for the last 30 days
  for (let i = 29; i >= 0; i--) {
    const date = subDays(today, i);
    const dateKey = format(date, 'yyyy-MM-dd');

    // Simulate some data. In a real app, you'd get this from your data store.
    const totalTasks = Math.floor(Math.random() * 8) + 2; // 2-9 tasks
    const completedTasks = Math.floor(Math.random() * totalTasks); // 0 to totalTasks
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    data.push({
      date: format(date, 'MMM dd'),
      tasksCompleted: completedTasks,
      completionRate: Math.round(completionRate),
    });
  }

  return data;
};

const Analytics = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [chartData, setChartData] = useState(getAnalyticsData());

  // Simulate fetching new data when the date changes
  useEffect(() => {
    // In a real app, you'd fetch data based on the selected date
    console.log("Fetching analytics data for:", date);
  }, [date]);

  // Calculate summary statistics from the chart data
  const totalTasksCompleted = chartData.reduce((sum, day) => sum + day.tasksCompleted, 0);
  const averageCompletionRate = Math.round(
    chartData.reduce((sum, day) => sum + day.completionRate, 0) / chartData.length
  );

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-grow p-4">
          <Card className="w-full shadow-lg">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <CardTitle className="text-3xl font-bold">Task Analytics</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[280px] justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tasks Completed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalTasksCompleted}</div>
                    <p className="text-xs text-muted-foreground">Over the last 30 days</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Completion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{averageCompletionRate}%</div>
                    <p className="text-xs text-muted-foreground">Tasks completed per day</p>
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
                        <Bar dataKey="tasksCompleted" fill="hsl(var(--primary))" />
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
                        <Line type="monotone" dataKey="completionRate" stroke="hsl(var(--primary))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
        <footer className="p-4">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} TaskMaster. Made with Dyad.
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Analytics;