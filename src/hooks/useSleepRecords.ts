import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  userId?: string;
}

export const useSleepRecords = ({ selectedDate, userId: propUserId }: UseSleepRecordsProps) => {
  const { user } = useAuth();
  const userId = propUserId || user?.id;
  const queryClient = useQueryClient();

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');

  const { data: sleepRecord = null, isLoading: loading, error } = useQuery<SleepRecord | null, Error>({
    queryKey: ['sleepRecord', userId, formattedDate],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', userId)
        .eq('date', formattedDate)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }
      return data || null;
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
  });

  useEffect(() => {
    if (error) {
      console.error('Error fetching sleep record:', error.message);
      showError('Failed to load sleep record.');
    }
  }, [error]);

  const saveSleepRecordMutation = useMutation<SleepRecord, Error, NewSleepRecordData>({
    mutationFn: async (dataToSave) => {
      if (!userId) throw new Error('User not authenticated.');
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
      return data;
    },
    onSuccess: (data) => {
      showSuccess('Sleep record saved!');
      queryClient.setQueryData(['sleepRecord', userId, formattedDate], data); // Update specific record
      queryClient.invalidateQueries({ queryKey: ['sleepDiary', userId] }); // Invalidate diary view
      queryClient.invalidateQueries({ queryKey: ['sleepAnalytics', userId] }); // Invalidate analytics
      queryClient.invalidateQueries({ queryKey: ['dailyBriefing', userId] }); // Invalidate daily briefing
    },
    onError: (err) => {
      console.error('Error saving sleep record:', err.message);
      showError('Failed to save sleep record.');
    },
  });

  return {
    sleepRecord,
    loading,
    isSaving: saveSleepRecordMutation.isPending,
    saveSleepRecord: saveSleepRecordMutation.mutateAsync,
  };
};