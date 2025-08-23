import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useSleepAnalytics } from '@/hooks/useSleepAnalytics';
import { SleepAnalyticsData, SleepDashboardProps } from '@/types';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SleepDashboard: React.FC<SleepDashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const { sleepAnalytics, isLoading, error } = useSleepAnalytics(
    dateRange?.from || startOfMonth(new Date()),
    dateRange?.to || new Date(),
    currentUserId
  );

  if (isLoading || authLoading) return <p>Loading sleep analytics...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!sleepAnalytics) return <p>No sleep data available for the selected period.</p>;

  const data = [
    { name: 'Total Sleep (hrs)', value: sleepAnalytics.totalSleepDuration / 60 },
    { name: 'Avg Sleep (hrs)', value: sleepAnalytics.averageSleepDuration / 60 },
    { name: 'Efficiency (%)', value: sleepAnalytics.sleepEfficiency },
    { name: 'Bed Time Consistency (%)', value: sleepAnalytics.bedTimeConsistency },
    { name: 'Wake Up Consistency (%)', value: sleepAnalytics.wakeUpTimeConsistency },
    { name: 'Avg Time to Fall Asleep (min)', value: sleepAnalytics.timeToFallAsleep },
    { name: 'Total Interruptions', value: sleepAnalytics.sleepInterruptions },
  ];

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Sleep Dashboard</h1>

      <div className="mb-6">
        <DateRangePicker
          dateRange={dateRange}
          setDateRange={setDateRange}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Sleep Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{ (sleepAnalytics.totalSleepDuration / 60).toFixed(1) } hrs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average Sleep Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{ (sleepAnalytics.averageSleepDuration / 60).toFixed(1) } hrs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sleep Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{ sleepAnalytics.sleepEfficiency.toFixed(1) }%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bed Time Consistency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{ sleepAnalytics.bedTimeConsistency.toFixed(1) }%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Wake Up Consistency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{ sleepAnalytics.wakeUpTimeConsistency.toFixed(1) }%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg Time to Fall Asleep</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{ sleepAnalytics.timeToFallAsleep.toFixed(1) } min</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sleep Metrics Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(1) : value} />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default SleepDashboard;