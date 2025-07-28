import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { startOfDay, endOfDay, parseISO, isSameDay, isBefore } from 'date-fns';

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

export const useDailyTaskCount = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [dailyTaskCount, setDailyTaskCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDailyTaskCount = useCallback(async () => {
    if (!userId) {
      setDailyTaskCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const todayStart = startOfDay(new Date());

      // 1. Fetch sections included in focus mode
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('task_sections')
        .select('id')
        .eq('user_id', userId)
        .eq('include_in_focus_mode', true);

      if (sectionsError) throw sectionsError;
      const focusModeSectionIds = new Set(sectionsData?.map(s => s.id) || []);

      // 2. Fetch all 'to-do' tasks for the user that could potentially be relevant for today
      const { data: allUserTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status, created_at, original_task_id, section_id, recurring_type, parent_task_id')
        .eq('user_id', userId)
        .eq('status', 'to-do'); // Only interested in 'to-do' tasks for the count

      if (tasksError) throw tasksError;

      let count = 0;
      if (allUserTasks) {
        const relevantTasksForToday: DailyCountTask[] = [];
        const processedOriginalIds = new Set<string>();

        // Filter for top-level tasks (not sub-tasks)
        const topLevelTasks = (allUserTasks as DailyCountTask[]).filter(task => task.parent_task_id === null);

        topLevelTasks.forEach(task => {
          const taskCreatedAt = startOfDay(parseISO(task.created_at)); // Use startOfDay for comparison
          const originalId = task.original_task_id || task.id;

          if (task.recurring_type !== 'none') {
            if (processedOriginalIds.has(originalId)) {
              return; // Skip if this original recurring task has already been processed
            }

            const allInstancesOfThisRecurringTask = (allUserTasks as DailyCountTask[]).filter(t =>
              t.original_task_id === originalId || t.id === originalId
            );

            let taskToDisplay: DailyCountTask | null = null;

            // Check for an instance created specifically for the current day
            const instanceForCurrentDay = allInstancesOfThisRecurringTask.find(t =>
              isSameDay(startOfDay(parseISO(t.created_at)), todayStart) && t.status !== 'archived'
            );
            
            if (instanceForCurrentDay) {
              taskToDisplay = instanceForCurrentDay;
            } else {
              // If no instance for today, check for a carry-over 'to-do' task from a previous day
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
            processedOriginalIds.add(originalId); // Mark original task as processed
          } else { // Non-recurring task
            const isTaskCreatedOnCurrentDate = isSameDay(taskCreatedAt, todayStart);
            if (isTaskCreatedOnCurrentDate && task.status !== 'archived') {
              relevantTasksForToday.push(task);
            } else if (isBefore(taskCreatedAt, todayStart) && task.status === 'to-do') {
              relevantTasksForToday.push(task);
            }
          }
        });

        // Now filter the relevant tasks by focus mode sections
        relevantTasksForToday.forEach(task => {
          const isFocusModeTask = task.section_id === null || focusModeSectionIds.has(task.section_id);
          if (isFocusModeTask) {
            count++;
          }
        });
      }
      setDailyTaskCount(count);
    } catch (error) {
      console.error('Error fetching daily task count:', error);
      setDailyTaskCount(0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDailyTaskCount();

    // Set up real-time subscription for tasks and sections to update count
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
        (payload) => {
          console.log('Task change received for daily count!', payload);
          fetchDailyTaskCount();
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
        (payload) => {
          console.log('Section change received for daily count!', payload);
          fetchDailyTaskCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(sectionsChannel);
    };
  }, [userId, fetchDailyTaskCount]);

  return { dailyTaskCount, loading };
};