import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getDailyBriefing } from '@/integrations/supabase/api';
import { DashboardStats } from '@/types/props'; // Corrected import path

interface UseDashboardStatsProps {
  userId?: string | null;
}

export const useDashboardStats = ({ userId }: UseDashboardStatsProps) => {
  const { user } = useAuth();
  const activeUserId = userId || user?.id;

  const {
    data: dashboardStats,
    isLoading,
    error,
  } = useQuery<DashboardStats, Error>({
    queryKey: ['dashboardStats', activeUserId],
    queryFn: () => getDailyBriefing(activeUserId!),
    enabled: !!activeUserId,
  });

  return {
    dashboardStats,
    isLoading,
    error,
  };
};