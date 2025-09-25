import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Task, TaskSection, NewTaskData, TaskUpdate } from '@/hooks/useTasks';
import { QueryClient } from '@tanstack/react-query';
import { format, parseISO, isValid, startOfDay, addDays, isBefore } from 'date-fns';
import { arrayMove } from '@dnd-kit/sortable';

interface MutationContext {
  userId: string;
  queryClient: QueryClient;
  inFlightUpdatesRef: React.MutableRefObject<Set<string>>;
  categoriesMap: Map<string, string>;
  invalidateTasksQueries: () => void;
  invalidateSectionsQueries: () => void;
  invalidateCategoriesQueries: () => void;
  processedTasks: Task[];
  sections: TaskSection[];
  addReminder: (id: string, message: string, date: Date) => void;
  dismissReminder: (id: string) => void;
}

// Helper to add an item to inFlightUpdates and return a cleanup function
const trackInFlight = (id: string, inFlightUpdatesRef: React.MutableRefObject<Set<string>>) => {
  inFlightUpdatesRef.current.add(id);
  return () => inFlightUpdatesRef.current.delete(id);
};

export const addTaskMutation = async (newTaskData: NewTaskData, context: MutationContext): Promise<string | null> => {
  const { userId, queryClient, inFlightUpdatesRef, categoriesMap, invalidateTasksQueries, addReminder } = context;
  const cleanup = trackInFlight('add-task', inFlightUpdatesRef);

  try {
    const categoryColor = categoriesMap.get(newTaskData.category || '') || 'gray';

    const taskToInsert: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'category_color'> & { order?: number | null } = {
      description: newTaskData.description,
      status: newTaskData.status || 'to-do',
      recurring_type: newTaskData.recurring_type || 'none',
      category: newTaskData.category || null,
      priority: newTaskData.priority || 'medium',
      due_date: newTaskData.due_date ?? null, // Ensure undefined becomes null
      notes: newTaskData.notes ?? null,       // Ensure undefined becomes null
      remind_at: newTaskData.remind_at ?? null, // Ensure undefined becomes null
      section_id: newTaskData.section_id ?? null,
      parent_task_id: newTaskData.parent_task_id ?? null,
      original_task_id: newTaskData.original_task_id ?? null,
      link: newTaskData.link ?? null,         // Ensure undefined becomes null
      image_url: newTaskData.image_url ?? null, // Ensure undefined becomes null
      order: newTaskData.order ?? null,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...taskToInsert, user_id: userId })
      .select()
      .single();

    if (error) throw error;

    queryClient.setQueryData(['tasks', userId], (old: Omit<Task, 'category_color'>[] | undefined) => {
      const newTasks = old ? [...old, data] : [data];
      return newTasks;
    });

    if (data.remind_at && data.status === 'to-do') {
      const d = parseISO(data.remind_at);
      if (isValid(d)) addReminder(data.id, `Reminder: ${data.description}`, d);
    }

    showSuccess('Task added successfully!');
    return data.id;
  } catch (error: any) {
    showError('Failed to add task.');
    console.error('Error adding task:', error.message);
    return null;
  } finally {
    cleanup();
    invalidateTasksQueries();
  }
};

export const updateTaskMutation = async (taskId: string, updates: TaskUpdate, context: MutationContext): Promise<string | null> => {
  const { userId, queryClient, inFlightUpdatesRef, categoriesMap, invalidateTasksQueries, addReminder, dismissReminder } = context;
  const cleanup = trackInFlight(taskId, inFlightUpdatesRef);

  try {
    const tasksInCache = (queryClient.getQueryData(['tasks', userId]) || []) as Task[];
    const currentTask = tasksInCache.find((t: Task) => t.id === taskId);
    const categoryColor = updates.category ? categoriesMap.get(updates.category) || 'gray' : currentTask?.category_color || 'gray';

    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    queryClient.setQueryData(['tasks', userId], (old: Omit<Task, 'category_color'>[] | undefined) => {
      return old ? old.map(task => (task.id === taskId ? { ...task, ...data, category_color: categoryColor } : task)) : [];
    });

    if (data.remind_at && data.status === 'to-do') {
      const d = parseISO(data.remind_at);
      if (isValid(d)) addReminder(data.id, `Reminder: ${data.description}`, d);
    } else if (data.status === 'completed' || data.status === 'archived' || data.remind_at === null) {
      dismissReminder(data.id);
    }

    showSuccess('Task updated successfully!');
    return data.id;
  } catch (error: any) {
    showError('Failed to update task.');
    console.error('Error updating task:', error.message);
    return null;
  } finally {
    cleanup();
    invalidateTasksQueries();
  }
};

