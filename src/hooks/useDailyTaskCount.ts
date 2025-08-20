import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format, isSameDay, startOfDay, parseISO } from 'date-fns'; // Added parseISO
// import { useQueryClient } from '@tanstack/react-query'; // Removed unused import
import { Task } from './useTasks'; // Import Task type

interface UseDailyTaskCountOptions {
  currentDate: Date;
  userId?: string;
}

export const useDailyTaskCount = ({ currentDate, userId: propUserId }: UseDailyTaskCountOptions) => {
  const { user } = useAuth();
  // const queryClient = useQueryClient(); // Removed unused variable
  const userId = propUserId || user?.id;

  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDailyTaskCounts = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const startOfCurrentDay = format(startOfDay(currentDate), 'yyyy-MM-dd');

    try {
      // Fetch tasks for the current day
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status, due_date, recurring_type, original_task_id')
        .eq('user_id', userId)
        .or(`due_date.eq.${startOfCurrentDay},recurring_type.neq.none`); // Include recurring tasks for the day

      if (tasksError) throw tasksError;

      // Filter tasks to only include those due today or recurring for today
      const relevantTasks = tasks.filter(task => {
        const isDueToday = task.due_date && isSameDay(parseISO(task.due_date), currentDate);
        const isRecurringToday = task.recurring_type !== 'none' && task.recurring_type !== null; // Simplified check, actual recurrence logic is in useTasks

        return isDueToday || isRecurringToday;
      });

      const completed = relevantTasks.filter(task => task.status === 'completed').length;
      const total = relevantTasks.length;

      setCompletedCount(completed);
      setTotalCount(total);

    } catch (err: any) {
      console.error('Error fetching daily task counts:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentDate]);

  useEffect(() => {
    fetchDailyTaskCounts();
  }, [fetchDailyTaskCounts]);

  // Realtime subscription for tasks to update counts
  useEffect(() => {
    if (!userId) return;

    const tasksChannel = supabase
      .channel('daily_task_count_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, () => { // Removed unused payload
        // Re-fetch counts on any task change relevant to the user
        fetchDailyTaskCounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
    };
  }, [userId, fetchDailyTaskCounts]);

  return { completedCount, totalCount, isLoading };
};