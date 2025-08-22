import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getDailyBriefing } from '@/integrations/supabase/api';
import { DashboardStats } from '@/types/props';

interface UseDashboardStatsProps {
  userId?: string | null;
}

export const useDashboardStats = (props?: UseDashboardStatsProps): { data: DashboardStats | null; isLoading: boolean; error: Error | null } => {
  const { user } = useAuth();
  const activeUserId = props?.userId || user?.id;

  const { data, isLoading, error } = useQuery<DashboardStats, Error>({
    queryKey: ['dashboardStats', activeUserId],
    queryFn: async () => {
      if (!activeUserId) throw new Error('User not authenticated.');
      const briefing = await getDailyBriefing(activeUserId);
      return {
        isLoading: false,
        tasksDue: briefing.tasksDueToday,
        tasksCompleted: 0,
        appointmentsToday: briefing.appointmentsToday,
      };
    },
    enabled: !!activeUserId,
    initialData: {
      isLoading: true,
      tasksDue: 0,
      tasksCompleted: 0,
      appointmentsToday: 0,
    },
  });

  return { data, isLoading, error };
};