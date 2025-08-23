import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskSection } from '@/types';
import { startOfDay, isSameDay } from 'date-fns';

// Re-use the fetchSections function from useTasks
const fetchSections = async (userId: string): Promise<TaskSection[]> => {
  const { data, error } = await supabase
    .from('task_sections')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });
  if (error) throw error;
  return data as TaskSection[];
};

export const useDailyTaskCount = (tasks: Task[] | undefined) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const { data: sectionsData, isLoading: isLoadingSections } = useQuery<TaskSection[], Error>({
    queryKey: ['task_sections', userId], // Use the same query key as useTasks
    queryFn: () => fetchSections(userId!), // Re-use the fetchSections function
    enabled: !!userId && !authLoading,
  });

  const dailyTaskCount = useMemo(() => {
    if (!tasks || !sectionsData) return 0;

    let count = 0;
    const focusModeSectionIds = new Set((sectionsData as TaskSection[]).filter(s => s.include_in_focus_mode).map(s => s.id));
    const processedOriginalIds = new Set<string>();

    const today = startOfDay(new Date());

    tasks.forEach(task => {
      // Only count top-level tasks
      if (task.parent_task_id !== null) {
        return;
      }

      // Only count tasks that are not completed
      if (task.status === 'completed') {
        return;
      }

      const isFocusModeTask = task.section_id && focusModeSectionIds.has(task.section_id);
      const isDueToday = task.due_date && isSameDay(new Date(task.due_date), today);
      const isRecurringDaily = task.recurring_type === 'daily';

      if (isFocusModeTask || isDueToday || isRecurringDaily) {
        // For recurring tasks, only count the original task once if it's the "template"
        if (task.recurring_type !== 'none' && task.original_task_id) {
          if (!processedOriginalIds.has(task.original_task_id)) {
            count++;
            processedOriginalIds.add(task.original_task_id);
          }
        } else {
          count++;
        }
      }
    });
    return count;
  }, [tasks, sectionsData]);

  return {
    dailyTaskCount,
    isLoading: isLoadingSections,
  };
};