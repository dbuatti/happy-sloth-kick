import { showSuccess, showError } from '@/utils/toast';
import { Task, TaskUpdate, MutationContext } from '@/hooks/useTasks';
import { format, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Helper to add task (used by handleAddTask)
export const addTaskMutation = async (
  newTaskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'category_color' | 'isDoTodayOff'> & { order: number | null },
  context: MutationContext
): Promise<string | null> => {
  const { userId, queryClient, inFlightUpdatesRef, categoriesMap, invalidateTasksQueries, scheduleReminder } = context;

  const tempId = `temp-${uuidv4()}`;
  const optimisticTask: Task = {
    ...newTaskData,
    id: tempId,
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null,
    category_color: categoriesMap.get(newTaskData.category || '') || 'gray',
    isDoTodayOff: newTaskData.recurring_type === 'none' ? true : false, // Default to off for non-recurring
  };

  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    return old ? [...old, optimisticTask] : [optimisticTask];
  });
  inFlightUpdatesRef.current.add(tempId);

  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...newTaskData, user_id: userId })
      .select()
      .single();

    if (error) throw error;

    queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
      return old ? old.map(task => (task.id === tempId ? { ...data, category_color: categoriesMap.get(data.category || '') || 'gray' } : task)) : [data];
    });
    showSuccess('Task added!');

    if (data.remind_at && data.status === 'to-do') {
      const d = new Date(data.remind_at);
      if (isValid(d)) scheduleReminder(data.id, `Reminder: ${data.description}`, d);
    }

    invalidateTasksQueries();
    return data.id;
  } catch (error: any) {
    queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
      return old ? old.filter(task => task.id !== tempId) : [];
    });
    showError('Failed to add task.');
    console.error('Error adding task:', error.message);
    return null;
  } finally {
    inFlightUpdatesRef.current.delete(tempId);
  }
};

// Helper to update task (used by updateTask)
export const updateTaskMutation = async (
  taskId: string,
  updates: TaskUpdate,
  context: MutationContext
): Promise<string | null> => {
  const { userId, queryClient, inFlightUpdatesRef, categoriesMap, invalidateTasksQueries, scheduleReminder, cancelReminder } = context;

  const optimisticUpdate = { ...updates, updated_at: new Date().toISOString() };

  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    return old ? old.map(task => (task.id === taskId ? { ...task, ...optimisticUpdate, category_color: categoriesMap.get(updates.category || task.category || '') || 'gray' } : task)) : [];
  });
  inFlightUpdatesRef.current.add(taskId);

  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    if (data.remind_at && data.status === 'to-do') {
      const d = new Date(data.remind_at);
      if (isValid(d)) scheduleReminder(data.id, `Reminder: ${data.description}`, d);
    } else if (data.status === 'completed' || data.status === 'archived' || data.remind_at === null) {
      cancelReminder(data.id);
    }

    invalidateTasksQueries();
    return data.id;
  } catch (error: any) {
    showError('Failed to update task.');
    console.error('Error updating task:', error.message);
    invalidateTasksQueries(); // Re-fetch to revert optimistic update on error
    return null;
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
  }
};

// Helper to delete task (used by deleteTask)
export const deleteTaskMutation = async (
  taskId: string,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, cancelReminder } = context;

  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    return old ? old.filter(task => task.id !== taskId && task.parent_task_id !== taskId) : [];
  });
  inFlightUpdatesRef.current.add(taskId);

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .or(`id.eq.${taskId},parent_task_id.eq.${taskId}`)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('Task deleted!');
    cancelReminder(taskId);
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to delete task.');
    console.error('Error deleting task:', error.message);
    invalidateTasksQueries(); // Re-fetch to revert optimistic update on error
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
  }
};

// Helper for bulk update tasks
export const bulkUpdateTasksMutation = async (
  updates: Partial<Task>,
  ids: string[],
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, categoriesMap, scheduleReminder, cancelReminder } = context;

  const optimisticUpdate = { ...updates, updated_at: new Date().toISOString() };

  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    return old ? old.map(task => (ids.includes(task.id) ? { ...task, ...optimisticUpdate, category_color: categoriesMap.get(updates.category || task.category || '') || 'gray' } : task)) : [];
  });
  ids.forEach(id => inFlightUpdatesRef.current.add(id));

  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .in('id', ids)
      .eq('user_id', userId)
      .select();

    if (error) throw error;

    showSuccess(`${data.length} tasks updated!`);
    data.forEach(task => {
      if (task.remind_at && task.status === 'to-do') {
        const d = new Date(task.remind_at);
        if (isValid(d)) scheduleReminder(task.id, `Reminder: ${task.description}`, d);
      } else if (task.status === 'completed' || task.status === 'archived' || task.remind_at === null) {
        cancelReminder(task.id);
      }
    });
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to bulk update tasks.');
    console.error('Error bulk updating tasks:', error.message);
    invalidateTasksQueries(); // Re-fetch to revert optimistic update on error
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
  }
};

