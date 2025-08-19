import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

export const useDashboardStats = (props?: { userId?: string }) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;

  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();
  const todayDateString = format(today, 'yyyy-MM-dd');

  const { data: stats = { tasksDue: 0, tasksCompleted: 0, appointmentsToday: 0 }, isLoading: loading, error } = useQuery({
    queryKey: ['dashboardStats', userId, todayDateString],
    queryFn: async () => {
      if (!userId) return { tasksDue: 0, tasksCompleted: 0, appointmentsToday: 0 };

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

      return {
        tasksDue: tasksDueCount || 0,
        tasksCompleted: tasksCompletedCount || 0,
        appointmentsToday: appointmentsTodayCount || 0,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
  });

  useEffect(() => {
    if (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  }, [error]);

  return { ...stats, loading };
};