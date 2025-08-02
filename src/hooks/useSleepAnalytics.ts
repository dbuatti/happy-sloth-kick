import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError } from '@/utils/toast';
import { format, parseISO, differenceInMinutes, addMinutes, isValid, startOfDay, endOfDay } from 'date-fns';

export interface SleepRecord {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  bed_time: string | null; // HH:MM:SS
  lights_off_time: string | null; // HH:MM:SS
  wake_up_time: string | null; // HH:MM:SS
  get_out_of_bed_time: string | null; // HH:MM:SS
  created_at: string;
  updated_at: string;
}

interface SleepAnalyticsData {
  date: string; // Formatted date for display
  totalSleepMinutes: number;
  timeInBedMinutes: number;
  timeToFallAsleepMinutes: number;
  sleepEfficiency: number; // Percentage
}

interface UseSleepAnalyticsProps {
  startDate: Date;
  endDate: Date;
}

export const useSleepAnalytics = ({ startDate, endDate }: UseSleepAnalyticsProps) => {
  const { user } = useAuth();
  const userId = user?.id;
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

      console.log(`useSleepAnalytics: Fetching records for user ${userId} from ${startOfRange} to ${endOfRange}`);

      const { data, error } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startOfRange)
        .lte('date', endOfRange)
        .order('date', { ascending: true });

      if (error) throw error;

      console.log('useSleepAnalytics: Raw data fetched:', data);

      const processedData: SleepAnalyticsData[] = (data || []).map(record => {
        const recordDate = parseISO(record.date);
        
        let bedTime: Date | null = null;
        let lightsOffTime: Date | null = null;
        let wakeUpTime: Date | null = null;
        let getOutOfBedTime: Date | null = null;

        // Parse times, handling potential overnight sleep (bed_time/lights_off_time might be on previous day)
        if (record.bed_time) {
          bedTime = parseISO(`${record.date}T${record.bed_time}`);
          // If bed time is after midnight but record date is for the next day, adjust bed time to previous day
          if (bedTime.getHours() >= 12 && bedTime.getHours() <= 23) { // Assuming bedtime is usually in the evening
            bedTime = addMinutes(bedTime, -1440); // Subtract 24 hours
          }
        }
        if (record.lights_off_time) {
          lightsOffTime = parseISO(`${record.date}T${record.lights_off_time}`);
          if (lightsOffTime.getHours() >= 12 && lightsOffTime.getHours() <= 23) {
            lightsOffTime = addMinutes(lightsOffTime, -1440);
          }
        }
        if (record.wake_up_time) {
          wakeUpTime = parseISO(`${record.date}T${record.wake_up_time}`);
        }
        if (record.get_out_of_bed_time) {
          getOutOfBedTime = parseISO(`${record.date}T${record.get_out_of_bed_time}`);
        }

        let totalSleepMinutes = 0;
        let timeInBedMinutes = 0;
        let timeToFallAsleepMinutes = 0;
        let sleepEfficiency = 0;

        if (lightsOffTime && wakeUpTime && isValid(lightsOffTime) && isValid(wakeUpTime)) {
          totalSleepMinutes = differenceInMinutes(wakeUpTime, lightsOffTime);
        }
        if (bedTime && getOutOfBedTime && isValid(bedTime) && isValid(getOutOfBedTime)) {
          timeInBedMinutes = differenceInMinutes(getOutOfBedTime, bedTime);
        }
        if (bedTime && lightsOffTime && isValid(bedTime) && isValid(lightsOffTime)) {
          timeToFallAsleepMinutes = differenceInMinutes(lightsOffTime, bedTime);
        }

        if (timeInBedMinutes > 0) {
          sleepEfficiency = (totalSleepMinutes / timeInBedMinutes) * 100;
        }

        const result = {
          date: format(recordDate, 'MMM dd'),
          totalSleepMinutes: Math.max(0, totalSleepMinutes), // Ensure non-negative
          timeInBedMinutes: Math.max(0, timeInBedMinutes),
          timeToFallAsleepMinutes: Math.max(0, timeToFallAsleepMinutes),
          sleepEfficiency: Math.min(100, Math.max(0, Math.round(sleepEfficiency))), // Cap between 0-100
        };
        console.log(`useSleepAnalytics: Processed record for ${record.date}:`, result);
        return result;
      });
      setAnalyticsData(processedData);
    } catch (error: any) {
      console.error('useSleepAnalytics: Error fetching sleep analytics:', error.message);
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