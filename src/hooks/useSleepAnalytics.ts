import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError } from '@/utils/toast';
import { format, parseISO, differenceInMinutes, addMinutes, isValid, startOfDay, endOfDay, getHours, getMinutes } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

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
  lightsOffTimeValue: number | null; // For charting
  wakeUpTimeValue: number | null; // For charting
  getOutOfBedTimeValue: number | null; // For charting
}

interface UseSleepAnalyticsProps {
  startDate: Date;
  endDate: Date;
  userId?: string;
}

export const useSleepAnalytics = ({ startDate, endDate, userId: propUserId }: UseSleepAnalyticsProps) => {
  const { user } = useAuth();
  const userId = propUserId || user?.id;

  const startOfRange = format(startOfDay(startDate), 'yyyy-MM-dd');
  const endOfRange = format(endOfDay(endDate), 'yyyy-MM-dd');

  const { data: rawRecords = [], isLoading: loading, error } = useQuery<SleepRecord[], Error>({
    queryKey: ['sleepAnalytics', userId, startOfRange, endOfRange],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startOfRange)
        .lte('date', endOfRange)
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (error) {
      console.error('Error fetching sleep analytics:', error.message);
      showError('Failed to load sleep analytics.');
    }
  }, [error]);

  const analyticsData = useMemo(() => {
    // Filter out incomplete records before processing
    const validRecords = (rawRecords || []).filter(record => {
      return record.bed_time && record.lights_off_time && record.wake_up_time && record.get_out_of_bed_time;
    });

    const processedData: SleepAnalyticsData[] = validRecords.map(record => {
      const recordDate = parseISO(record.date);
      
      // Parse times, handling overnight logic for bed_time and lights_off_time
      let bedTime = parseISO(`${record.date}T${record.bed_time}`);
      if (bedTime.getHours() >= 12) { // If bed time is 12 PM or later, it's for the previous calendar day's sleep record
          bedTime = addMinutes(bedTime, -1440); // Subtract 24 hours
      }
      
      let lightsOffTime = parseISO(`${record.date}T${record.lights_off_time}`);
      if (lightsOffTime.getHours() >= 12) { // Same logic for lights off time
          lightsOffTime = addMinutes(lightsOffTime, -1440);
      }

      const wakeUpTime = parseISO(`${record.date}T${record.wake_up_time}`);
      const getOutOfBedTime = parseISO(`${record.date}T${record.get_out_of_bed_time}`);
      const plannedWakeUpTime = record.planned_wake_up_time ? parseISO(`${record.date}T${record.planned_wake_up_time}`) : null;

      let timeInBedMinutes = 0;
      if (bedTime && getOutOfBedTime && isValid(bedTime) && isValid(getOutOfBedTime)) {
        timeInBedMinutes = differenceInMinutes(getOutOfBedTime, bedTime);
      }

      const timeToFallAsleepMinutes = record.time_to_fall_asleep_minutes ?? 0;
      const sleepInterruptionsDurationMinutes = record.sleep_interruptions_duration_minutes ?? 0;
      const sleepInterruptionsCount = record.sleep_interruptions_count ?? 0;

      let totalSleepMinutes = 0;
      if (wakeUpTime && lightsOffTime && isValid(wakeUpTime) && isValid(lightsOffTime)) {
        totalSleepMinutes = differenceInMinutes(wakeUpTime, lightsOffTime) - sleepInterruptionsDurationMinutes;
      }

      let sleepEfficiency = 0;
      if (timeInBedMinutes > 0) {
        sleepEfficiency = (totalSleepMinutes / timeInBedMinutes) * 100;
      }

      let wakeUpVarianceMinutes = 0;
      if (plannedWakeUpTime && wakeUpTime && isValid(plannedWakeUpTime) && isValid(wakeUpTime)) {
        wakeUpVarianceMinutes = differenceInMinutes(wakeUpTime, plannedWakeUpTime);
      }

      // Normalize times for charting (e.g., 6 PM as -6, midnight as 0, 6 AM as 6, 12 PM as 12)
      const normalizeTimeForChart = (time: Date | null) => {
          if (!time || !isValid(time)) return null;
          let hours = getHours(time);
          const minutes = getMinutes(time);
          if (hours >= 18) hours -= 24; // Times from 6 PM to midnight become -6 to 0
          return hours + minutes / 60;
      };

      return {
        date: format(recordDate, 'MMM dd'),
        totalSleepMinutes: Math.max(0, totalSleepMinutes),
        timeInBedMinutes: Math.max(0, timeInBedMinutes),
        timeToFallAsleepMinutes: Math.max(0, timeToFallAsleepMinutes),
        sleepEfficiency: Math.min(100, Math.max(0, Math.round(sleepEfficiency))),
        sleepInterruptionsCount: Math.max(0, sleepInterruptionsCount),
        sleepInterruptionsDurationMinutes: Math.max(0, sleepInterruptionsDurationMinutes),
        wakeUpVarianceMinutes: wakeUpVarianceMinutes,
        bedTimeValue: normalizeTimeForChart(bedTime),
        lightsOffTimeValue: normalizeTimeForChart(lightsOffTime),
        wakeUpTimeValue: normalizeTimeForChart(wakeUpTime),
        getOutOfBedTimeValue: normalizeTimeForChart(getOutOfBedTime),
      };
    });
    return processedData;
  }, [rawRecords]);

  return { analyticsData, loading };
};