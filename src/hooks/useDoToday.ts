import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast'; // Import toast utilities
import { format, isSameDay, parseISO } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { Task } from './useTasks'; // Import Task type
import { useAuth } from '@/context/AuthContext'; // Import useAuth

export interface DoTodayOffLogEntry {
  id: string;
  user_id: string;
  task_id: string;
  off_date: string; // YYYY-MM-DD
  created_at: string;
}

interface UseDoTodayOptions {
  currentDate: Date;
  userId?: string; // Optional userId for demo mode
}

export const useDoToday = ({ currentDate, userId: propUserId }: UseDoTodayOptions) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = propUserId || user?.id;

  const [doTodayOffIds, setDoTodayOffIds] = useState<string[]>([]);
  const [dailyProgress, setDailyProgress] = useState({ completed: 0, total: 0 });

  const fetchDoTodayOffLog = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('do_today_off_log')
        .select('task_id')
        .eq('user_id', userId)
        .eq('off_date', format(currentDate, 'yyyy-MM-dd'));

      if (error) throw error;
      setDoTodayOffIds(data.map(entry => entry.task_id));
    } catch (err: any) {
      console.error('Error fetching Do Today off log:', err.message);
      showError('Failed to fetch Do Today log.');
    }
  }, [userId, currentDate]);

  useEffect(() => {
    fetchDoTodayOffLog();
  }, [fetchDoTodayOffLog]);

  // Realtime subscription for do_today_off_log
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('public:do_today_off_log')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'do_today_off_log', filter: `user_id=eq.${userId}` }, payload => {
        // Safely access off_date from new or old record
        const changedDate = payload.new?.off_date || payload.old?.off_date;
        if (changedDate && isSameDay(parseISO(changedDate), currentDate)) {
          if (payload.eventType === 'INSERT') {
            setDoTodayOffIds(prev => [...prev, (payload.new as DoTodayOffLogEntry).task_id]);
          } else if (payload.eventType === 'DELETE') {
            setDoTodayOffIds(prev => prev.filter(id => id !== (payload.old as DoTodayOffLogEntry).task_id));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, currentDate]);

  const toggleDoToday = useCallback(async (taskId: string, isOff: boolean) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      if (isOff) {
        const { error } = await supabase
          .from('do_today_off_log')
          .delete()
          .eq('task_id', taskId)
          .eq('off_date', format(currentDate, 'yyyy-MM-dd'))
          .eq('user_id', userId);
        if (error) throw error;
        showSuccess('Task added back to "Do Today".');
      } else {
        const { error } = await supabase
          .from('do_today_off_log')
          .insert({ task_id: taskId, off_date: format(currentDate, 'yyyy-MM-dd'), user_id: userId });
        if (error) throw error;
        showSuccess('Task moved off "Do Today".');
      }
      queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, format(currentDate, 'yyyy-MM-dd')] });
      return true;
    } catch (err: any) {
      console.error('Error toggling Do Today status:', err.message);
      showError(`Failed to update "Do Today" status: ${err.message}`);
      return false;
    }
  }, [userId, currentDate, queryClient]);

  const toggleAllDoToday = useCallback(async (tasks: Task[], turnOff: boolean) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const dateString = format(currentDate, 'yyyy-MM-dd');
    const tasksToUpdate = tasks.filter(task => {
      const isCurrentlyOff = doTodayOffIds.includes(task.id);
      return turnOff ? !isCurrentlyOff : isCurrentlyOff;
    });

    if (tasksToUpdate.length === 0) {
      showSuccess(`All tasks are already ${turnOff ? 'off' : 'on'} "Do Today".`);
      return;
    }

    const loadingToastId = showLoading(`Updating ${tasksToUpdate.length} tasks...`);
    try {
      if (turnOff) {
        const { error } = await supabase
          .from('do_today_off_log')
          .insert(tasksToUpdate.map(task => ({ task_id: task.id, off_date: dateString, user_id: userId })));
        if (error) throw error;
        showSuccess('All tasks moved off "Do Today".');
      } else {
        const { error } = await supabase
          .from('do_today_off_log')
          .delete()
          .in('task_id', tasksToUpdate.map(task => task.id))
          .eq('off_date', dateString)
          .eq('user_id', userId);
        if (error) throw error;
        showSuccess('All tasks added back to "Do Today".');
      }
      queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, dateString] });
    } catch (err: any) {
      console.error('Error toggling all Do Today status:', err.message);
      showError(`Failed to update all "Do Today" tasks: ${err.message}`);
    } finally {
      dismissToast(loadingToastId);
    }
  }, [userId, currentDate, doTodayOffIds, queryClient]);

  const updateDailyProgress = useCallback((tasks: Task[]) => {
    const completed = tasks.filter(task => task.status === 'completed').length;
    const total = tasks.length;
    setDailyProgress({ completed, total });
  }, []);

  return {
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
    updateDailyProgress,
  };
};