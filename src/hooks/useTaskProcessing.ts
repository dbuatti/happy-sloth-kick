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

        // 2. If no instance was completed today, look for an instance created today (to-do)
        if (!relevantInstance) {
          relevantInstance = sortedInstances.find(t => 
            t.status === 'to-do' && 
            isSameDay(startOfDay(parseISO(t.created_at)), todayStart)
          ) ?? null;
        }

        const isDailyRecurring = templateTask.recurring_type === 'daily';

        // 3. If still not found and it's NOT a daily recurring task, look for an uncompleted instance carried over from before today
        if (!relevantInstance && !isDailyRecurring) { 
          relevantInstance = sortedInstances.find(t => 
            t.status === 'to-do' && 
            isBefore(startOfDay(parseISO(t.created_at)), todayStart)
          ) ?? null;
        }

        if (!relevantInstance) {
          // No real instance found for today or carried over (if not daily recurring), consider creating a virtual one
          const mostRecentRealInstance = sortedInstances.find(t => isBefore(startOfDay(parseISO(t.created_at)), todayStart));
          const baseTaskForVirtual = mostRecentRealInstance || templateTask;

          const templateCreatedAt = parseISO(templateTask.created_at);
          const isWeeklyMatch = templateTask.recurring_type === 'weekly' && todayStart.getDay() === templateCreatedAt.getDay();
          const isMonthlyMatch = templateTask.recurring_type === 'monthly' && todayStart.getDate() === templateCreatedAt.getDate();

          // For daily recurring, isDailyMatch is always true.
          // For weekly/monthly, it depends on the day/date match.
          if ((isDailyRecurring || isWeeklyMatch || isMonthlyMatch) && templateTask.status !== 'archived') {
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
        const isCompletedOrArchivedToday = (task.status === 'completed' || task.status === 'archived') &&
          task.completed_at &&
          isValid(parseISO(task.completed_at)) &&
          isSameDay(parseISO(task.completed_at), effectiveCurrentDate);

        const isToDoAndNotOff = task.status === 'to-do' && !task.isDoTodayOff;

        return isCompletedOrArchivedToday || isToDoAndNotOff;
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
        const isFocusTask = task.parent_task_id === null && (task.section_id === null || focusModeSectionIds.has(task.section_id));
        return isFocusTask;
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
        const isWithinFutureLimit = !isAfter(dueDate, futureLimit);
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
    sections,
  ]);

  return { processedTasks, filteredTasks: filtered };
};