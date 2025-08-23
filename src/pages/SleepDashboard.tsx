import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useSleepAnalytics } from '@/hooks/useSleepAnalytics';

interface SleepDashboardProps {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  isDemo?: boolean;
  demoUserId?: string;
}

const SleepDashboard: React.FC<SleepDashboardProps> = ({ dateRange, setDateRange, demoUserId }) => {
  const { analyticsData, isLoading, error } = useSleepAnalytics(
    dateRange?.from || startOfMonth(new Date()),
    dateRange?.to || endOfMonth(new Date())
  );

  const summaryData = useMemo(() => {
    if (analyticsData.length === 0) {
      return {
        avgTotalSleep: 0,
        avgTimeInBed: 0,
        avgSleepEfficiency: 0,
        avgSleepLatency: 0,
        avgInterruptionsCount: 0,
        avgInterruptionsDuration: 0,
        avgTimesLeftBed: 0,
      };
    }

    const totalSleepSum = analyticsData.reduce((sum, d) => sum + d.totalSleepMinutes, 0);
    const timeInBedSum = analyticsData.reduce((sum, d) => sum + d.timeInBedMinutes, 0);
    const sleepEfficiencySum = analyticsData.reduce((sum, d) => sum + d.sleepEfficiency, 0);
    const sleepLatencySum = analyticsData.reduce((sum, d) => sum + (d.sleepLatencyMinutes || 0), 0);
    const interruptionsCountSum = analyticsData.reduce((sum, d) => sum + (d.interruptionsCount || 0), 0);
    const interruptionsDurationSum = analyticsData.reduce((sum, d) => sum + (d.interruptionsDurationMinutes || 0), 0);
    const timesLeftBedSum = analyticsData.reduce((sum, d) => sum + (d.timesLeftBedCount || 0), 0);


    const count = analyticsData.length;

    return {
      avgTotalSleep: Math.round(totalSleepSum / count),
      avgTimeInBed: Math.round(timeInBedSum / count),
      avgSleepEfficiency: Math.round(sleepEfficiencySum / count),
      avgSleepLatency: Math.round(sleepLatencySum / count),
      avgInterruptionsCount: Math.round(interruptionsCountSum / count),
      avgInterruptionsDuration: Math.round(interruptionsDurationSum / count),
      avgTimesLeftBed: Math.round(timesLeftBedSum / count),
    };
  }, [analyticsData]);

  if (isLoading) return <div className="text-center py-8">Loading sleep data...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Avg. Total Sleep</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{Math.floor(summaryData.avgTotalSleep / 60)}h {summaryData.avgTotalSleep % 60}m</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg. Sleep Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summaryData.avgSleepEfficiency}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg. Sleep Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summaryData.avgSleepLatency} min</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Sleep Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(dateStr) => format(new Date(dateStr), 'MMM dd')} />
              <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value: number) => `${Math.floor(value / 60)}h ${value % 60}m`} />
              <Bar dataKey="totalSleepMinutes" fill="#8884d8" name="Total Sleep" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sleep Efficiency & Latency</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(dateStr) => format(new Date(dateStr), 'MMM dd')} />
              <YAxis yAxisId="left" label={{ value: 'Efficiency (%)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Latency (min)', angle: 90, position: 'insideRight' }} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="sleepEfficiency" stroke="#82ca9d" name="Efficiency" />
              <Line yAxisId="right" type="monotone" dataKey="sleepLatencyMinutes" stroke="#8884d8" name="Latency" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default SleepDashboard;