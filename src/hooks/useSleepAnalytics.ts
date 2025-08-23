import { useMemo } from 'react'; // Added useMemo
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext'; // Corrected import path for useAuth
import { SleepRecord, SleepAnalyticsData } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns'; // Removed unused imports
import moment from 'moment'; // Import moment

export const useSleepAnalytics = (startDate: Date, endDate: Date) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const { data: sleepRecords, isLoading, error } = useQuery<SleepRecord[], Error>({
    queryKey: ['sleepAnalytics', userId, startDate, endDate],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', userId)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!userId && !authLoading,
  });

  const analyticsData = useMemo(() => {
    if (!sleepRecords || sleepRecords.length === 0) return [];

    const validRecords = sleepRecords.filter(record =>
      record.bed_time && record.lights_off_time && record.wake_up_time && record.get_out_of_bed_time
    );

    const processedData: SleepAnalyticsData[] = validRecords.map((record: SleepRecord) => {
      // Handle overnight sleep: if wake_up_time is earlier than bed_time, assume it's the next day
      let bedTime = moment(`${record.date}T${record.bed_time}`);
      let lightsOffTime = moment(`${record.date}T${record.lights_off_time}`);
      let wakeUpTime = moment(`${record.date}T${record.wake_up_time}`);
      let getOutOfBedTime = moment(`${record.date}T${record.get_out_of_bed_time}`);

      if (wakeUpTime.isBefore(bedTime)) {
        wakeUpTime = wakeUpTime.add(1, 'day');
        getOutOfBedTime = getOutOfBedTime.add(1, 'day');
      }
      if (lightsOffTime.isBefore(bedTime)) {
        lightsOffTime = lightsOffTime.add(1, 'day');
      }

      const timeInBedMinutes = getOutOfBedTime.diff(bedTime, 'minutes');
      const totalSleepMinutes = wakeUpTime.diff(lightsOffTime, 'minutes') - (record.sleep_interruptions_duration_minutes || 0);
      const sleepEfficiency = timeInBedMinutes > 0 ? (totalSleepMinutes / timeInBedMinutes) * 100 : 0;

      return {
        date: record.date,
        totalSleepMinutes: totalSleepMinutes,
        timeInBedMinutes: timeInBedMinutes,
        sleepEfficiency: parseFloat(sleepEfficiency.toFixed(2)),
        timeToFallAsleep: record.time_to_fall_asleep_minutes || 0,
        interruptionsCount: record.sleep_interruptions_count || 0,
        interruptionsDurationMinutes: record.sleep_interruptions_duration_minutes || 0,
      };
    });

    return processedData;
  }, [sleepRecords]);

  return { analyticsData, isLoading, error };
};