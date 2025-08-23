import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { SleepRecord } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, differenceInMinutes, addDays, subDays } from 'date-fns';

interface SleepAnalyticsData {
  date: string;
  totalSleepMinutes: number;
  timeInBedMinutes: number;
  sleepEfficiency: number; // (totalSleepMinutes / timeInBedMinutes) * 100
  sleepLatencyMinutes: number | null; // Time to fall asleep
  interruptionsCount: number | null;
  interruptionsDurationMinutes: number | null;
  timesLeftBedCount: number | null;
}

const fetchSleepRecordsForAnalytics = async (userId: string, startOfRange: string, endOfRange: string): Promise<SleepRecord[]> => {
  const { data, error } = await supabase
    .from('sleep_records')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startOfRange)
    .lte('date', endOfRange)
    .order('date', { ascending: true });
  if (error) throw error;
  return data as SleepRecord[];
};

export const useSleepAnalytics = (startDate: Date, endDate: Date) => {
  const { userId, isLoading: authLoading } = useAuth();

  const startOfRange = format(startDate, 'yyyy-MM-dd');
  const endOfRange = format(endDate, 'yyyy-MM-dd');

  const { data: rawRecords, isLoading, error } = useQuery<SleepRecord[], Error>({
    queryKey: ['sleepAnalytics', userId, startOfRange, endOfRange],
    queryFn: async () => {
      if (!userId) return [];
      return fetchSleepRecordsForAnalytics(userId, startOfRange, endOfRange);
    },
    enabled: !!userId && !authLoading,
  });

  const analyticsData = useMemo(() => {
    // Filter out incomplete records before processing
    const validRecords = (rawRecords || []).filter((record: SleepRecord) => {
      return record.bed_time && record.lights_off_time && record.wake_up_time && record.get_out_of_bed_time;
    });

    const processedData: SleepAnalyticsData[] = validRecords.map((record: SleepRecord) => {
      const recordDate = parseISO(record.date);

      // Handle overnight sleep: if wake_up_time is earlier than bed_time, assume it's the next day
      let bedTime = moment(`${record.date}T${record.bed_time}`);
      let lightsOffTime = moment(`${record.date}T${record.lights_off_time}`);
      let wakeUpTime = moment(`${record.date}T${record.wake_up_time}`);
      let getOutOfBedTime = moment(`${record.date}T${record.get_out_of_bed_time}`);

      if (wakeUpTime.isBefore(bedTime)) {
        wakeUpTime = wakeUpTime.add(1, 'day');
      }
      if (getOutOfBedTime.isBefore(bedTime)) {
        getOutOfBedTime = getOutOfBedTime.add(1, 'day');
      }
      if (lightsOffTime.isBefore(bedTime)) {
        lightsOffTime = lightsOffTime.add(1, 'day');
      }

      const timeInBedMinutes = differenceInMinutes(getOutOfBedTime.toDate(), bedTime.toDate());
      const totalSleepMinutes = differenceInMinutes(wakeUpTime.toDate(), lightsOffTime.toDate()) - (record.sleep_interruptions_duration_minutes || 0);
      const sleepEfficiency = timeInBedMinutes > 0 ? (totalSleepMinutes / timeInBedMinutes) * 100 : 0;

      return {
        date: record.date,
        totalSleepMinutes: Math.max(0, totalSleepMinutes),
        timeInBedMinutes: Math.max(0, timeInBedMinutes),
        sleepEfficiency: Math.max(0, Math.min(100, sleepEfficiency)),
        sleepLatencyMinutes: record.time_to_fall_asleep_minutes,
        interruptionsCount: record.sleep_interruptions_count,
        interruptionsDurationMinutes: record.sleep_interruptions_duration_minutes,
        timesLeftBedCount: record.times_left_bed_count,
      };
    });

    return processedData;
  }, [rawRecords]);

  return {
    analyticsData,
    isLoading,
    error,
  };
};