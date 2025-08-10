import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format, startOfDay, endOfDay } from 'date-fns';

export const useDashboardStats = (props?: { userId?: string }) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;
  const [stats, setStats] = useState({
    tasksDue: 0,
    tasksCompleted: 0,
    appointmentsToday: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      const todayDateString = format(today, 'yyyy-MM-dd');

      const { count: tasksDueCount, error: tasksDueError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('due_date', todayDateString)
        .eq('status', 'to-do');
      if (tasksDueError) throw tasksDueError;

      const { count: tasksCompletedCount, error: tasksCompletedError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('updated_at', todayStart)
        .lte('updated_at', todayEnd);
      if (tasksCompletedError) throw tasksCompletedError;

      const { count: appointmentsTodayCount, error: appointmentsError } = await supabase
        .from('schedule_appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('date', todayDateString);
      if (appointmentsError) throw appointmentsError;

      setStats({
        tasksDue: tasksDueCount || 0,
        tasksCompleted: tasksCompletedCount || 0,
        appointmentsToday: appointmentsTodayCount || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { ...stats, loading };
};