import { useMemo } from 'react';
import { parseISO, isSameDay, isBefore, format, startOfDay, addDays, isAfter } from 'date-fns';
import { Task, TaskSection } from './useTasks'; // Import types
import { UserSettings } from './useUserSettings'; // Import UserSettings type

interface UseTaskProcessingProps {
  rawTasks: Omit<Task, 'category_color'>[];
  categoriesMap: Map<string, string>;
  effectiveCurrentDate: Date;
  viewMode: 'daily' | 'archive' | 'focus';
  searchFilter: string;
  statusFilter: string;
  categoryFilter: string;
  priorityFilter: string;
  sectionFilter: string;
  userSettings: UserSettings | null;
  sections: TaskSection[];
  doTodayOffIds: Set<string>;
}

export const useTaskProcessing = ({
  rawTasks,
  categoriesMap,
  effectiveCurrentDate,
  viewMode,
  searchFilter,
  statusFilter,
  categoryFilter,
  priorityFilter,
  sectionFilter,
  userSettings,
  sections,
  doTodayOffIds,
}: UseTaskProcessingProps) => {
  const todayStart = startOfDay(effectiveCurrentDate);

  const processedTasks = useMemo(() => {
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
            allProcessedTasks.push({ ...orphanTask, category_color: categoriesMapLocal.get(orphanTask.category || '') || 'gray' });
        });
        return;
      }

      if (templateTask.recurring_type === 'none') {
        allProcessedTasks.push({ ...templateTask, category_color: categoriesMapLocal.get(templateTask.category || '') || 'gray' });
      } else {
        const sortedInstances = [...seriesInstances].sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime());
        
        let relevantInstance: Omit<Task, 'category_color'> | null = null;

        // 1. Check for an instance completed today
        relevantInstance = sortedInstances.find(t => 
            t.completed_at && isSameDay(startOfDay(parseISO(t.completed_at)), todayStart)
        ) || null;

        // 2. If not found, check for an instance created today (and not yet completed/archived)
        if (!relevantInstance) {
            relevantInstance = sortedInstances.find(t => 
                isSameDay(startOfDay(parseISO(t.created_at)), todayStart) && t.status !== 'completed' && t.status !== 'archived'
            ) || null;
        }

        // 3. If still not found, look for an uncompleted instance from before today
        if (!relevantInstance) {
          relevantInstance = sortedInstances.find(t => 
            isBefore(startOfDay(parseISO(t.created_at)), todayStart) && t.status === 'to-do'
          ) || null;
        }

        // If still no relevant instance (real or carried over), create a virtual one if applicable
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
              status: 'to-do', // Virtual tasks are always 'to-do' initially
              original_task_id: templateTask.id,
              remind_at: baseTaskForVirtual.remind_at ? format(parseISO(baseTaskForVirtual.remind_at), 'yyyy-MM-ddTHH:mm:ssZ') : null,
              due_date: baseTaskForVirtual.due_date ? todayStart.toISOString() : null,
              category_color: categoriesMapLocal.get(baseTaskForVirtual.category || '') || 'gray',
              completed_at: null, // Virtual tasks are never completed_at initially
            };
            allProcessedTasks.push(virtualTask);
          }
        } else {
          allProcessedTasks.push({ ...relevantInstance, category_color: categoriesMapLocal.get(relevantInstance.category || '') || 'gray' });
        }
      }
    });
    return allProcessedTasks;
  }, [rawTasks, todayStart, categoriesMap]);

  const filtered = useMemo(() => {
    let filteredTasks = processedTasks;

    if (viewMode === 'daily') {
      filteredTasks = filteredTasks.filter(task => {
        const taskCompletedAt = task.completed_at ? startOfDay(parseISO(task.completed_at)) : null;

        // 1. Always include tasks completed/archived today
        const isCompletedOrArchivedToday = (task.status === 'completed' || task.status === 'archived') && taskCompletedAt && isSameDay(taskCompletedAt, todayStart);
        if (isCompletedOrArchivedToday) {
            return true;
        }

        // 2. Only consider 'to-do' tasks from here
        if (task.status !== 'to-do') {
            return false;
        }

        // 3. Check if the task is marked as "Do Today" (not in doTodayOffIds)
        const isDoToday = task.recurring_type !== 'none' || !doTodayOffIds.has(task.original_task_id || task.id);
        if (!isDoToday) {
            return false; // If not "Do Today", filter it out
        }

        // 4. If it's a 'to-do' and 'Do Today' task, it's considered relevant for the daily view
        //    The future_tasks_days_visible filter will further refine its visibility based on date.
        return true;
      });
    }

    if (searchFilter) {
      filteredTasks = filteredTasks.filter(task =>
        task.description?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.link?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    if (viewMode === 'archive') {
      filteredTasks = filteredTasks.filter(task => task.status === 'archived');
    } else {
      if (statusFilter !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
      } else {
        filteredTasks = filteredTasks.filter(task => task.status !== 'archived');
      }
    }

    if (categoryFilter !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.category === categoryFilter);
    }

    if (priorityFilter !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
    }

    if (sectionFilter !== 'all') {
      if (sectionFilter === 'no-section') {
        filteredTasks = filteredTasks.filter(task => task.section_id === null);
      } else {
        filteredTasks = filteredTasks.filter(task => task.section_id === sectionFilter);
      }
    }

    // Apply focus mode section filter
    if (viewMode === 'focus' && userSettings?.schedule_show_focus_tasks_only) {
      const focusModeSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));
      filteredTasks = filteredTasks.filter(task => {
        return task.parent_task_id === null && (task.section_id === null || focusModeSectionIds.has(task.section_id));
      });
    }

    // Apply future_tasks_days_visible filter for 'daily' view
    if (userSettings && userSettings.future_tasks_days_visible !== -1 && viewMode === 'daily') {
      const visibilityDays = userSettings.future_tasks_days_visible;
      const today = startOfDay(effectiveCurrentDate);
      const futureLimit = addDays(today, visibilityDays);

      filteredTasks = filteredTasks.filter(task => {
        // If task is completed or archived today, it should always be visible regardless of future_tasks_days_visible
        const taskCompletedAt = task.completed_at ? startOfDay(parseISO(task.completed_at)) : null;
        const isCompletedOrArchivedToday = (task.status === 'completed' || task.status === 'archived') && taskCompletedAt && isSameDay(taskCompletedAt, today);
        if (isCompletedOrArchivedToday) {
            return true;
        }

        // For 'to-do' tasks, apply the visibility limit based on due_date or created_at
        const dateToCheck = task.due_date ? startOfDay(parseISO(task.due_date)) : startOfDay(parseISO(task.created_at));
        
        // If the date is in the past or today, it's always visible
        if (!isAfter(dateToCheck, today)) {
            return true;
        }

        // If the date is in the future, check if it's within the visibility limit
        const isWithinFutureLimit = !isAfter(dateToCheck, futureLimit);

        return isWithinFutureLimit;
      });
    }

    return filteredTasks;
  }, [
    processedTasks,
    searchFilter,
    statusFilter,
    categoryFilter,
    priorityFilter,
    sectionFilter,
    viewMode,
    effectiveCurrentDate,
    userSettings,
    todayStart,
    sections,
    doTodayOffIds,
  ]);

  return { processedTasks, filteredTasks: filtered };
};