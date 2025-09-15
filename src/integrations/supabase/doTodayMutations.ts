import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { QueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/utils/toast';
import { Task } from '@/hooks/useTasks';

interface MutationContext {
  userId: string;
  queryClient: QueryClient;
  invalidateTasksQueries: () => void;
}

export const toggleDoTodayMutation = async (
  task: Task,
  currentDate: Date,
  doTodayOffIds: Set<string>,
  { userId, queryClient, invalidateTasksQueries }: MutationContext
) => {
  const taskIdToLog = task.original_task_id || task.id;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');
  const isCurrentlyOff = doTodayOffIds.has(taskIdToLog);

  queryClient.setQueryData(['do_today_off_log', userId, formattedDate], (oldSet: Set<string> | undefined) => {
      const newSet = new Set(oldSet || []);
      if (isCurrentlyOff) {
          newSet.delete(taskIdToLog);
      } else {
          newSet.add(taskIdToLog);
      }
      return newSet;
  });

  try {
      if (isCurrentlyOff) {
          const { error } = await supabase
              .from('do_today_off_log')
              .delete()
              .eq('user_id', userId)
              .eq('task_id', taskIdToLog)
              .eq('off_date', formattedDate);
          if (error) throw error;
      } else {
          const { error } = await supabase
              .from('do_today_off_log')
              .insert({ user_id: userId, task_id: taskIdToLog, off_date: formattedDate });
          if (error) throw error;
      }
      invalidateTasksQueries();
      queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] });
  } catch (e: any) {
      showError("Failed to sync 'Do Today' setting.");
      console.error("Error toggling Do Today:", e);
      invalidateTasksQueries();
      queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] });
  }
};

export const toggleAllDoTodayMutation = async (
  finalFilteredTasks: Task[],
  currentDate: Date,
  doTodayOffIds: Set<string>,
  { userId, queryClient, invalidateTasksQueries }: MutationContext
) => {
  const nonRecurringTasks = finalFilteredTasks.filter(t => t.recurring_type === 'none');
  if (nonRecurringTasks.length === 0) {
    showSuccess("No non-recurring tasks to toggle.");
    return;
  }

  const nonRecurringTaskIds = nonRecurringTasks.map(t => t.original_task_id || t.id);
  const currentlyOnCount = nonRecurringTasks.filter(t => !doTodayOffIds.has(t.original_task_id || t.id)).length;
  const turnAllOff = currentlyOnCount > nonRecurringTaskIds.length / 2;

  const formattedDate = format(currentDate, 'yyyy-MM-dd');
  
  queryClient.setQueryData(['do_today_off_log', userId, formattedDate], (oldSet: Set<string> | undefined) => {
      const newSet = new Set(oldSet || []);
      if (turnAllOff) {
          nonRecurringTaskIds.forEach(id => newSet.add(id));
      } else {
          nonRecurringTaskIds.forEach(id => newSet.delete(id));
      }
      return newSet;
  });

  try {
      await supabase.from('do_today_off_log').delete().eq('user_id', userId).eq('off_date', formattedDate);

      if (turnAllOff) {
          const recordsToInsert = nonRecurringTaskIds.map(taskId => ({ user_id: userId, task_id: taskId, off_date: formattedDate }));
          if (recordsToInsert.length > 0) {
              const { error } = await supabase.from('do_today_off_log').insert(recordsToInsert);
              if (error) throw error;
          }
          showSuccess("All tasks toggled off for today.");
      } else {
          showSuccess("All tasks toggled on for today.");
      }
      invalidateTasksQueries();
      queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] });
  } catch (e: any) {
      showError("Failed to sync 'Do Today' settings.");
      console.error("Error toggling all Do Today:", e);
      invalidateTasksQueries();
      queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] });
  }
};