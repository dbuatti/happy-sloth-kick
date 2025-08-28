import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { startOfDay, parseISO, isSameDay, isBefore, format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Define a minimal Task type for this hook, including necessary fields for filtering
interface DailyCountTask {
  id: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  created_at: string;
  original_task_id: string | null;
  section_id: string | null;
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  parent_task_id: string | null; // Added parent_task_id
}

// Import standalone fetch functions
import { fetchSections, fetchTasks, TaskSection, Task } from './useTasks';
import { fetchDoTodayOffLog } from './useDoTodayOffLog'; // Corrected import path

export const useDailyTaskCount = (props?: { userId?: string }) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;
  const queryClient = useQueryClient();

  const todayStart = startOfDay(new Date()); // Always use current date for daily count

  // Fetch sections included in focus mode
  const { data: sectionsData = [], isLoading: sectionsLoading } = useQuery<TaskSection[], Error>({
    queryKey: ['task_sections', userId], // Use the same query key as useTasks
    queryFn: () => fetchSections(userId!), // Re-use the fetchSections function
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch all 'to-do' tasks for the user that could potentially be relevant for today
  const { data: allUserTasks = [], isLoading: tasksLoading } = useQuery<Task[], Error>({
    queryKey: ['tasks', userId], // Use the same query key as useTasks
    queryFn: () => fetchTasks(userId!) as Promise<Task[]>, // Cast to Task[]
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });

  // Get "Do Today" off IDs
  const { data: doTodayOffIds = new Set(), isLoading: doTodayOffLoading } = useQuery<Set<string>, Error>({
    queryKey: ['do_today_off_log', userId, format(todayStart, 'yyyy-MM-dd')], // Use the same query key
    queryFn: () => fetchDoTodayOffLog(userId!, todayStart), // Use the exported fetchDoTodayOffLog function
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });

  const loading = sectionsLoading || tasksLoading || doTodayOffLoading;

  const dailyTaskCount = useMemo(() => {
    if (!userId || loading) return 0;

    let count = 0;
    const focusModeSectionIds = new Set(sectionsData.filter(s => s.include_in_focus_mode).map(s => s.id));
    const processedOriginalIds = new Set<string>();

    // Filter for top-level tasks (not sub-tasks)
    const topLevelTasks = (allUserTasks as DailyCountTask[]).filter(task => task.parent_task_id === null);

    const relevantTasksForToday: DailyCountTask[] = [];

    topLevelTasks.forEach(task => {
      const taskCreatedAt = startOfDay(parseISO(task.created_at));
      const originalId = task.original_task_id || task.id;

      if (task.recurring_type !== 'none') {
        if (processedOriginalIds.has(originalId)) {
          return;
        }

        const allInstancesOfThisRecurringTask = (allUserTasks as DailyCountTask[]).filter(t =>
          t.original_task_id === originalId || t.id === originalId
        );

        let taskToDisplay: DailyCountTask | null = null;

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

  // Real-time subscriptions to invalidate queries
  useEffect(() => {
    if (!userId) return;

    const tasksChannel = supabase
      .channel('daily_task_count_tasks_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        () => { // Removed unused payload parameter
          console.log('Task change received for daily count!');
          queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
          queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId] }); // Also invalidate do_today_off_log
        }
      )
      .subscribe();
    
    const sectionsChannel = supabase
      .channel('daily_task_count_sections_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_sections',
          filter: `user_id=eq.${userId}`,
        },
        () => { // Removed unused payload parameter
          console.log('Section change received for daily count!');
          queryClient.invalidateQueries({ queryKey: ['task_sections', userId] });
        }
      )
      .subscribe();

    const doTodayOffLogChannel = supabase
      .channel('daily_task_count_do_today_off_log_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'do_today_off_log',
          filter: `user_id=eq.${userId}`,
        },
        () => { // Removed unused payload parameter
          console.log('Do Today Off Log change received for daily count!');
          queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(sectionsChannel);
      supabase.removeChannel(doTodayOffLogChannel);
    };
  }, [userId, queryClient]);


  return { dailyTaskCount, loading };
};