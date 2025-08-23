import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'; // Added parseISO
import { DateRange } from 'react-day-picker'; // Keep DateRange import
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSleepAnalytics } from '@/hooks/useSleepAnalytics';
import { SleepAnalyticsData, SleepDashboardProps } from '@/types';
import { DateRangePicker } from '@/components/ui/date-range-picker'; // Added DateRangePicker import

const SleepDashboard: React.FC<SleepDashboardProps> = ({ dateRange, setDateRange }) => {
  const { analyticsData, isLoading, error } = useSleepAnalytics(
    dateRange?.from || startOfMonth(new Date()),
    dateRange?.to || endOfMonth(new Date())
  );

  const summaryData = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) {
      return {
        avgTotalSleep: 0,
        avgTimeInBed: 0,
        avgSleepEfficiency: 0,
        avgTimeToFallAsleep: 0,
        avgInterruptionsCount: 0,
        avgInterruptionsDuration: 0,
      };
    }

    const totalSleepSum = analyticsData.reduce((sum: number, d: SleepAnalyticsData) => sum + d.totalSleepMinutes, 0);
    const timeInBedSum = analyticsData.reduce((sum: number, d: SleepAnalyticsData) => sum + d.timeInBedMinutes, 0);
    const timeToFallAsleepSum = analyticsData.reduce((sum: number, d: SleepAnalyticsData) => sum + d.timeToFallAsleep, 0);
    const sleepEfficiencySum = analyticsData.reduce((sum: number, d: SleepAnalyticsData) => sum + d.sleepEfficiency, 0);
    const interruptionsCountSum = analyticsData.reduce((sum: number, d: SleepAnalyticsData) => sum + d.interruptionsCount, 0);
    const interruptionsDurationSum = analyticsData.reduce((sum: number, d: SleepAnalyticsData) => sum + d.interruptionsDurationMinutes, 0);

    const count = analyticsData.length;

    return {
      avgTotalSleep: parseFloat((totalSleepSum / count).toFixed(2)),
      avgTimeInBed: parseFloat((timeInBedSum / count).toFixed(2)),
      avgSleepEfficiency: parseFloat((sleepEfficiencySum / count).toFixed(2)),
      avgTimeToFallAsleep: parseFloat((timeToFallAsleepSum / count).toFixed(2)),
      avgInterruptionsCount: parseFloat((interruptionsCountSum / count).toFixed(2)),
      avgInterruptionsDuration: parseFloat((interruptionsDurationSum / count).toFixed(2)),
    };
  }, [analyticsData]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading sleep data...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-full text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Sleep Dashboard</h1>

      <div className="mb-6 flex justify-end">
        <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Avg. Total Sleep</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{summaryData.avgTotalSleep} min</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg. Time in Bed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{summaryData.avgTimeInBed} min</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg. Sleep Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{summaryData.avgSleepEfficiency}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg. Time to Fall Asleep</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{summaryData.avgTimeToFallAsleep} min</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg. Interruptions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{summaryData.avgInterruptionsCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg. Interruption Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{summaryData.avgInterruptionsDuration} min</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Daily Sleep Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(dateStr) => format(parseISO(dateStr), 'MMM d')} />
                <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: number) => `${value} min`} />
                <Legend />
                <Bar dataKey="totalSleepMinutes" fill="#8884d8" name="Total Sleep" />
                <Bar dataKey="timeInBedMinutes" fill="#82ca9d" name="Time in Bed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sleep Efficiency & Interruptions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(dateStr) => format(parseISO(dateStr), 'MMM d')} />
                <YAxis yAxisId="left" label={{ value: 'Efficiency (%)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Count/Minutes', angle: 90, position: 'insideRight' }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="sleepEfficiency" stroke="#8884d8" name="Efficiency" />
                <Line yAxisId="right" type="monotone" dataKey="interruptionsCount" stroke="#ffc658" name="Interruptions Count" />
                <Line yAxisId="right" type="monotone" dataKey="interruptionsDurationMinutes" stroke="#ff7300" name="Interruptions Duration" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SleepDashboard;