import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  fetchTasks,
  fetchSections,
  fetchDoTodayOffLog,
} from '@/integrations/supabase/api'; // Corrected import path for API functions
import { Task, TaskSection, DoTodayOffLog, DailyTaskCount } from '@/types/task'; // Corrected import

export const useDailyTaskCount = (currentDate: Date, userId?: string | null): DailyTaskCount => {
  const { user } = useAuth();
  const activeUserId = userId || user?.id;

  const todayStart = useMemo(() => new Date(currentDate.setHours(0, 0, 0, 0)), [currentDate]);

  const { data: tasks = [] } = useQuery<Task[], Error>({
    queryKey: ['dailyTasksCount', activeUserId, todayStart.toISOString().split('T')[0]],
    queryFn: () => fetchTasks(activeUserId!, 'all', todayStart),
    enabled: !!activeUserId,
  });

  const { data: doTodayOffLog = [] } = useQuery<DoTodayOffLog[], Error>({
    queryKey: ['dailyDoTodayOffLogCount', activeUserId, todayStart.toISOString().split('T')[0]],
    queryFn: () => fetchDoTodayOffLog(activeUserId!, todayStart),
    enabled: !!activeUserId,
  });

  const doTodayOffIds = useMemo(
    () => new Set(doTodayOffLog.map((log) => log.task_id)),
    [doTodayOffLog]
  );

  const dailyCounts = useMemo(() => {
    let totalPendingCount = 0;
    let completedCount = 0;
    let overdueCount = 0;

    tasks.forEach((task) => {
      const isTodayTask =
        !doTodayOffIds.has(task.id) &&
        (task.due_date === null || new Date(task.due_date) >= todayStart);

      if (isTodayTask) {
        if (task.status === 'completed') {
          completedCount++;
        } else if (task.status === 'to-do') {
          totalPendingCount++;
          if (task.due_date && new Date(task.due_date) < todayStart) {
            overdueCount++;
          }
        }
      }
    });

    return {
      totalPendingCount,
      completedCount,
      overdueCount,
    };
  }, [tasks, doTodayOffIds, todayStart]);

  return dailyCounts;
};