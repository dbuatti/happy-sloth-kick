import { useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDoTodayOffLog } from '@/integrations/supabase/api'; // Import the moved fetch function
import { Task } from './useTasks'; // Import Task type

interface UseDoTodayLogProps {
  currentDate: Date;
  userId?: string;
}

export const useDoTodayLog = ({ currentDate, userId: propUserId }: UseDoTodayLogProps) => {
  const { user } = useAuth();
  const userId = propUserId || user?.id;
  const queryClient = useQueryClient();

  const formattedDate = format(currentDate, 'yyyy-MM-dd');

  const { data: doTodayOffIds = new Set(), isLoading: loading, error } = useQuery<Set<string>, Error>({
    queryKey: ['do_today_off_log', userId, formattedDate],
    queryFn: () => fetchDoTodayOffLog(userId!, currentDate),
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });

  useEffect(() => {
    if (error) {
      showError('Failed to load "Do Today" log.');
      console.error(error);
    }
  }, [error]);

  // Real-time subscription for do_today_off_log
  useEffect(() => {
    if (!userId) return;

    const doTodayOffLogChannel = supabase
      .channel('do_today_off_log_channel_hook')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'do_today_off_log', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] });
          queryClient.invalidateQueries({ queryKey: ['tasks', userId] }); // Invalidate tasks as their visibility might change
          queryClient.invalidateQueries({ queryKey: ['dailyTaskCount', userId] }); // Invalidate daily task count
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(doTodayOffLogChannel);
    };
  }, [userId, queryClient, formattedDate]);

  const toggleDoTodayMutation = useMutation<void, Error, Task>({
    mutationFn: async (task) => {
      if (!userId) throw new Error('User not authenticated.');
      const taskIdToLog = task.original_task_id || task.id;
      const isCurrentlyOff = doTodayOffIds.has(taskIdToLog);

      if (isCurrentlyOff) {
        const { error } = await supabase
          .from('do_today_off_log')
          .delete()
          .eq('user_id', userId)
          .eq('task_id', taskIdToLog)
          .eq('off_date', formattedDate);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('do_today_off_log')
          .insert({ user_id: userId, task_id: taskIdToLog, off_date: formattedDate });
        if (error) throw error;
      }
    },
    onSuccess: (_, task) => {
      queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] });
      queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
      queryClient.invalidateQueries({ queryKey: ['dailyTaskCount', userId] });
    },
    onError: (err) => {
      showError("Failed to sync 'Do Today' setting.");
      console.error("Error toggling Do Today:", err);
    },
  });

  const toggleAllDoTodayMutation = useMutation<void, Error, Task[]>({
    mutationFn: async (nonRecurringTasks) => {
      if (!userId) throw new Error('User not authenticated.');

      const nonRecurringTaskIds = nonRecurringTasks.map(t => t.original_task_id || t.id);
      const currentlyOnCount = nonRecurringTasks.filter(t => !doTodayOffIds.has(t.original_task_id || t.id)).length;
      const turnAllOff = currentlyOnCount > nonRecurringTasks.length / 2;

      await supabase.from('do_today_off_log').delete().eq('user_id', userId).eq('off_date', formattedDate);

      if (turnAllOff) {
        const recordsToInsert = nonRecurringTaskIds.map(taskId => ({ user_id: userId, task_id: taskId, off_date: formattedDate }));
        if (recordsToInsert.length > 0) {
          const { error } = await supabase.from('do_today_off_log').insert(recordsToInsert);
          if (error) throw error;
        }
        showSuccess("All tasks toggled off for today.");
      } else {
        showSuccess("All tasks toggled on for today.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] });
      queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
      queryClient.invalidateQueries({ queryKey: ['dailyTaskCount', userId] });
    },
    onError: (err) => {
      showError("Failed to sync 'Do Today' settings.");
      console.error("Error toggling all Do Today:", err);
    },
  });

  return {
    doTodayOffIds,
    loading,
    toggleDoToday: toggleDoTodayMutation.mutateAsync,
    toggleAllDoToday: toggleAllDoTodayMutation.mutateAsync,
  };
};