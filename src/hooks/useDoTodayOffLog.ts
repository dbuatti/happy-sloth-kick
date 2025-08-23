import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { DoTodayOffLogEntry, NewDoTodayOffLogEntryData } from '@/types'; // Corrected import
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

export const useDoTodayOffLog = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const invalidateDoTodayOffLogQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['doTodayOffLog', userId] });
  }, [queryClient, userId]);

  const { data: offLogEntries, isLoading, error } = useQuery<DoTodayOffLogEntry[], Error>({
    queryKey: ['doTodayOffLog', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('do_today_off_log')
        .select('*')
        .eq('user_id', userId)
        .order('off_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !authLoading,
  });

  const addDoTodayOffLogEntryMutation = useMutation<DoTodayOffLogEntry, Error, NewDoTodayOffLogEntryData, unknown>({
    mutationFn: async (newEntryData) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('do_today_off_log')
        .insert({ ...newEntryData, user_id: userId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateDoTodayOffLogQueries();
    },
  });

  const deleteDoTodayOffLogEntryMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateDoTodayOffLogQueries();
    },
  });

  return {
    offLogEntries,
    isLoading,
    error,
    addDoTodayOffLogEntry: addDoTodayOffLogEntryMutation.mutateAsync,
    deleteDoTodayOffLogEntry: deleteDoTodayOffLogEntryMutation.mutateAsync,
  };
};