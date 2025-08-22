import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getDailyBriefing } from '@/integrations/supabase/api';
import { DashboardStats } from '@/types/props';

export const useDashboardStats = (userId?: string | null): { data: DashboardStats | null; isLoading: boolean; error: Error | null } => {
  const { user } = useAuth();
  const activeUserId = userId || user?.id;

  const { data, isLoading, error } = useQuery<DashboardStats, Error>({
    queryKey: ['dashboardStats', activeUserId],
    queryFn: async () => {
      if (!activeUserId) throw new Error('User not authenticated.');
      const briefing = await getDailyBriefing(activeUserId);
      return {
        loading: false,
        tasksDue: briefing.tasksDueToday,
        tasksCompleted: 0, // Placeholder, adjust if API provides this
        appointmentsToday: briefing.appointmentsToday,
      };
    },
    enabled: !!activeUserId,
    initialData: {
      loading: true,
      tasksDue: 0,
      tasksCompleted: 0,
      appointmentsToday: 0,
    },
  });

  return { data, isLoading, error };
};