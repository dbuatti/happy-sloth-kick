import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getDailyTaskCounts } from '@/integrations/supabase/api';
import { DailyTaskCount } from '@/types/task';
import { format } from 'date-fns';

export const useDailyTaskCount = (currentDate: Date, userId?: string | null) => {
  const { user } = useAuth();
  const activeUserId = userId || user?.id;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');

  const {
    data: dailyProgress = { totalPendingCount: 0, completedCount: 0, overdueCount: 0 },
  } = useQuery<DailyTaskCount, Error>({
    queryKey: ['dailyTaskCounts', activeUserId, formattedDate],
    queryFn: () => getDailyTaskCounts(activeUserId!, formattedDate),
    enabled: !!activeUserId,
  });

  return dailyProgress;
};