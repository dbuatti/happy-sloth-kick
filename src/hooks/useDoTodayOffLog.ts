import { useAuth } from '@/context/AuthContext';
import { DoTodayOffLogEntry, NewDoTodayOffLogEntryData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseDoTodayOffLogProps {
  userId?: string;
}

export const useDoTodayOffLog = ({ userId }: UseDoTodayOffLogProps) => {
  const queryClient = useQueryClient();

  const { data: offLogEntries, isLoading, error } = useQuery<DoTodayOffLogEntry[], Error>({
    queryKey: ['doTodayOffLog', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('do_today_off_log')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data as DoTodayOffLogEntry[];
    },
    enabled: !!userId,
  });

  const addDoTodayOffLogEntryMutation = useMutation<DoTodayOffLogEntry, Error, NewDoTodayOffLogEntryData, unknown>({
    mutationFn: async (newEntryData) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('do_today_off_log')
        .insert({ ...newEntryData, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      return data as DoTodayOffLogEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doTodayOffLog', userId] });
    },
  });

  const deleteDoTodayOffLogEntryMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('id', id)
        .eq('user_id', userId); // Ensure RLS

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doTodayOffLog', userId] });
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