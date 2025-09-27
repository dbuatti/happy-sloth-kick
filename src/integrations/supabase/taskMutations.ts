import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { format, parseISO, isValid } from 'date-fns';
import { Task, NewTaskData, TaskUpdate, MutationContext } from '@/hooks/useTasks';

// Helper to ensure task data is consistent for DB operations
const prepareTaskForDb = (task: Partial<Task>): Partial<Task> => {
  const prepared = { ...task };
  // Ensure non-nullable fields have defaults if they are being inserted/updated
  if (prepared.description === undefined) prepared.description = '';
  if (prepared.status === undefined) prepared.status = 'to-do';
  if (prepared.recurring_type === undefined) prepared.recurring_type = 'none';
  if (prepared.priority === undefined) prepared.priority = 'medium';
  if (prepared.category === undefined) prepared.category = null; // Default to null if not provided
  return prepared;
};

export const addTaskMutation = async (newTaskData: NewTaskData, context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;

  // Generate a temporary client-side ID for optimistic update
  const tempId = `temp-${Date.now()}`;
  const optimisticTask: Task = {
    id: tempId,
    user_id: userId,
    description: newTaskData.description,
    status: newTaskData.status || 'to-do',
    recurring_type: newTaskData.recurring_type || 'none',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null,
    category: newTaskData.category || null,
    category_color: context.categoriesMap.get(newTaskData.category || '') || 'gray',
    priority: newTaskData.priority || 'medium',
    due_date: newTaskData.due_date || null,
    notes: newTaskData.notes || null,
    remind_at: newTaskData.remind_at || null,
    section_id: newTaskData.section_id || null,
    order: newTaskData.order ?? null,
    original_task_id: newTaskData.original_task_id || null,
    parent_task_id: newTaskData.parent_task_id || null,
    link: newTaskData.link || null,
    image_url: newTaskData.image_url || null,
  };

  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => [...(old || []), optimisticTask]);
  inFlightUpdatesRef.current.add(tempId);

  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...prepareTaskForDb(newTaskData), user_id: userId })
      .select()
      .single();

    if (error) throw error;

    // Update optimistic task with real data
    queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
      (old || []).map(task => (task.id === tempId ? { ...data, category_color: context.categoriesMap.get(data.category || '') || 'gray' } : task))
    );
    showSuccess('Task added successfully!');

    if (data.remind_at && data.status === 'to-do') {
      const d = parseISO(data.remind_at);
      if (isValid(d)) context.scheduleReminder(data.id, `Reminder: ${data.description}`, d);
    }

    return data.id;
  } catch (error: any) {
    showError('Failed to add task.');
    console.error('Error adding task:', error.message);
    // Revert optimistic update
    queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => (old || []).filter(task => task.id !== tempId));
    return null;
  } finally {
    inFlightUpdatesRef.current.delete(tempId);
    invalidateTasksQueries();
  }
};

export const updateTaskMutation = async (taskId: string, updates: TaskUpdate, context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;

  // Optimistic update
  const previousTask = (queryClient.getQueryData(['tasks', userId]) as Task[] | undefined)?.find((t: Task) => t.id === taskId);
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    (old || []).map(task => (task.id === taskId ? { ...task, ...updates, category_color: context.categoriesMap.get(updates.category || task.category || '') || 'gray' } : task))
  );
  inFlightUpdatesRef.current.add(taskId);

  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(prepareTaskForDb(updates))
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    showSuccess('Task updated successfully!');

    if (data.remind_at && data.status === 'to-do') {
      const d = parseISO(data.remind_at);
      if (isValid(d)) context.scheduleReminder(data.id, `Reminder: ${data.description}`, d);
    } else if (data.status === 'completed' || data.status === 'archived' || data.remind_at === null) {
      context.cancelReminder(data.id);
    }

    return data.id;
  } catch (error: any) {
    showError('Failed to update task.');
    console.error('Error updating task:', error.message);
    // Revert optimistic update
    if (previousTask) {
      queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
        (old || []).map(task => (task.id === taskId ? previousTask : task))
      );
    }
    return null;
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
    invalidateTasksQueries();
  }
};

export const deleteTaskMutation = async (taskId: string, context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;

  // Optimistic update
  const previousTasks = (queryClient.getQueryData(['tasks', userId]) as Task[] || []);
  const tasksToDelete: Task[] = previousTasks.filter((t: Task) => t.id === taskId || t.parent_task_id === taskId);
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    (old || []).filter(task => task.id !== taskId && task.parent_task_id !== taskId)
  );
  tasksToDelete.forEach((task: Task) => inFlightUpdatesRef.current.add(task.id));

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .or(`id.eq.${taskId},parent_task_id.eq.${taskId}`)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('Task deleted successfully!');
    tasksToDelete.forEach((task: Task) => context.cancelReminder(task.id));
    return true;
  } catch (error: any) {
    showError('Failed to delete task.');
    console.error('Error deleting task:', error.message);
    // Revert optimistic update
    queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => [...(old || []), ...previousTasks]);
    return false;
  } finally {
    tasksToDelete.forEach((task: Task) => inFlightUpdatesRef.current.delete(task.id));
    invalidateTasksQueries();
  }
};

