import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Task } from '@/types';
import { isSameDay, startOfDay } from 'date-fns';

export const useDailyTaskCount = (tasks: Task[] | undefined) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const dailyProgress = useMemo(() => {
    if (!tasks || !userId) return { completed: 0, total: 0, percentage: 0 };
    const today = startOfDay(new Date());
    const dailyTasks = tasks.filter(task =>
      task.user_id === userId &&
      (task.recurring_type === 'daily' ||
        (task.due_date && isSameDay(new Date(task.due_date), today)))
    );
    const completed = dailyTasks.filter(task => task.status === 'completed').length;
    const total = dailyTasks.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    return { completed, total, percentage };
  }, [tasks, userId]);

  return { dailyProgress, isLoading: authLoading };
};