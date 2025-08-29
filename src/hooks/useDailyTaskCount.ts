import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { startOfDay, parseISO, isSameDay, isBefore, format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Import modular hooks and API functions
import { useTaskSections } from './useTaskSections';
import { useDoTodayLog } from './useDoTodayLog';
import { fetchTasks } from '@/integrations/supabase/api';
import { Task } from './useTasks'; // Import Task type

export const useDailyTaskCount = (props?: { userId?: string }) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;
  const queryClient = useQueryClient();

  const todayStart = startOfDay(new Date()); // Always use current date for daily count

  // Fetch sections included in focus mode using the modular hook
  const { data: sectionsData = [], loading: sectionsLoading } = useTaskSections();

  // Fetch all 'to-do' tasks for the user that could potentially be relevant for today
  const { data: allUserTasks = [], isLoading: tasksLoading } = useQuery<Task[], Error>({
    queryKey: ['tasks', userId],
    queryFn: () => fetchTasks(userId!) as Promise<Task[]>,
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });

  // Get "Do Today" off IDs using the modular hook
  const { doTodayOffIds = new Set(), loading: doTodayOffLoading } = useDoTodayLog({ currentDate: new Date(), userId });

  const loading = sectionsLoading || tasksLoading || doTodayOffLoading;

  const dailyTaskCount = useMemo(() => {
    if (!userId || loading) return 0;

    let count = 0;
    const focusModeSectionIds = new Set(sectionsData.filter(s => s.include_in_focus_mode).map(s => s.id));
    const processedOriginalIds = new Set<string>();

    const topLevelTasks = (allUserTasks as Task[]).filter(task => task.parent_task_id === null);

    const relevantTasksForToday: Task[] = [];

    topLevelTasks.forEach(task => {
      const taskCreatedAt = startOfDay(parseISO(task.created_at));
      const originalId = task.original_task_id || task.id;

      if (task.recurring_type !== 'none') {
        if (processedOriginalIds.has(originalId)) {
          return;
        }

        const allInstancesOfThisRecurringTask = (allUserTasks as Task[]).filter(t =>
          t.original_task_id === originalId || t.id === originalId
        );

        let taskToDisplay: Task | null = null;

        const instanceForCurrentDay = allInstancesOfThisRecurringTask.find(t =>
          isSameDay(startOfDay(parseISO(t.created_at)), todayStart) && t.status !== 'archived'
        );
        
        if (instanceForCurrentDay) {
          taskToDisplay = instanceForCurrentDay;
        } else {
          const carryOverTask = allInstancesOfThisRecurringTask
            .filter(t => isBefore(startOfDay(parseISO(t.created_at)), todayStart) && t.status === 'to-do')
            .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())[0];

          if (carryOverTask) {
            taskToDisplay = carryOverTask;
          }
        }
        
        if (taskToDisplay) {
          relevantTasksForToday.push(taskToDisplay);
        }
        processedOriginalIds.add(originalId);
      } else {
        const isTaskCreatedOnCurrentDate = isSameDay(taskCreatedAt, todayStart);
        if (isTaskCreatedOnCurrentDate && task.status !== 'archived') {
          relevantTasksForToday.push(task);
        } else if (isBefore(taskCreatedAt, todayStart) && task.status === 'to-do') {
          relevantTasksForToday.push(task);
        }
      }
    });

    relevantTasksForToday.forEach(task => {
      const isFocusModeTask = task.section_id === null || focusModeSectionIds.has(task.section_id);
      const isDoToday = task.recurring_type !== 'none' || !doTodayOffIds.has(task.original_task_id || task.id);
      if (isFocusModeTask && isDoToday) {
        count++;
      }
    });
    return count;
  }, [userId, loading, sectionsData, allUserTasks, doTodayOffIds, todayStart]);

  // Real-time subscriptions are now handled in useTaskSections, useTaskCategories, and useDoTodayLog.
  // The tasks query is invalidated by those hooks when relevant changes occur.

  return { dailyTaskCount, loading };
};