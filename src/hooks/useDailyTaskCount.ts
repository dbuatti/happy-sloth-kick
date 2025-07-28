import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/Auth/AuthContext'; // Assuming AuthContext is in Auth folder
import { startOfDay, endOfDay } from 'date-fns';

export const useDailyTaskCount = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [dailyTaskCount, setDailyTaskCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDailyTaskCount = useCallback(async () => {
    if (!userId) {
      setDailyTaskCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();

      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'to-do')
        .or(`created_at.gte.${todayStart},original_task_id.not.is.null`); // Tasks created today OR recurring tasks (original_task_id is not null)

      if (error) throw error;
      setDailyTaskCount(count || 0);
    } catch (error) {
      console.error('Error fetching daily task count:', error);
      setDailyTaskCount(0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDailyTaskCount();

    // Set up real-time subscription for tasks to update count
    const channel = supabase
      .channel('daily_task_count_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Change received!', payload);
          fetchDailyTaskCount(); // Re-fetch count on any task change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchDailyTaskCount]);

  return { dailyTaskCount, loading };
};