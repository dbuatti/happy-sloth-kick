import { useAuth } from '@/context/AuthContext';
import { SleepRecord, SleepAnalyticsData } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInMinutes, parseISO, isValid, startOfDay, endOfDay } from 'date-fns';

export const useSleepAnalytics = (startDate: Date, endDate: Date, userId?: string) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = userId || user?.id;

  const { data: sleepAnalytics, isLoading, error } = useQuery<SleepAnalyticsData, Error>({
    queryKey: ['sleepAnalytics', currentUserId, startDate, endDate],
    queryFn: async () => {
      if (!currentUserId) return {} as SleepAnalyticsData;

      const { data, error } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', currentUserId)
        .gte('date', startOfDay(startDate).toISOString().split('T')[0])
        .lte('date', endOfDay(endDate).toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      const records = data as SleepRecord[];

      if (records.length === 0) {
        return {
          totalSleepDuration: 0,
          averageSleepDuration: 0,
          sleepEfficiency: 0,
          bedTimeConsistency: 0,
          wakeUpTimeConsistency: 0,
          sleepInterruptions: 0,
          timeToFallAsleep: 0,
        };
      }

      let totalSleepDuration = 0;
      let totalTimeInBed = 0;
      let totalInterruptions = 0;
      let totalTimeToFallAsleep = 0;

      const bedTimes: Date[] = [];
      const wakeUpTimes: Date[] = [];

      records.forEach(record => {
        const bedTime = record.bed_time ? parseISO(`2000-01-01T${record.bed_time}`) : null;
        const lightsOffTime = record.lights_off_time ? parseISO(`2000-01-01T${record.lights_off_time}`) : null;
        const wakeUpTime = record.wake_up_time ? parseISO(`2000-01-01T${record.wake_up_time}`) : null;
        const getOutOfBedTime = record.get_out_of_bed_time ? parseISO(`2000-01-01T${record.get_out_of_bed_time}`) : null;

        if (bedTime && wakeUpTime && isValid(bedTime) && isValid(wakeUpTime)) {
          // Adjust wakeUpTime if it's on the next day (common for sleep tracking)
          let adjustedWakeUpTime = wakeUpTime;
          if (isBefore(adjustedWakeUpTime, bedTime)) {
            adjustedWakeUpTime = addMinutes(adjustedWakeUpTime, 24 * 60);
          }
          totalSleepDuration += differenceInMinutes(adjustedWakeUpTime, bedTime);
          bedTimes.push(bedTime);
          wakeUpTimes.push(adjustedWakeUpTime);
        }

        if (bedTime && getOutOfBedTime && isValid(bedTime) && isValid(getOutOfBedTime)) {
          let adjustedGetOutOfBedTime = getOutOfBedTime;
          if (isBefore(adjustedGetOutOfBedTime, bedTime)) {
            adjustedGetOutOfBedTime = addMinutes(adjustedGetOutOfBedTime, 24 * 60);
          }
          totalTimeInBed += differenceInMinutes(adjustedGetOutOfBedTime, bedTime);
        }

        if (record.sleep_interruptions_count) {
          totalInterruptions += record.sleep_interruptions_count;
        }
        if (record.time_to_fall_asleep_minutes) {
          totalTimeToFallAsleep += record.time_to_fall_asleep_minutes;
        }
      });

      const averageSleepDuration = records.length > 0 ? totalSleepDuration / records.length : 0;
      const sleepEfficiency = totalTimeInBed > 0 ? (totalSleepDuration / totalTimeInBed) * 100 : 0;

      // Consistency calculations (simplified for now)
      const bedTimeConsistency = bedTimes.length > 1 ? calculateTimeConsistency(bedTimes) : 100;
      const wakeUpTimeConsistency = wakeUpTimes.length > 1 ? calculateTimeConsistency(wakeUpTimes) : 100;

      return {
        totalSleepDuration,
        averageSleepDuration,
        sleepEfficiency,
        bedTimeConsistency,
        wakeUpTimeConsistency,
        sleepInterruptions: totalInterruptions,
        timeToFallAsleep: totalTimeToFallAsleep / records.length,
      };
    },
    enabled: !!currentUserId && !authLoading,
  });

  return {
    sleepAnalytics,
    isLoading,
    error,
  };
};

// Helper function to calculate time consistency (e.g., standard deviation of times)
const calculateTimeConsistency = (times: Date[]): number => {
  if (times.length < 2) return 100; // Perfectly consistent if only one or no entries

  const minutesOfDay = times.map(time => time.getHours() * 60 + time.getMinutes());
  const mean = minutesOfDay.reduce((sum, val) => sum + val, 0) / minutesOfDay.length;
  const variance = minutesOfDay.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / minutesOfDay.length;
  const stdDev = Math.sqrt(variance);

  // A simple way to convert stdDev to a "consistency score" (higher is better)
  // This is a heuristic and can be adjusted. Max stdDev for times is 12 hours * 60 min = 720 min
  const maxStdDev = 720;
  return Math.max(0, 100 - (stdDev / maxStdDev) * 100);
};