export const deleteTaskMutation = async (taskId: string, context: MutationContext): Promise<boolean> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;
  const cleanup = trackInFlight(taskId, inFlightUpdatesRef);

  try {
    // Optimistically remove from cache
    queryClient.setQueryData(['tasks', userId], (old: Omit<Task, 'category_color'>[] | undefined) => {
      return old ? old.filter(task => task.id !== taskId && task.parent_task_id !== taskId) : [];
    });
    dismissReminder(taskId);

    const { error } = await supabase
      .from('tasks')
      .delete()
      .or(`id.eq.${taskId},parent_task_id.eq.${taskId}`)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('Task deleted successfully!');
    return true;
  } catch (error: any) {
    showError('Failed to delete task.');
    console.error('Error deleting task:', error.message);
    invalidateTasksQueries(); // Revert optimistic update on error
    return false;
  } finally {
    cleanup();
    invalidateTasksQueries();
  }
};

export const bulkUpdateTasksMutation = async (updates: Partial<Task>, ids: string[], context: MutationContext): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, addReminder, dismissReminder } = context;
  const cleanup = trackInFlight('bulk-update', inFlightUpdatesRef);

  try {
    // Optimistic update
    queryClient.setQueryData(['tasks', userId], (old: Omit<Task, 'category_color'>[] | undefined) => {
      return old ? old.map(task => {
        if (ids.includes(task.id)) {
          const updatedTask = { ...task, ...updates };
          if (updatedTask.remind_at && updatedTask.status === 'to-do') {
            const d = parseISO(updatedTask.remind_at);
            if (isValid(d)) addReminder(updatedTask.id, `Reminder: ${updatedTask.description}`, d);
          } else if (updatedTask.status === 'completed' || updatedTask.status === 'archived' || updatedTask.remind_at === null) {
            dismissReminder(updatedTask.id);
          }
          return updatedTask;
        }
        return task;
      }) : [];
    });

    const { error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('Tasks updated successfully!');
  } catch (error: any) {
    showError('Failed to bulk update tasks.');
    console.error('Error bulk updating tasks:', error.message);
    invalidateTasksQueries(); // Revert optimistic update on error
  } finally {
    cleanup();
    invalidateTasksQueries();
  }
};

export const bulkDeleteTasksMutation = async (ids: string[], context: MutationContext): Promise<boolean> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;
  const cleanup = trackInFlight('bulk-delete', inFlightUpdatesRef);

  try {
    // Optimistically remove from cache
    queryClient.setQueryData(['tasks', userId], (old: Omit<Task, 'category_color'>[] | undefined) => {
      return old ? old.filter(task => !ids.includes(task.id) && !ids.includes(task.parent_task_id || '')) : [];
    });
    ids.forEach(id => dismissReminder(id));

    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('Tasks deleted successfully!');
    return true;
  } catch (error: any) {
    showError('Failed to bulk delete tasks.');
    console.error('Error bulk deleting tasks:', error.message);
    invalidateTasksQueries(); // Revert optimistic update on error
    return false;
  } finally {
    cleanup();
    invalidateTasksQueries();
  }
};

export const archiveAllCompletedTasksMutation = async (context: MutationContext): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const cleanup = trackInFlight('archive-all-completed', inFlightUpdatesRef);

  try {
    // Optimistic update
    queryClient.setQueryData(['tasks', userId], (old: Omit<Task, 'category_color'>[] | undefined) => {
      return old ? old.map(task =>
        task.status === 'completed' ? { ...task, status: 'archived', updated_at: new Date().toISOString() } : task
      ) : [];
    });

    const { error } = await supabase
      .from('tasks')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (error) throw error;

    showSuccess('All completed tasks archived!');
  } catch (error: any) {
    showError('Failed to archive completed tasks.');
    console.error('Error archiving completed tasks:', error.message);
    invalidateTasksQueries(); // Revert optimistic update on error
  } finally {
    cleanup();
    invalidateTasksQueries();
  }
};

export const markAllTasksInSectionCompletedMutation = async (sectionId: string | null, context: MutationContext): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const cleanup = trackInFlight(`mark-all-completed-${sectionId || 'no-section'}`, inFlightUpdatesRef);

  try {
    // Optimistic update
    queryClient.setQueryData(['tasks', userId], (old: Omit<Task, 'category_color'>[] | undefined) => {
      return old ? old.map(task => {
        const matchesSection = sectionId === null ? task.section_id === null : task.section_id === sectionId;
        if (matchesSection && task.status === 'to-do') {
          return { ...task, status: 'completed', updated_at: new Date().toISOString(), completed_at: new Date().toISOString() };
        }
        return task;
      }) : [];
    });

    const query = supabase
      .from('tasks')
      .update({ status: 'completed', updated_at: new Date().toISOString(), completed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'to-do');

    if (sectionId === null) {
      query.is('section_id', null);
    } else {
      query.eq('section_id', sectionId);
    }

    const { error } = await query;

    if (error) throw error;

    showSuccess('All tasks in section marked completed!');
  } catch (error: any) {
    showError('Failed to mark all tasks in section completed.');
    console.error('Error marking all tasks in section completed:', error.message);
    invalidateTasksQueries(); // Revert optimistic update on error
  } finally {
    cleanup();
    invalidateTasksQueries();
  }
};

