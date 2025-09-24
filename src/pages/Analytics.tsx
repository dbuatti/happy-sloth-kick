import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, CheckCircle2, Clock, Target, Flame, Moon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfMonth, subMonths, startOfWeek, subWeeks, endOfDay } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSleepAnalytics } from '@/hooks/useSleepAnalytics';

interface AnalyticsProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Analytics: React.FC<AnalyticsProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [taskRange, setTaskRange] = useState('30'); // '7', '30', '90', '180', '365'
  const [habitRange, setHabitRange] = useState('30'); // '7', '30', '90', '180', '365'
  const [habitGoalType, setHabitGoalType] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const getStartDate = (range: string) => {
    const num = parseInt(range);
    if (num === 7) return subDays(new Date(), 6);
    if (num === 30) return subDays(new Date(), 29);
    if (num === 90) return subDays(new Date(), 89);
    if (num === 180) return subDays(new Date(), 179);
    if (num === 365) return subDays(new Date(), 364);
    return subDays(new Date(), 29); // Default to 30 days
  };

  const { data: taskCompletionData, isLoading: taskLoading } = useQuery({
    queryKey: ['dailyTaskCompletionSummary', userId, taskRange],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc('get_daily_task_completion_summary', {
        p_user_id: userId,
        p_days: parseInt(taskRange),
      });
      if (error) throw error;
      return data.map(d => ({
        date: format(parseISO(d.completion_date), 'MMM dd'),
        completed_tasks_count: d.completed_tasks_count,
      }));
    },
    enabled: !!userId && !isDemo,
  });

  const { data: habitCompletionData, isLoading: habitLoading } = useQuery({
    queryKey: [`${habitGoalType}HabitCompletionSummary`, userId, habitRange, habitGoalType],
    queryFn: async () => {
      if (!userId) return [];
      let rpcFunction;
      let dateField;
      let daysOrMonths;

      if (habitGoalType === 'daily') {
        rpcFunction = 'get_daily_habit_completion_summary';
        dateField = 'completion_date';
        daysOrMonths = parseInt(habitRange);
      } else if (habitGoalType === 'weekly') {
        rpcFunction = 'get_weekly_habit_completion_summary';
        dateField = 'week_start_date';
        daysOrMonths = Math.ceil(parseInt(habitRange) / 7); // Convert days to weeks
      } else { // monthly
        rpcFunction = 'get_monthly_habit_completion_summary';
        dateField = 'month_start_date';
        daysOrMonths = Math.ceil(parseInt(habitRange) / 30); // Convert days to months
      }

      const { data, error } = await supabase.rpc(rpcFunction, {
        p_user_id: userId,
        p_days: daysOrMonths, // This parameter name is used for both days/weeks/months in the RPCs
      });
      if (error) throw error;
      return data.map(d => ({
        date: format(parseISO(d[dateField]), habitGoalType === 'monthly' ? 'MMM yyyy' : 'MMM dd'),
        completion_percentage: d.completion_percentage,
      }));
    },
    enabled: !!userId && !isDemo,
  });

  const { analyticsData: sleepAnalyticsData, loading: sleepLoading } = useSleepAnalytics({
    startDate: getStartDate(taskRange), // Reusing taskRange for sleep analytics for simplicity
    endDate: new Date(),
    userId,
  });

  const CustomTaskTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-3 rounded-md shadow-lg border text-sm">
          <p className="font-semibold">{label}</p>
          <p className="text-muted-foreground">Completed Tasks: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  const CustomHabitTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-3 rounded-md shadow-lg border text-sm">
          <p className="font-semibold">{label}</p>
          <p className="text-muted-foreground">Completion: {payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  const CustomSleepTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card p-3 rounded-md shadow-lg border text-sm">
          <p className="font-semibold">{label}</p>
          <p className="text-muted-foreground">Total Sleep: {Math.floor(data.totalSleepMinutes / 60)}h {data.totalSleepMinutes % 60}m</p>
          <p className="text-muted-foreground">Efficiency: {data.sleepEfficiency}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6 container mx-auto max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-primary" /> Analytics
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Task Completion */}
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Task Completion
            </CardTitle>
            <Select value={taskRange} onValueChange={setTaskRange}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="180">Last 180 Days</SelectItem>
                <SelectItem value="365">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="pt-0 h-64">
            {taskLoading ? (
              <Skeleton className="h-full w-full" />
            ) : taskCompletionData?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No task completion data for this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={taskCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis label={{ value: 'Tasks Completed', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} />
                  <Tooltip content={<CustomTaskTooltip />} />
                  <Line type="monotone" dataKey="completed_tasks_count" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Habit Completion */}
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" /> Habit Completion
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={habitGoalType} onValueChange={setHabitGoalType}>
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <Select value={habitRange} onValueChange={setHabitRange}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="180">Last 180 Days</SelectItem>
                  <SelectItem value="365">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-0 h-64">
            {habitLoading ? (
              <Skeleton className="h-full w-full" />
            ) : habitCompletionData?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No habit completion data for this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={habitCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis domain={[0, 100]} label={{ value: 'Completion (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} />
                  <Tooltip content={<CustomHabitTooltip />} />
                  <Line type="monotone" dataKey="completion_percentage" stroke="#82ca9d" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Sleep Analytics */}
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Moon className="h-5 w-5 text-primary" /> Sleep Overview
            </CardTitle>
            <Select value={taskRange} onValueChange={setTaskRange}> {/* Reusing taskRange for consistency */}
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="180">Last 180 Days</SelectItem>
                <SelectItem value="365">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="pt-0 h-64">
            {sleepLoading ? (
              <Skeleton className="h-full w-full" />
            ) : sleepAnalyticsData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No sleep data for this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sleepAnalyticsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" label={{ value: 'Sleep (min)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: 'Efficiency (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }} />
                  <Tooltip content={<CustomSleepTooltip />} />
                  <Line yAxisId="left" type="monotone" dataKey="totalSleepMinutes" stroke="#8884d8" name="Total Sleep" />
                  <Line yAxisId="right" type="monotone" dataKey="sleepEfficiency" stroke="#82ca9d" name="Sleep Efficiency" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Analytics;