// Helper for bulk delete tasks
export const bulkDeleteTasksMutation = async (
  ids: string[],
  context: MutationContext
): Promise<boolean> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, cancelReminder } = context;

  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    return old ? old.filter(task => !ids.includes(task.id) && !ids.includes(task.parent_task_id || '')) : [];
  });
  ids.forEach(id => inFlightUpdatesRef.current.add(id));

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess(`${ids.length} tasks deleted!`);
    ids.forEach(id => cancelReminder(id));
    invalidateTasksQueries();
    return true;
  } catch (error: any) {
    showError('Failed to bulk delete tasks.');
    console.error('Error bulk deleting tasks:', error.message);
    invalidateTasksQueries(); // Re-fetch to revert optimistic update on error
    return false;
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
  }
};

// Helper to archive all completed tasks
export const archiveAllCompletedTasksMutation = async (
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, processedTasks, invalidateTasksQueries } = context;
  const completedTaskIds = processedTasks.filter(task => task.status === 'completed').map(task => task.id);

  if (completedTaskIds.length === 0) {
    showSuccess('No completed tasks to archive.');
    return;
  }

  const updates = { status: 'archived', updated_at: new Date().toISOString() };

  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    return old ? old.map(task => (completedTaskIds.includes(task.id) ? { ...task, ...updates } : task)) : [];
  });
  completedTaskIds.forEach(id => inFlightUpdatesRef.current.add(id));

  try {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .in('id', completedTaskIds)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess(`${completedTaskIds.length} completed tasks archived!`);
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to archive completed tasks.');
    console.error('Error archiving completed tasks:', error.message);
    invalidateTasksQueries(); // Re-fetch to revert optimistic update on error
  } finally {
    completedTaskIds.forEach(id => inFlightUpdatesRef.current.delete(id));
  }
};

// Helper to mark all tasks in a section as completed
export const markAllTasksInSectionCompletedMutation = async (
  sectionId: string | null,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, processedTasks, invalidateTasksQueries } = context;
  const tasksToCompleteIds = processedTasks
    .filter(task => task.section_id === sectionId && task.status === 'to-do' && task.parent_task_id === null)
    .map(task => task.id);

  if (tasksToCompleteIds.length === 0) {
    showSuccess('No pending tasks in this section to complete.');
    return;
  }

  const updates = { status: 'completed', updated_at: new Date().toISOString(), completed_at: new Date().toISOString() };

  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    return old ? old.map(task => (tasksToCompleteIds.includes(task.id) ? { ...task, ...updates } : task)) : [];
  });
  tasksToCompleteIds.forEach(id => inFlightUpdatesRef.current.add(id));

  try {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .in('id', tasksToCompleteIds)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess(`${tasksToCompleteIds.length} tasks marked as completed!`);
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to mark tasks as completed.');
    console.error('Error marking tasks as completed:', error.message);
    invalidateTasksQueries(); // Re-fetch to revert optimistic update on error
  } finally {
    tasksToCompleteIds.forEach(id => inFlightUpdatesRef.current.delete(id));
  }
};

// Helper to update task parent and order
export const updateTaskParentAndOrderMutation = async (
  activeId: string,
  newParentId: string | null,
  newSectionId: string | null,
  overId: string | null,
  isDraggingDown: boolean,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, processedTasks, sections, invalidateTasksQueries } = context;

  const activeTask = processedTasks.find(t => t.id === activeId);
  if (!activeTask) return;

  const tasksInTargetSectionOrParent = processedTasks.filter(t =>
    (newParentId ? t.parent_task_id === newParentId : t.parent_task_id === null) &&
    (newSectionId ? t.section_id === newSectionId : t.section_id === null)
  ).sort((a, b) => (a.order || 0) - (b.order || 0));

  let newOrder = 0;
  if (overId) {
    const overTaskIndex = tasksInTargetSectionOrParent.findIndex(t => t.id === overId);
    if (overTaskIndex !== -1) {
      newOrder = isDraggingDown ? overTaskIndex + 1 : overTaskIndex;
    }
  } else {
    newOrder = tasksInTargetSectionOrParent.length;
  }

  // Adjust orders of other tasks in the target list
  const updatedTasksForOrder: { id: string; order: number; parent_task_id: string | null; section_id: string | null; user_id: string; }[] = [];
  let currentOrder = 0;
  for (const task of tasksInTargetSectionOrParent) {
    if (task.id === activeId) continue; // Skip the active task for now

    if (currentOrder === newOrder) {
      currentOrder++; // Make space for the active task
    }
    if (task.order !== currentOrder) {
      updatedTasksForOrder.push({
        id: task.id,
        order: currentOrder,
        parent_task_id: task.parent_task_id,
        section_id: task.section_id,
        user_id: userId,
      });
    }
    currentOrder++;
  }

  if (currentOrder === newOrder) { // If newOrder is at the very end
    currentOrder++;
  }

  updatedTasksForOrder.push({
    id: activeId,
    order: newOrder,
    parent_task_id: newParentId,
    section_id: newSectionId,
    user_id: userId,
  });

  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    if (!old) return [];
    const updatedOld = old.map(task => {
      const update = updatedTasksForOrder.find(u => u.id === task.id);
      return update ? { ...task, order: update.order, parent_task_id: update.parent_task_id, section_id: update.section_id } : task;
    });
    return updatedOld;
  });
  updatedTasksForOrder.forEach(u => inFlightUpdatesRef.current.add(u.id));

  try {
    const { error } = await supabase
      .from('tasks')
      .upsert(updatedTasksForOrder, { onConflict: 'id' });

    if (error) throw error;

    showSuccess('Task order updated!');
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to reorder task.');
    console.error('Error reordering task:', error.message);
    invalidateTasksQueries(); // Revert optimistic update on error
  } finally {
    updatedTasksForOrder.forEach(u => inFlightUpdatesRef.current.delete(u.id));
  }
};

