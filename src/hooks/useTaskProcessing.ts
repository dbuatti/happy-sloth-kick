import { useMemo } from 'react';
import { isSameDay, parseISO, isValid, isBefore, format, startOfDay, addDays, isAfter } from 'date-fns';
import { Task, TaskSection } from './useTasks'; // Import types
import { UserSettings } from './useUserSettings'; // Import UserSettings type

interface UseTaskProcessingProps {
  rawTasks: Omit<Task, 'category_color' | 'isDoTodayOff'>[];
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

// Regex to validate UUID format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    // Filter out tasks with invalid IDs first
    const validRawTasks = rawTasks.filter(task => {
      // Allow virtual tasks (client-side generated IDs), temporary optimistic update IDs, and valid UUIDs
      if (!task.id.startsWith('virtual-') && !task.id.startsWith('temp-') && !UUID_REGEX.test(task.id)) {
        console.warn(`Skipping task with invalid ID format: "${task.id}". It will not be displayed or interactable.`);
        return false;
      }
      return true;
    });

    const taskSeriesMap = new Map<string, Omit<Task, 'category_color' | 'isDoTodayOff'>[]>();
    validRawTasks.forEach((task: Omit<Task, 'category_color' | 'isDoTodayOff'>) => { // Use validRawTasks here
      const seriesKey = task.original_task_id || task.id;
      if (!taskSeriesMap.has(seriesKey)) {
        taskSeriesMap.set(seriesKey, []);
      }
      taskSeriesMap.get(seriesKey)!.push(task);
    });

    taskSeriesMap.forEach((seriesInstances, seriesKey) => {
      if (processedSeriesKeys.has(seriesKey)) return;
      processedSeriesKeys.add(seriesKey);

      const templateTask: Omit<Task, 'category_color' | 'isDoTodayOff'> | undefined = validRawTasks.find((t: Omit<Task, 'category_color' | 'isDoTodayOff'>) => t.id === seriesKey);

      if (!templateTask) {
        seriesInstances.forEach(orphanTask => {
            allProcessedTasks.push({ 
              ...orphanTask, 
              category_color: categoriesMapLocal.get(orphanTask.category || '') || 'gray',
              isDoTodayOff: doTodayOffIds.has(orphanTask.original_task_id || orphanTask.id) && orphanTask.recurring_type === 'none',
            });
        });
        return;
      }

      if (templateTask.recurring_type === 'none') {
        allProcessedTasks.push({ 
          ...templateTask, 
          category_color: categoriesMapLocal.get(templateTask.category || '') || 'gray',
          isDoTodayOff: doTodayOffIds.has(templateTask.original_task_id || templateTask.id) && templateTask.recurring_type === 'none',
        });
      } else { // Recurring task
        const sortedInstances = [...seriesInstances].sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime());
        
        let relevantInstance: Omit<Task, 'category_color' | 'isDoTodayOff'> | null = null;

        // 1. Prioritize an instance completed today
        relevantInstance = sortedInstances.find(t => 
          t.status === 'completed' && 
          t.completed_at && 
          isValid(parseISO(t.completed_at)) && 
          isSameDay(startOfDay(parseISO(t.completed_at)), todayStart)
        ) ?? null;

        // 2. If no instance was completed today, find the most recent 'to-do' instance created today
        if (!relevantInstance) {
          relevantInstance = sortedInstances.find(t => 
            t.status === 'to-do' && // Explicitly check for 'to-do'
            isSameDay(startOfDay(parseISO(t.created_at)), todayStart)
          ) ?? null;
        }

        // 3. If still no relevant instance for today, find the most recent 'to-do' instance carried over from before today
        if (!relevantInstance) {
          relevantInstance = sortedInstances.find(t => 
            t.status === 'to-do' && // Explicitly check for 'to-do'
            isBefore(startOfDay(parseISO(t.created_at)), todayStart)
          ) ?? null;
        }

        if (!relevantInstance) {
          // No real instance found for today or carried over, consider creating a virtual one
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
              remind_at: baseTaskForVirtual.remind_at ? format(parseISO(baseTaskForVirtual.remind_at), 'yyyy-MM-ddTHH:mm:ssZ') : null,
              due_date: baseTaskForVirtual.due_date ? todayStart.toISOString() : null,
              category_color: categoriesMapLocal.get(baseTaskForVirtual.category || '') || 'gray',
              completed_at: null,
              isDoTodayOff: false, // Recurring tasks are never "off" via doTodayOffIds
            };
            allProcessedTasks.push(virtualTask);
          }
        } else {
          allProcessedTasks.push({ 
            ...relevantInstance, 
            category_color: categoriesMapLocal.get(relevantInstance.category || '') || 'gray',
            isDoTodayOff: false, // Recurring tasks are never "off" via doTodayOffIds
          });
        }
      }
    });
    return allProcessedTasks;
  }, [rawTasks, todayStart, categoriesMap, doTodayOffIds]);

  const filtered = useMemo(() => {
    let filteredTasks = processedTasks;

    if (viewMode === 'daily') {
      filteredTasks = filteredTasks.filter(task => {
        // Include tasks completed/archived today
        if ((task.status === 'completed' || task.status === 'archived') && task.completed_at) {
            const completedAtDate = parseISO(task.completed_at);
            const isCompletedOnCurrentDate = (
                isValid(completedAtDate) &&
                isSameDay(completedAtDate, effectiveCurrentDate)
            );
            if (isCompletedOnCurrentDate) {
                return true;
            }
        }

        // Include 'to-do' tasks
        if (task.status === 'to-do') {
            const createdAt = startOfDay(parseISO(task.created_at));
            const dueDate = task.due_date ? startOfDay(parseISO(task.due_date)) : null;

            const isCreatedOnEffectiveDate = isSameDay(createdAt, effectiveCurrentDate);
            const isDueOnEffectiveDateOrPast = dueDate && !isAfter(dueDate, effectiveCurrentDate);
            const isUndatedAndCreatedOnEffectiveDateOrPast = !dueDate && !isAfter(createdAt, effectiveCurrentDate);

            const isRelevantByDate = isCreatedOnEffectiveDate || isDueOnEffectiveDateOrPast || isUndatedAndCreatedOnEffectiveDateOrPast;

            if (isRelevantByDate) {
                return true;
            }
        }

        return false;
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

    if (userSettings && userSettings.future_tasks_days_visible !== -1 && viewMode === 'daily') {
      const visibilityDays = userSettings.future_tasks_days_visible;
      const today = startOfDay(effectiveCurrentDate);
      const futureLimit = addDays(today, visibilityDays);

      filteredTasks = filteredTasks.filter(task => {
        if (!task.due_date) {
          return true;
        }
        const dueDate = startOfDay(parseISO(task.due_date));
        return !isAfter(dueDate, futureLimit);
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
    sections,
  ]);

  return { processedTasks, filteredTasks: filtered };
};