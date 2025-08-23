import { useAuth } from '@/context/AuthContext';
import { SleepRecord, NewSleepRecordData, UpdateSleepRecordData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

interface UseSleepRecordsProps {
  userId?: string;
  date?: Date;
}

export const useSleepRecords = ({ userId: propUserId, date }: UseSleepRecordsProps) => {
  const { user } = useAuth();
  const currentUserId = propUserId || user?.id;
  const queryClient = useQueryClient();

  const formattedDate = date ? format(date, 'yyyy-MM-dd') : undefined;

  const { data: sleepRecords, isLoading, error } = useQuery<SleepRecord[], Error>({
    queryKey: ['sleepRecords', currentUserId, formattedDate],
    queryFn: async () => {
      if (!currentUserId) return [];
      let query = supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', currentUserId);

      if (formattedDate) {
        query = query.eq('date', formattedDate);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      return data as SleepRecord[];
    },
    enabled: !!currentUserId,
  });

  const addSleepRecordMutation = useMutation<SleepRecord, Error, NewSleepRecordData, unknown>({
    mutationFn: async (newRecordData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('sleep_records')
        .insert({ ...newRecordData, user_id: currentUserId })
        .select()
        .single();

      if (error) throw error;
      return data as SleepRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleepRecords', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['sleepAnalytics', currentUserId] });
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
        .eq('user_id', currentUserId)
        .select()
        .single();

      if (error) throw error;
      return data as SleepRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleepRecords', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['sleepAnalytics', currentUserId] });
      toast.success('Sleep record updated!');
    },
  });

  const deleteSleepRecordMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('sleep_records')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleepRecords', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['sleepAnalytics', currentUserId] });
      toast.success('Sleep record deleted!');
    },
  });

  return {
    sleepRecords,
    isLoading,
    error,
    addSleepRecord: addSleepRecordMutation.mutateAsync,
    updateSleepRecord: updateSleepRecordMutation.mutateAsync,
    deleteSleepRecord: deleteSleepRecordMutation.mutateAsync,
  };
};