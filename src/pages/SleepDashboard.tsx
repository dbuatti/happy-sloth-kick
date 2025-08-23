import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useSleepAnalytics } from '@/hooks/useSleepAnalytics';
import { SleepDashboardProps } from '@/types';
import { useAuth } from '@/context/AuthContext';

const SleepDashboard: React.FC<SleepDashboardProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const defaultMonth = startOfMonth(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: defaultMonth,
    to: endOfMonth(defaultMonth),
  });

  const { sleepAnalytics, isLoading, error } = useSleepAnalytics({
    userId: currentUserId,
    startDate: dateRange?.from,
    endDate: dateRange?.to,
  });

  if (authLoading || isLoading) {
    return <div className="p-4 text-center">Loading sleep dashboard...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading sleep analytics: {error.message}</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Sleep Dashboard</h2>
        <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Sleep Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sleepAnalytics?.averageSleepDuration ? `${(sleepAnalytics.averageSleepDuration / 60).toFixed(1)} hours` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {sleepAnalytics?.totalSleepDuration ? `${(sleepAnalytics.totalSleepDuration / 60).toFixed(1)} hours` : 'N/A'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sleep Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sleepAnalytics?.sleepEfficiency ? `${sleepAnalytics.sleepEfficiency.toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on recorded data
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time to Fall Asleep</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sleepAnalytics?.timeToFallAsleep ? `${sleepAnalytics.timeToFallAsleep.toFixed(0)} min` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average duration
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Sleep Interruptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sleepAnalytics?.sleepInterruptions ? `${sleepAnalytics.sleepInterruptions.toFixed(1)} times` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average count per night
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sleep Records</CardTitle>
        </CardHeader>
        <CardContent>
          {sleepAnalytics?.records && sleepAnalytics.records.length > 0 ? (
            <div className="space-y-2">
              {sleepAnalytics.records.map(record => (
                <div key={record.id} className="p-3 border rounded-md">
                  <p className="font-medium">{format(new Date(record.date), 'PPP')}</p>
                  <p className="text-sm text-muted-foreground">
                    Bed: {record.bed_time || 'N/A'} | Lights Off: {record.lights_off_time || 'N/A'} | Wake Up: {record.wake_up_time || 'N/A'} | Get Out: {record.get_out_of_bed_time || 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fall Asleep: {record.time_to_fall_asleep_minutes || 0} min | Interruptions: {record.sleep_interruptions_count || 0} ({record.sleep_interruptions_duration_minutes || 0} min)
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No sleep records for the selected period.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SleepDashboard;