export const toggleDoTodayMutation = async (
  task: Task,
  currentDate: Date,
  doTodayOffIds: Set<string>,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const originalTaskId = task.original_task_id || task.id;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');
  const isCurrentlyOff = doTodayOffIds.has(originalTaskId);

  // Optimistic update
  queryClient.setQueryData(['do_today_off_log', userId, formattedDate], (old: Set<string> | undefined) => {
    const newSet = new Set(old || []);
    if (isCurrentlyOff) {
      newSet.delete(originalTaskId);
    } else {
      newSet.add(originalTaskId);
    }
    return newSet;
  });
  inFlightUpdatesRef.current.add(originalTaskId); // Use originalTaskId for tracking

  try {
    if (isCurrentlyOff) {
      // Remove from do_today_off_log
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('user_id', userId)
        .eq('task_id', originalTaskId)
        .eq('off_date', formattedDate);
      if (error) throw error;
      showSuccess('Task added to "Do Today"!');
    } else {
      // Add to do_today_off_log
      const { error } = await supabase
        .from('do_today_off_log')
        .insert({ user_id: userId, task_id: originalTaskId, off_date: formattedDate });
      if (error) throw error;
      showSuccess('Task removed from "Do Today".');
    }
    invalidateTasksQueries(); // Invalidate tasks to re-render with new doToday status
  } catch (error: any) {
    showError(`Failed to update "Do Today" status: ${error.message}`);
    console.error('Error toggling Do Today:', error.message);
    invalidateTasksQueries(); // Revert optimistic update on error
  } finally {
    inFlightUpdatesRef.current.delete(originalTaskId);
  }
};

export const toggleAllDoTodayMutation = async (
  filteredTasks: Task[],
  currentDate: Date,
  doTodayOffIds: Set<string>,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');

  const tasksToToggle = filteredTasks.filter(task => task.parent_task_id === null && task.recurring_type === 'none');
  if (tasksToToggle.length === 0) {
    showSuccess('No non-recurring tasks to toggle "Do Today" status.');
    return;
  }

  const allAreOff = tasksToToggle.every(task => doTodayOffIds.has(task.original_task_id || task.id));

  // Optimistic update
  queryClient.setQueryData(['do_today_off_log', userId, formattedDate], (old: Set<string> | undefined) => {
    const newSet = new Set(old || []);
    tasksToToggle.forEach(task => {
      const originalId = task.original_task_id || task.id;
      if (allAreOff) {
        newSet.delete(originalId);
      } else {
        newSet.add(originalId);
      }
    });
    return newSet;
  });
  tasksToToggle.forEach(task => inFlightUpdatesRef.current.add(task.original_task_id || task.id));

  try {
    if (allAreOff) {
      // Delete all from do_today_off_log for these tasks
      const idsToDelete = tasksToToggle.map(task => task.original_task_id || task.id);
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .in('task_id', idsToDelete)
        .eq('user_id', userId)
        .eq('off_date', formattedDate);
      if (error) throw error;
      showSuccess('All tasks added to "Do Today"!');
    } else {
      // Insert all into do_today_off_log for these tasks
      const recordsToInsert = tasksToToggle
        .filter(task => !doTodayOffIds.has(task.original_task_id || task.id)) // Only insert if not already off
        .map(task => ({
          user_id: userId,
          task_id: task.original_task_id || task.id,
          off_date: formattedDate,
        }));
      if (recordsToInsert.length > 0) {
        const { error } = await supabase
          .from('do_today_off_log')
          .insert(recordsToInsert);
        if (error) throw error;
      }
      showSuccess('All tasks removed from "Do Today".');
    }
    invalidateTasksQueries();
  } catch (error: any) {
    showError(`Failed to toggle all "Do Today" statuses: ${error.message}`);
    console.error('Error toggling all Do Today:', error.message);
    invalidateTasksQueries();
  } finally {
    tasksToToggle.forEach(task => inFlightUpdatesRef.current.delete(task.original_task_id || task.id));
  }
};