import { useCallback } from 'react'; // Kept useCallback as it's used
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { SleepRecord, NewSleepRecordData, UpdateSleepRecordData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

export const useSleepRecords = (date: Date) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const invalidateSleepRecordsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['sleepRecords', userId] });
    queryClient.invalidateQueries({ queryKey: ['sleepAnalytics', userId] }); // Invalidate analytics too
    queryClient.invalidateQueries({ queryKey: ['sleepDiary', userId] }); // Invalidate diary too
  }, [queryClient, userId]);

  const { data: sleepRecord, isLoading, error } = useQuery<SleepRecord | null, Error>({
    queryKey: ['sleepRecords', userId, format(date, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', userId)
        .eq('date', format(date, 'yyyy-MM-dd'))
        .single();

      if (error && error.code === 'PGRST116') return null; // No rows found
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !authLoading,
  });

  const addSleepRecordMutation = useMutation<SleepRecord, Error, NewSleepRecordData, unknown>({
    mutationFn: async (newRecordData) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('sleep_records')
        .insert({ ...newRecordData, user_id: userId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateSleepRecordsQueries();
    },
  });

  const updateSleepRecordMutation = useMutation<SleepRecord, Error, { id: string; updates: UpdateSleepRecordData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('sleep_records')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateSleepRecordsQueries();
    },
  });

  const deleteSleepRecordMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('sleep_records')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateSleepRecordsQueries();
    },
  });

  return {
    sleepRecord,
    isLoading,
    error,
    addSleepRecord: addSleepRecordMutation.mutateAsync,
    updateSleepRecord: updateSleepRecordMutation.mutateAsync,
    deleteSleepRecord: deleteSleepRecordMutation.mutateAsync,
  };
};