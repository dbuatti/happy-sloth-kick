import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, CheckCircle2, Flame, Moon } from 'lucide-react'; // Removed Clock, Target
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, parseISO } from 'date-fns'; // Removed startOfMonth, subMonths, startOfWeek, subWeeks, endOfDay
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalyticsProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Analytics: React.FC<AnalyticsProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [daysToDisplay, setDaysToDisplay] = useState(30);
  const [habitGoalType, setHabitGoalType] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Daily Task Completion Summary
  const { data: dailyTaskCompletionData = [], isLoading: dailyTaskLoading } = useQuery({
    queryKey: ['dailyTaskCompletion', userId, daysToDisplay],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc('get_daily_task_completion_summary', {
        p_user_id: userId,
        p_days: daysToDisplay,
      });
      if (error) throw error;
      return data.map((d: any) => ({
        date: format(parseISO(d.completion_date), 'MMM dd'),
        completed_tasks_count: d.completed_tasks_count,
      }));
    },
    enabled: !!userId,
  });

  // Habit Completion Summary
  const { data: habitCompletionData = [], isLoading: habitCompletionLoading } = useQuery({
    queryKey: ['habitCompletion', userId, daysToDisplay, habitGoalType],
    queryFn: async () => {
      if (!userId) return [];
      let rpcFunction;
      let dateField;
      switch (habitGoalType) {
        case 'daily':
          rpcFunction = 'get_daily_habit_completion_summary';
          dateField = 'completion_date';
          break;
        case 'weekly':
          rpcFunction = 'get_weekly_habit_completion_summary';
          dateField = 'week_start_date';
          break;
        case 'monthly':
          rpcFunction = 'get_monthly_habit_completion_summary';
          dateField = 'month_start_date';
          break;
        default:
          return [];
      }

      const { data, error } = await supabase.rpc(rpcFunction, {
        p_user_id: userId,
        p_days: daysToDisplay,
      });
      if (error) throw error;
      return data.map((d: any) => ({
        date: format(parseISO(d[dateField]), habitGoalType === 'monthly' ? 'MMM yyyy' : 'MMM dd'),
        completion_percentage: d.completion_percentage,
      }));
    },
    enabled: !!userId,
  });

  // Sleep Summary
  const { data: sleepSummaryData = [], isLoading: sleepSummaryLoading } = useQuery({
    queryKey: ['dailySleepSummary', userId, daysToDisplay],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc('get_daily_sleep_summary', {
        p_user_id: userId,
        p_days: daysToDisplay,
      });
      if (error) throw error;
      return data.map((d: any) => ({
        date: format(parseISO(d.record_date), 'MMM dd'),
        total_sleep_minutes: d.total_sleep_minutes,
        sleep_efficiency: d.sleep_efficiency,
      }));
    },
    enabled: !!userId,
  });

  const loading = dailyTaskLoading || habitCompletionLoading || sleepSummaryLoading;

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-center mb-8">
          <BarChart3 className="inline-block h-10 w-10 mr-3 text-primary" /> Analytics
        </h1>

        <div className="flex justify-end mb-4">
          <Select value={String(daysToDisplay)} onValueChange={(value) => setDaysToDisplay(Number(value))}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="180">Last 180 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Daily Task Completion */}
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Daily Task Completion
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-0">
            {dailyTaskLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTaskCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs text-muted-foreground" />
                  <YAxis className="text-xs text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius-md)' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line type="monotone" dataKey="completed_tasks_count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Habit Completion */}
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" /> Habit Completion
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={habitGoalType} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setHabitGoalType(value)}>
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="h-64 pt-0">
            {habitCompletionLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={habitCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs text-muted-foreground" />
                  <YAxis unit="%" domain={[0, 100]} className="text-xs text-muted-foreground" />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, 'Completion']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius-md)' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line type="monotone" dataKey="completion_percentage" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Sleep Summary */}
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Moon className="h-5 w-5 text-blue-500" /> Daily Sleep Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-0">
            {sleepSummaryLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sleepSummaryData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs text-muted-foreground" />
                  <YAxis yAxisId="left" label={{ value: 'Minutes', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))' } }} className="text-xs text-muted-foreground" />
                  <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 100]} label={{ value: 'Efficiency', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))' } }} className="text-xs text-muted-foreground" />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'total_sleep_minutes') return [`${value} min`, 'Total Sleep'];
                      if (name === 'sleep_efficiency') return [`${value}%`, 'Efficiency'];
                      return [value, name];
                    }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius-md)' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="total_sleep_minutes" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Total Sleep" />
                  <Line yAxisId="right" type="monotone" dataKey="sleep_efficiency" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Sleep Efficiency" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;