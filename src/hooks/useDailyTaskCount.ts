import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  fetchTasks,
  fetchDoTodayOffLog,
} from '@/integrations/supabase/api';
import { Task, DoTodayOffLog, DailyTaskCount } from '@/types/task';
import { isSameDay, parseISO } from 'date-fns';

export const useDailyTaskCount = (currentDate: Date, userId?: string | null): DailyTaskCount => {
  const { user } = useAuth();
  const activeUserId = userId || user?.id;

  const todayStart = useMemo(() => {
    const date = new Date(currentDate);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [currentDate]);

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
      // A task is considered "today's task" if it's not explicitly turned off for today
      // and its due date is today or in the future, or it has no due date.
      // For daily count, we consider all tasks that are not archived.
      const isRelevantTask = task.status !== 'archived' && !doTodayOffIds.has(task.id);

      if (isRelevantTask) {
        if (task.status === 'completed') {
          completedCount++;
        } else if (task.status === 'to-do') {
          // Only count tasks that are due today or have no due date, and are not overdue
          const isDueTodayOrNoDueDate = !task.due_date || isSameDay(parseISO(task.due_date), todayStart);
          const isOverdue = task.due_date && parseISO(task.due_date) < todayStart;

          if (isDueTodayOrNoDueDate) {
            totalPendingCount++;
          }
          if (isOverdue) {
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