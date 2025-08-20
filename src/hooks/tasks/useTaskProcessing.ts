import { useMemo } from 'react';
import { isSameDay, parseISO, isBefore, format, setHours, setMinutes, getHours, getMinutes, startOfDay } from 'date-fns';
import { Task, Category } from './types';

interface UseProcessedTasksProps {
  rawTasks: Omit<Task, 'category_color'>[];
  categoriesMap: Map<string, string>;
  todayStart: Date;
}

export const useProcessedTasks = ({ rawTasks, categoriesMap, todayStart }: UseProcessedTasksProps): Task[] => {
  return useMemo(() => {
    const allProcessedTasks: Task[] = [];
    const processedSeriesKeys = new Set<string>();
    const categoriesMapLocal = categoriesMap;

    const taskSeriesMap = new Map<string, Omit<Task, 'category_color'>[]>();
    rawTasks.forEach((task: Omit<Task, 'category_color'>) => {
      const seriesKey = task.original_task_id || task.id;
      if (!taskSeriesMap.has(seriesKey)) {
        taskSeriesMap.set(seriesKey, []);
      }
      taskSeriesMap.get(seriesKey)!.push(task);
    });

    taskSeriesMap.forEach((seriesInstances, seriesKey) => {
      if (processedSeriesKeys.has(seriesKey)) return;
      processedSeriesKeys.add(seriesKey);

      const templateTask: Omit<Task, 'category_color'> | undefined = rawTasks.find((t: Omit<Task, 'category_color'>) => t.id === seriesKey);

      if (!templateTask) {
        seriesInstances.forEach(orphanTask => {
            allProcessedTasks.push({ ...orphanTask, category_color: categoriesMapLocal.get(orphanTask.category) || 'gray' });
        });
        return;
      }

      if (templateTask.recurring_type === 'none') {
        allProcessedTasks.push({ ...templateTask, category_color: categoriesMapLocal.get(templateTask.category) || 'gray' });
      } else {
        const sortedInstances = [...seriesInstances].sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime());
        let relevantInstance: Omit<Task, 'category_color'> | null = sortedInstances.find(t => isSameDay(startOfDay(parseISO(t.created_at)), todayStart)) || null;

        if (!relevantInstance) {
          relevantInstance = sortedInstances.find(t => isBefore(startOfDay(parseISO(t.created_at)), todayStart) && t.status === 'to-do') || null;
        }

        if (!relevantInstance) {
          const mostRecentRealInstance = sortedInstances.find(t => isBefore(startOfDay(parseISO(t.created_at)), todayStart));
          const baseTaskForVirtual = mostRecentRealInstance || templateTask;

          const templateCreatedAt = parseISO(templateTask.created_at);
          const isDailyMatch = templateTask.recurring_type === 'daily';
          const isWeeklyMatch = templateTask.recurring_type === 'weekly' && todayStart.getUTCDay() === templateCreatedAt.getUTCDay();
          const isMonthlyMatch = templateTask.recurring_type === 'monthly' && todayStart.getUTCDate() === templateCreatedAt.getUTCDate();

          if ((isDailyMatch || isWeeklyMatch || isMonthlyMatch) && templateTask.status !== 'archived') {
            const virtualTask: Task = {
              ...baseTaskForVirtual,
              id: `virtual-${templateTask.id}-${format(todayStart, 'yyyy-MM-dd')}`,
              created_at: todayStart.toISOString(),
              status: 'to-do',
              original_task_id: templateTask.id,
              remind_at: baseTaskForVirtual.remind_at ? format(setHours(setMinutes(todayStart, getMinutes(parseISO(baseTaskForVirtual.remind_at))), getHours(parseISO(baseTaskForVirtual.remind_at))), 'yyyy-MM-ddTHH:mm:ssZ') : null,
              due_date: baseTaskForVirtual.due_date ? todayStart.toISOString() : null,
              category_color: categoriesMapLocal.get(baseTaskForVirtual.category) || 'gray',
            };
            allProcessedTasks.push(virtualTask);
          }
        } else {
          allProcessedTasks.push({ ...relevantInstance, category_color: categoriesMapLocal.get(relevantInstance.category) || 'gray' });
        }
      }
    });
    return allProcessedTasks;
  }, [rawTasks, todayStart, categoriesMap]);
};