import { useAuth } from '@/context/AuthContext';
import { SleepRecord, NewSleepRecordData, UpdateSleepRecordData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

export const useSleepRecords = (userId?: string) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = userId || user?.id;
  const queryClient = useQueryClient();

  const { data: sleepRecords, isLoading, error, refetch } = useQuery<SleepRecord[], Error>({
    queryKey: ['sleepRecords', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', currentUserId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentUserId && !authLoading,
  });

  const addSleepRecordMutation = useMutation<SleepRecord, Error, NewSleepRecordData, unknown>({
    mutationFn: async (newRecordData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('sleep_records')
        .insert({ ...newRecordData, user_id: currentUserId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleepRecords', currentUserId] });
      toast.success('Sleep record added!');
    },
  });

  const updateSleepRecordMutation = useMutation<SleepRecord, Error, { id: string; updates: UpdateSleepRecordData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('sleep_records')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleepRecords', currentUserId] });
      toast.success('Sleep record updated!');
    },
  });

  const deleteSleepRecordMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('sleep_records')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleepRecords', currentUserId] });
      toast.success('Sleep record deleted!');
    },
  });

  return {
    sleepRecords,
    isLoading,
    error,
    refetchSleepRecords: refetch,
    addSleepRecord: addSleepRecordMutation.mutateAsync,
    updateSleepRecord: updateSleepRecordMutation.mutateAsync,
    deleteSleepRecord: deleteSleepRecordMutation.mutateAsync,
  };
};