export const updateTaskParentAndOrderMutation = async (
  activeId: string,
  newParentId: string | null,
  newSectionId: string | null,
  overId: string | null,
  _isDraggingDown: boolean, // Removed TS6133 warning
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, processedTasks } = context;
  const cleanup = trackInFlight(activeId, inFlightUpdatesRef);

  try {
    const activeTask = processedTasks.find(t => t.id === activeId);
    if (!activeTask) throw new Error('Active task not found.');

    const tasksInTargetSection = processedTasks.filter(t =>
      t.parent_task_id === newParentId &&
      (newParentId ? true : (t.section_id === newSectionId)) // If no parent, filter by section
    ).sort((a, b) => (a.order || 0) - (b.order || 0));

    let newOrder = 0;
    if (overId) {
      const overTaskIndex = tasksInTargetSection.findIndex(t => t.id === overId);
      if (overTaskIndex !== -1) {
        const overTask = tasksInTargetSection[overTaskIndex];
        if (overTaskIndex > 0) {
          const prevTask = tasksInTargetSection[overTaskIndex - 1];
          newOrder = (prevTask.order! + overTask.order!) / 2;
        } else {
          newOrder = (overTask.order! / 2);
        }
      } else {
        newOrder = (tasksInTargetSection[tasksInTargetSection.length - 1]?.order || 0) + 1;
      }
    } else {
      newOrder = (tasksInTargetSection[tasksInTargetSection.length - 1]?.order || 0) + 1;
    }

    const updates: Partial<Task> = {
      parent_task_id: newParentId,
      section_id: newSectionId,
      order: newOrder,
      updated_at: new Date().toISOString(),
    };

    // Optimistic update
    queryClient.setQueryData(['tasks', userId], (old: Omit<Task, 'category_color'>[] | undefined) => {
      if (!old) return [];
      const updatedTasks = old.map(task => (task.id === activeId ? { ...task, ...updates } : task));
      return updatedTasks;
    });

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', activeId)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('Task reordered successfully!');
  } catch (error: any) {
    showError('Failed to reorder task.');
    console.error('Error reordering task:', error.message);
    invalidateTasksQueries(); // Revert optimistic update on error
  } finally {
    cleanup();
    invalidateTasksQueries();
  }
};

export const toggleDoTodayMutation = async (task: Task, currentDate: Date, doTodayOffIds: Set<string>, context: MutationContext): Promise<boolean> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const cleanup = trackInFlight(`toggle-do-today-${task.id}`, inFlightUpdatesRef);

  try {
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    const isCurrentlyOff = doTodayOffIds.has(task.original_task_id || task.id);

    if (isCurrentlyOff) {
      // Remove from do_today_off_log
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('user_id', userId)
        .eq('task_id', task.original_task_id || task.id)
        .eq('off_date', formattedDate);
      if (error) throw error;
      showSuccess('Task added back to "Do Today"!');
    } else {
      // Add to do_today_off_log
      const { error } = await supabase
        .from('do_today_off_log')
        .insert({
          user_id: userId,
          task_id: task.original_task_id || task.id,
          off_date: formattedDate,
        });
      if (error) throw error;
      showSuccess('Task removed from "Do Today" for today.');
    }
    return true;
  } catch (error: any) {
    showError('Failed to update "Do Today" status.');
    console.error('Error toggling Do Today:', error.message);
    return false;
  } finally {
    cleanup();
    invalidateTasksQueries();
  }
};

export const toggleAllDoTodayMutation = async (tasks: Task[], currentDate: Date, doTodayOffIds: Set<string>, context: MutationContext): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const cleanup = trackInFlight('toggle-all-do-today', inFlightUpdatesRef);

  try {
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    const tasksToToggle = tasks.filter(t => t.parent_task_id === null && t.status === 'to-do');

    const allCurrentlyOn = tasksToToggle.every(t => !doTodayOffIds.has(t.original_task_id || t.id));

    if (allCurrentlyOn) {
      // Turn all off
      const recordsToInsert = tasksToToggle.map(task => ({
        user_id: userId,
        task_id: task.original_task_id || task.id,
        off_date: formattedDate,
      }));
      const { error } = await supabase
        .from('do_today_off_log')
        .insert(recordsToInsert);
      if (error) throw error;
      showSuccess('All tasks removed from "Do Today" for today.');
    } else {
      // Turn all on (delete all relevant entries from log)
      const taskIdsToTurnOn = tasksToToggle.map(t => t.original_task_id || t.id);
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('user_id', userId)
        .eq('off_date', formattedDate)
        .in('task_id', taskIdsToTurnOn);
      if (error) throw error;
      showSuccess('All tasks added back to "Do Today"!');
    }
  } catch (error: any) {
    showError('Failed to toggle all "Do Today" tasks.');
    console.error('Error toggling all Do Today:', error.message);
  } finally {
    cleanup();
    invalidateTasksQueries();
  }
};