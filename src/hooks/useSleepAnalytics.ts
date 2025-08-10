import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError } from '@/utils/toast';
import { format, parseISO, differenceInMinutes, addMinutes, isValid, startOfDay, endOfDay, getHours, getMinutes } from 'date-fns';

export interface SleepRecord {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  bed_time: string | null; // HH:MM:SS
  lights_off_time: string | null; // HH:MM:SS
  wake_up_time: string | null; // HH:MM:SS
  get_out_of_bed_time: string | null; // HH:MM:SS
  time_to_fall_asleep_minutes: number | null; // New: How many minutes to fall asleep
  sleep_interruptions_count: number | null; // New: Number of interruptions
  sleep_interruptions_duration_minutes: number | null; // New: Duration of interruptions
  times_left_bed_count: number | null; // New: Times left bed
  planned_wake_up_time: string | null; // New: Planned wake up time (HH:MM:SS)
  created_at: string;
  updated_at: string;
}

interface SleepAnalyticsData {
  date: string; // Formatted date for display
  totalSleepMinutes: number;
  timeInBedMinutes: number;
  timeToFallAsleepMinutes: number;
  sleepEfficiency: number; // Percentage
  sleepInterruptionsCount: number;
  sleepInterruptionsDurationMinutes: number;
  wakeUpVarianceMinutes: number; // Difference between planned and actual wake up
  bedTimeValue: number | null; // For charting
  wakeUpTimeValue: number | null; // For charting
}

interface UseSleepAnalyticsProps {
  startDate: Date;
  endDate: Date;
  userId?: string;
}

export const useSleepAnalytics = ({ startDate, endDate, userId: propUserId }: UseSleepAnalyticsProps) => {
  const { user } = useAuth();
  const userId = propUserId || user?.id;
  const [analyticsData, setAnalyticsData] = useState<SleepAnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSleepAnalytics = useCallback(async () => {
    if (!userId) {
      setAnalyticsData([]);
      setLoading(false);
      console.log('useSleepAnalytics: No user ID, skipping fetch.');
      return;
    }
    setLoading(true);
    try {
      const startOfRange = format(startOfDay(startDate), 'yyyy-MM-dd');
      const endOfRange = format(endOfDay(endDate), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startOfRange)
        .lte('date', endOfRange)
        .order('date', { ascending: true });

      if (error) throw error;

      const processedData: SleepAnalyticsData[] = (data || []).map(record => {
        const recordDate = parseISO(record.date);
        
        let bedTime: Date | null = null;
        let wakeUpTime: Date | null = null;
        let getOutOfBedTime: Date | null = null;
        let plannedWakeUpTime: Date | null = null;

        if (record.bed_time) {
          bedTime = parseISO(`${record.date}T${record.bed_time}`);
          if (bedTime.getHours() >= 12) {
            bedTime = addMinutes(bedTime, -1440);
          }
        }
        if (record.wake_up_time) {
          wakeUpTime = parseISO(`${record.date}T${record.wake_up_time}`);
        }
        if (record.get_out_of_bed_time) {
          getOutOfBedTime = parseISO(`${record.date}T${record.get_out_of_bed_time}`);
        }
        if (record.planned_wake_up_time) {
          plannedWakeUpTime = parseISO(`${record.date}T${record.planned_wake_up_time}`);
        }

        let timeInBedMinutes = 0;
        if (bedTime && getOutOfBedTime && isValid(bedTime) && isValid(getOutOfBedTime)) {
          timeInBedMinutes = differenceInMinutes(getOutOfBedTime, bedTime);
        }

        const timeToFallAsleepMinutes = record.time_to_fall_asleep_minutes ?? 0;
        const sleepInterruptionsDurationMinutes = record.sleep_interruptions_duration_minutes ?? 0;
        const sleepInterruptionsCount = record.sleep_interruptions_count ?? 0;

        let totalSleepMinutes = 0;
        if (wakeUpTime && bedTime && isValid(wakeUpTime) && isValid(bedTime)) {
          const grossSleepPeriod = differenceInMinutes(wakeUpTime, bedTime);
          totalSleepMinutes = grossSleepPeriod - timeToFallAsleepMinutes - sleepInterruptionsDurationMinutes;
        }

        let sleepEfficiency = 0;
        if (timeInBedMinutes > 0) {
          sleepEfficiency = (totalSleepMinutes / timeInBedMinutes) * 100;
        }

        let wakeUpVarianceMinutes = 0;
        if (plannedWakeUpTime && wakeUpTime && isValid(plannedWakeUpTime) && isValid(wakeUpTime)) {
          wakeUpVarianceMinutes = differenceInMinutes(wakeUpTime, plannedWakeUpTime);
        }

        let bedTimeValue = null;
        if (bedTime && isValid(bedTime)) {
            let hours = getHours(bedTime);
            const minutes = getMinutes(bedTime);
            if (hours > 12) hours -= 24; // Represent PM times as negative hours from midnight
            bedTimeValue = hours + minutes / 60;
        }

        let wakeUpTimeValue = null;
        if (wakeUpTime && isValid(wakeUpTime)) {
            const hours = getHours(wakeUpTime);
            const minutes = getMinutes(wakeUpTime);
            wakeUpTimeValue = hours + minutes / 60;
        }

        return {
          date: format(recordDate, 'MMM dd'),
          totalSleepMinutes: Math.max(0, totalSleepMinutes),
          timeInBedMinutes: Math.max(0, timeInBedMinutes),
          timeToFallAsleepMinutes: Math.max(0, timeToFallAsleepMinutes),
          sleepEfficiency: Math.min(100, Math.max(0, Math.round(sleepEfficiency))),
          sleepInterruptionsCount: Math.max(0, sleepInterruptionsCount),
          sleepInterruptionsDurationMinutes: Math.max(0, sleepInterruptionsDurationMinutes),
          wakeUpVarianceMinutes: wakeUpVarianceMinutes,
          bedTimeValue,
          wakeUpTimeValue,
        };
      });
      setAnalyticsData(processedData);
    } catch (error: any) {
      console.error('Error fetching sleep analytics:', error.message);
      showError('Failed to load sleep analytics.');
    } finally {
      setLoading(false);
    }
  }, [userId, startDate, endDate]);

  useEffect(() => {
    fetchSleepAnalytics();
  }, [fetchSleepAnalytics]);

  return { analyticsData, loading, fetchSleepAnalytics };
};