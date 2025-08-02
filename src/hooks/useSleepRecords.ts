import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { format } from 'date-fns';

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

export type NewSleepRecordData = Omit<SleepRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateSleepRecordData = Partial<NewSleepRecordData>;

interface UseSleepRecordsProps {
  selectedDate: Date;
}

export const useSleepRecords = ({ selectedDate }: UseSleepRecordsProps) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [sleepRecord, setSleepRecord] = useState<SleepRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');

  const fetchSleepRecord = useCallback(async () => {
    if (!userId) {
      setSleepRecord(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', userId)
        .eq('date', formattedDate)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }
      setSleepRecord(data || null);
    } catch (error: any) {
      console.error('Error fetching sleep record:', error.message);
      showError('Failed to load sleep record.');
    } finally {
      setLoading(false);
    }
  }, [userId, formattedDate]);

  useEffect(() => {
    fetchSleepRecord();
  }, [fetchSleepRecord]);

  const saveSleepRecord = useCallback(async (dataToSave: NewSleepRecordData) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    setLoading(true);
    try {
      const payload = {
        ...dataToSave,
        user_id: userId,
        date: formattedDate,
      };

      const { data, error } = await supabase
        .from('sleep_records')
        .upsert(payload, { onConflict: 'user_id, date' })
        .select()
        .single();

      if (error) throw error;
      setSleepRecord(data);
      showSuccess('Sleep record saved successfully!');
      return true;
    } catch (error: any) {
      console.error('Error saving sleep record:', error.message);
      showError('Failed to save sleep record.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, formattedDate]);

  return {
    sleepRecord,
    loading,
    saveSleepRecord,
    fetchSleepRecord,
  };
};