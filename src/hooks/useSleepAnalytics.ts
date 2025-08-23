import { useAuth } from '@/context/AuthContext';
import { SleepRecord, SleepAnalyticsData } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseISO, differenceInMinutes, addMinutes, isBefore, isValid, isAfter } from 'date-fns';

interface UseSleepAnalyticsProps {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export const useSleepAnalytics = ({ userId: propUserId, startDate, endDate }: UseSleepAnalyticsProps) => {
  const { user } = useAuth();
  const currentUserId = propUserId || user?.id;

  const formattedStartDate = startDate ? startDate.toISOString().split('T')[0] : undefined;
  const formattedEndDate = endDate ? endDate.toISOString().split('T')[0] : undefined;

  const { data: sleepAnalytics, isLoading, error } = useQuery<SleepAnalyticsData, Error>({
    queryKey: ['sleepAnalytics', currentUserId, formattedStartDate, formattedEndDate],
    queryFn: async () => {
      if (!currentUserId) throw new Error('User not authenticated');

      let query = supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', currentUserId);

      if (formattedStartDate) {
        query = query.gte('date', formattedStartDate);
      }
      if (formattedEndDate) {
        query = query.lte('date', formattedEndDate);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;

      const records = data as SleepRecord[];

      let totalSleepDuration = 0;
      let totalTimeToFallAsleep = 0;
      let totalInterruptionsCount = 0;
      let totalInterruptionsDuration = 0;
      let validRecordsCount = 0;

      records.forEach(record => {
        const bedTime = record.bed_time ? parseISO(`2000-01-01T${record.bed_time}`) : null;
        const lightsOffTime = record.lights_off_time ? parseISO(`2000-01-01T${record.lights_off_time}`) : null;
        const wakeUpTime = record.wake_up_time ? parseISO(`2000-01-01T${record.wake_up_time}`) : null;
        const getOutOfBedTime = record.get_out_of_bed_time ? parseISO(`2000-01-01T${record.get_out_of_bed_time}`) : null;

        if (bedTime && wakeUpTime && isValid(bedTime) && isValid(wakeUpTime)) {
          let adjustedWakeUpTime = wakeUpTime;
          if (isBefore(adjustedWakeUpTime, bedTime)) {
            adjustedWakeUpTime = addMinutes(adjustedWakeUpTime, 24 * 60);
          }
          totalSleepDuration += differenceInMinutes(adjustedWakeUpTime, bedTime);
          validRecordsCount++;
        }

        if (bedTime && getOutOfBedTime && isValid(bedTime) && isValid(getOutOfBedTime)) {
          let adjustedGetOutOfBedTime = getOutOfBedTime;
          if (isBefore(adjustedGetOutOfBedTime, bedTime)) {
            adjustedGetOutOfBedTime = addMinutes(adjustedGetOutOfBedTime, 24 * 60);
          }
          // This is just for calculation, not directly used in totalSleepDuration
        }

        totalTimeToFallAsleep += record.time_to_fall_asleep_minutes || 0;
        totalInterruptionsCount += record.sleep_interruptions_count || 0;
        totalInterruptionsDuration += record.sleep_interruptions_duration_minutes || 0;
      });

      const averageSleepDuration = validRecordsCount > 0 ? totalSleepDuration / validRecordsCount : 0;
      const averageTimeToFallAsleep = validRecordsCount > 0 ? totalTimeToFallAsleep / validRecordsCount : 0;
      const averageInterruptions = validRecordsCount > 0 ? totalInterruptionsCount / validRecordsCount : 0;

      // Simplified sleep efficiency calculation (can be more complex)
      const sleepEfficiency = validRecordsCount > 0 ? (averageSleepDuration / (averageSleepDuration + averageTimeToFallAsleep + averageInterruptions)) * 100 : 0;

      return {
        totalSleepDuration,
        averageSleepDuration,
        sleepEfficiency,
        timeToFallAsleep: averageTimeToFallAsleep,
        sleepInterruptions: averageInterruptions,
        records,
      };
    },
    enabled: !!currentUserId,
  });

  return {
    sleepAnalytics,
    isLoading,
    error,
  };
};