export const bulkUpdateTasksMutation = async (updates: Partial<Task>, ids: string[], context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;

  // Optimistic update
  const previousTasks = (queryClient.getQueryData(['tasks', userId]) as Task[] || []);
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    (old || []).map(task => (ids.includes(task.id) ? { ...task, ...updates } : task))
  );
  ids.forEach(id => inFlightUpdatesRef.current.add(id));

  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(prepareTaskForDb(updates))
      .in('id', ids)
      .eq('user_id', userId)
      .select();

    if (error) throw error;

    showSuccess('Tasks updated successfully!');
    data.forEach(updatedTask => {
      if (updatedTask.remind_at && updatedTask.status === 'to-do') {
        const d = parseISO(updatedTask.remind_at);
        if (isValid(d)) context.scheduleReminder(updatedTask.id, `Reminder: ${updatedTask.description}`, d);
      } else if (updatedTask.status === 'completed' || updatedTask.status === 'archived' || updatedTask.remind_at === null) {
        context.cancelReminder(updatedTask.id);
      }
    });
  } catch (error: any) {
    showError('Failed to bulk update tasks.');
    console.error('Error bulk updating tasks:', error.message);
    // Revert optimistic update
    queryClient.setQueryData(['tasks', userId], previousTasks);
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const bulkDeleteTasksMutation = async (ids: string[], context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;

  // Optimistic update
  const previousTasks = (queryClient.getQueryData(['tasks', userId]) as Task[] || []);
  const tasksToDelete: Task[] = previousTasks.filter((t: Task) => ids.includes(t.id));
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    (old || []).filter(task => !ids.includes(task.id))
  );
  ids.forEach(id => inFlightUpdatesRef.current.add(id));

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('Tasks deleted successfully!');
    tasksToDelete.forEach((task: Task) => context.cancelReminder(task.id));
    return true;
  } catch (error: any) {
    showError('Failed to bulk delete tasks.');
    console.error('Error bulk deleting tasks:', error.message);
    // Revert optimistic update
    queryClient.setQueryData(['tasks', userId], previousTasks);
    return false;
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const archiveAllCompletedTasksMutation = async (context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;

  const completedTasks: Task[] = (queryClient.getQueryData(['tasks', userId]) as Task[] || []).filter((t: Task) => t.status === 'completed');
  const completedTaskIds: string[] = completedTasks.map((t: Task) => t.id);

  if (completedTaskIds.length === 0) {
    showSuccess('No completed tasks to archive.');
    return;
  }

  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    (old || []).map(task => (task.status === 'completed' ? { ...task, status: 'archived' } : task))
  );
  completedTaskIds.forEach((id: string) => inFlightUpdatesRef.current.add(id));

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'archived' })
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (error) throw error;

    showSuccess('All completed tasks archived!');
  } catch (error: any) {
    showError('Failed to archive completed tasks.');
    console.error('Error archiving completed tasks:', error.message);
    // Revert optimistic update
    queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
      (old || []).map(task => (completedTaskIds.includes(task.id) ? { ...task, status: 'completed' } : task))
    );
  } finally {
    completedTaskIds.forEach((id: string) => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const markAllTasksInSectionCompletedMutation = async (sectionId: string | null, context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;

  const tasksInSection: Task[] = (queryClient.getQueryData(['tasks', userId]) as Task[] || []).filter((t: Task) =>
    t.status === 'to-do' && t.parent_task_id === null && (sectionId === null ? t.section_id === null : t.section_id === sectionId)
  );
  const taskIdsToComplete: string[] = tasksInSection.map((t: Task) => t.id);

  if (taskIdsToComplete.length === 0) {
    showSuccess('No pending tasks in this section to mark as completed.');
    return;
  }

  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    (old || []).map(task => (taskIdsToComplete.includes(task.id) ? { ...task, status: 'completed' } : task))
  );
  taskIdsToComplete.forEach((id: string) => inFlightUpdatesRef.current.add(id));

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed' })
      .in('id', taskIdsToComplete)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('All tasks in section marked as completed!');
  } catch (error: any) {
    showError('Failed to mark tasks as completed.');
    console.error('Error marking tasks as completed:', error.message);
    // Revert optimistic update
    queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
      (old || []).map(task => (taskIdsToComplete.includes(task.id) ? { ...task, status: 'to-do' } : task))
    );
  } finally {
    taskIdsToComplete.forEach((id: string) => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const updateTaskParentAndOrderMutation = async (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null, isDraggingDown: boolean, context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;

  const allTasks = (queryClient.getQueryData(['tasks', userId]) as Task[] || []);
  const activeTask = allTasks.find((t: Task) => t.id === activeId);

  if (!activeTask) return;

  const updates: Partial<Task> = {
    parent_task_id: newParentId,
    section_id: newSectionId,
  };

  // Determine new order
  let newOrder: number | null = null;
  const siblings: Task[] = allTasks.filter((t: Task) => t.parent_task_id === newParentId && t.section_id === newSectionId && t.id !== activeId);

  if (overId) {
    const overTask = allTasks.find((t: Task) => t.id === overId);
    if (overTask) {
      if (isDraggingDown) {
        newOrder = (overTask.order || 0) + 0.5; // Place after
      } else {
        newOrder = (overTask.order || 0) - 0.5; // Place before
      }
    }
  } else {
    // If no overId, place at the end of the list
    newOrder = siblings.length > 0 ? Math.max(...siblings.map((s: Task) => s.order || 0)) + 1 : 0;
  }

  updates.order = newOrder;

  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    (old || []).map(task => (task.id === activeId ? { ...task, ...updates } : task))
  );
  inFlightUpdatesRef.current.add(activeId);

  try {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', activeId)
      .eq('user_id', userId);

    if (error) throw error;

    // Re-normalize order if necessary (e.g., if fractional orders accumulate)
    const updatedTasks = (queryClient.getQueryData(['tasks', userId]) as Task[] || []);
    const tasksToReorder: Task[] = updatedTasks.filter((t: Task) => t.parent_task_id === newParentId && t.section_id === newSectionId)
      .sort((a: Task, b: Task) => (a.order || 0) - (b.order || 0));

    const reorderPayload = tasksToReorder.map((task: Task, index: number) => ({
      id: task.id,
      order: index,
      user_id: userId,
    }));

    if (reorderPayload.length > 0) {
      await supabase.from('tasks').upsert(reorderPayload, { onConflict: 'id' });
    }

    showSuccess('Task reordered!');
  } catch (error: any) {
    showError('Failed to reorder task.');
    console.error('Error reordering task:', error.message);
    // Revert optimistic update
    queryClient.setQueryData(['tasks', userId], allTasks);
  } finally {
    inFlightUpdatesRef.current.delete(activeId);
    invalidateTasksQueries();
  }
};

export const toggleDoTodayMutation = async (task: Task, currentDate: Date, doTodayOffIds: Set<string>, context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');
  const originalTaskId = task.original_task_id || task.id;
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
  inFlightUpdatesRef.current.add(originalTaskId);

  try {
    if (isCurrentlyOff) {
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('user_id', userId)
        .eq('task_id', originalTaskId)
        .eq('off_date', formattedDate);
      if (error) throw error;
      showSuccess('Task added to "Do Today"!');
    } else {
      const { error } = await supabase
        .from('do_today_off_log')
        .insert({ user_id: userId, task_id: originalTaskId, off_date: formattedDate });
      if (error) throw error;
      showSuccess('Task removed from "Do Today".');
    }
  } catch (error: any) {
    showError('Failed to update "Do Today" status.');
    console.error('Error toggling Do Today:', error.message);
    // Revert optimistic update
    queryClient.setQueryData(['do_today_off_log', userId, formattedDate], doTodayOffIds);
  } finally {
    inFlightUpdatesRef.current.delete(originalTaskId);
    invalidateTasksQueries();
  }
};

export const toggleAllDoTodayMutation = async (filteredTasks: Task[], currentDate: Date, doTodayOffIds: Set<string>, context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');

  const nonRecurringTopLevelTasks = filteredTasks.filter(t => t.recurring_type === 'none' && t.parent_task_id === null);
  const allOriginalTaskIds = new Set(nonRecurringTopLevelTasks.map(t => t.original_task_id || t.id));

  const tasksToTurnOff = Array.from(allOriginalTaskIds).filter(id => !doTodayOffIds.has(id));
  const tasksToTurnOn = Array.from(allOriginalTaskIds).filter(id => doTodayOffIds.has(id));

  if (tasksToTurnOff.length === 0 && tasksToTurnOn.length === 0) {
    showSuccess('No non-recurring tasks to toggle "Do Today" status.');
    return;
  }

  // Determine if we are turning all off or all on
  const isTurningAllOff = tasksToTurnOff.length > 0;

  // Optimistic update
  queryClient.setQueryData(['do_today_off_log', userId, formattedDate], (old: Set<string> | undefined) => {
    const newSet = new Set(old || []);
    if (isTurningAllOff) {
      tasksToTurnOff.forEach(id => newSet.add(id));
    } else {
      tasksToTurnOn.forEach(id => newSet.delete(id));
    }
    return newSet;
  });
  Array.from(allOriginalTaskIds).forEach(id => inFlightUpdatesRef.current.add(id));

  try {
    if (isTurningAllOff) {
      const payload = tasksToTurnOff.map(id => ({ user_id: userId, task_id: id, off_date: formattedDate }));
      const { error } = await supabase.from('do_today_off_log').insert(payload);
      if (error) throw error;
      showSuccess('All non-recurring tasks removed from "Do Today".');
    } else {
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('user_id', userId)
        .eq('off_date', formattedDate)
        .in('task_id', tasksToTurnOn);
      if (error) throw error;
      showSuccess('All non-recurring tasks added to "Do Today".');
    }
  } catch (error: any) {
    showError('Failed to toggle all "Do Today" statuses.');
    console.error('Error toggling all Do Today:', error.message);
    // Revert optimistic update
    queryClient.setQueryData(['do_today_off_log', userId, formattedDate], doTodayOffIds);
  } finally {
    Array.from(allOriginalTaskIds).forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};