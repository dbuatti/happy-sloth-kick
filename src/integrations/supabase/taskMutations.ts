import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { format, parseISO, isValid } from 'date-fns';
import { Task, NewTaskData, TaskUpdate, MutationContext } from '@/hooks/useTasks';

// Helper to check if an ID is a virtual client-side ID
const isVirtualId = (id: string) => id.startsWith('virtual-');

// Helper to ensure task data is consistent for DB operations
const prepareTaskForDb = (task: Partial<Task>): Partial<Task> => {
  const prepared = { ...task };
  // Ensure non-nullable fields have defaults if they are being inserted/updated
  if (prepared.description === undefined) prepared.description = '';
  if (prepared.status === undefined) prepared.status = 'to-do';
  if (prepared.recurring_type === undefined) prepared.recurring_type = 'none';
  if (prepared.priority === undefined) prepared.priority = 'medium';
  if (prepared.category === undefined) prepared.category = null; // Default to null if not provided
  if (prepared.section_id === undefined) prepared.section_id = null;
  if (prepared.parent_task_id === undefined) prepared.parent_task_id = null;
  if (prepared.original_task_id === undefined) prepared.original_task_id = null;
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

  const allTasks = (queryClient.getQueryData(['tasks', userId]) as Task[] || []);
  const previousTask = allTasks.find((t: Task) => t.id === taskId);

  if (!previousTask) {
    showError('Task not found for update.');
    return null;
  }

  const isVirtual = isVirtualId(taskId);

  // Optimistic update (applies to both real and virtual tasks for immediate UI feedback)
  // For virtual tasks, we optimistically update the virtual task in the cache.
  // If successful, this virtual task will be replaced by a new concrete task.
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    (old || []).map(task => (task.id === taskId ? { ...task, ...updates, category_color: context.categoriesMap.get(updates.category || task.category || '') || 'gray' } : task))
  );
  inFlightUpdatesRef.current.add(taskId);

  try {
    let resultId: string | null = null;

    if (isVirtual) {
      // If it's a virtual task, create a new concrete task based on it
      const newTaskData: NewTaskData = {
        user_id: userId,
        description: updates.description || previousTask.description,
        status: updates.status || previousTask.status,
        priority: updates.priority || previousTask.priority,
        due_date: updates.due_date || previousTask.due_date,
        notes: updates.notes || previousTask.notes,
        remind_at: updates.remind_at || previousTask.remind_at,
        section_id: updates.section_id || previousTask.section_id,
        order: updates.order ?? previousTask.order,
        category: updates.category || previousTask.category,
        link: updates.link || previousTask.link,
        image_url: updates.image_url || previousTask.image_url,
        // Crucially, this new task is no longer recurring, but it references its origin
        recurring_type: 'none', // This instance becomes a one-off
        original_task_id: previousTask.original_task_id || previousTask.id, // Link to the original recurring task
        parent_task_id: previousTask.parent_task_id, // Maintain parent if it was a subtask of a virtual parent
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(prepareTaskForDb(newTaskData))
        .select()
        .single();

      if (error) throw error;
      resultId = data.id;

      // After creating the new task, we need to remove the virtual task from the cache
      // and add the new concrete task.
      queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
        const filtered = (old || []).filter(task => task.id !== taskId); // Remove the virtual task
        return [...filtered, { ...data, category_color: context.categoriesMap.get(data.category || '') || 'gray' }]; // Add the new concrete task
      });

      showSuccess('Recurring task instance saved as a new task!');

    } else {
      // If it's a real task, proceed with update
      const { data, error } = await supabase
        .from('tasks')
        .update(prepareTaskForDb(updates))
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      resultId = data.id;
      showSuccess('Task updated successfully!');
    }

    // Handle reminders for both cases
    if (resultId) {
      // Fetch the latest state of the task from the cache after potential updates
      const finalTask = (queryClient.getQueryData(['tasks', userId]) as Task[] || []).find(t => t.id === resultId);
      if (finalTask) {
        if (finalTask.remind_at && finalTask.status === 'to-do') {
          const d = parseISO(finalTask.remind_at);
          if (isValid(d)) context.scheduleReminder(finalTask.id, `Reminder: ${finalTask.description}`, d);
        } else if (finalTask.status === 'completed' || finalTask.status === 'archived' || finalTask.remind_at === null) {
          context.cancelReminder(finalTask.id);
        }
      }
    }

    return resultId;

  } catch (error: any) {
    showError('Failed to update task.');
    console.error('Error updating task:', error.message);
    // Revert optimistic update
    queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
      if (isVirtual) {
        // If it was a virtual task, just remove the optimistic update (it was never in DB)
        return (old || []).filter(task => task.id !== taskId);
      } else {
        // If it was a real task, revert to previous state
        return (old || []).map(task => (task.id === taskId ? previousTask : task));
      }
    });
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
    // If the task to delete is virtual, it doesn't exist in the DB, so we just remove it from the cache.
    // If it's a real task, proceed with DB deletion.
    if (!isVirtualId(taskId)) {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .or(`id.eq.${taskId},parent_task_id.eq.${taskId}`)
        .eq('user_id', userId);

      if (error) throw error;
    }

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

  // Filter out virtual IDs for DB operation, but apply optimistic update to all
  const realTaskIds = ids.filter(id => !isVirtualId(id));
  const virtualTaskIds = ids.filter(id => isVirtualId(id));

  // Optimistic update
  const previousTasks = (queryClient.getQueryData(['tasks', userId]) as Task[] || []);
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    (old || []).map(task => (ids.includes(task.id) ? { ...task, ...updates } : task))
  );
  ids.forEach(id => inFlightUpdatesRef.current.add(id));

  try {
    if (realTaskIds.length > 0) {
      const { data, error } = await supabase
        .from('tasks')
        .update(prepareTaskForDb(updates))
        .in('id', realTaskIds)
        .eq('user_id', userId)
        .select();

      if (error) throw error;

      data.forEach(updatedTask => {
        if (updatedTask.remind_at && updatedTask.status === 'to-do') {
          const d = parseISO(updatedTask.remind_at);
          if (isValid(d)) context.scheduleReminder(updatedTask.id, `Reminder: ${updatedTask.description}`, d);
        } else if (updatedTask.status === 'completed' || updatedTask.status === 'archived' || updatedTask.remind_at === null) {
          context.cancelReminder(updatedTask.id);
        }
      });
    }

    // For virtual tasks in a bulk update, if they are being marked completed/archived,
    // they should probably be converted to real tasks or handled via do_today_off_log.
    // For simplicity, if a virtual task is part of a bulk update, we'll just remove it from the cache
    // if its status changes to completed/archived, assuming it's a one-off completion.
    // More complex logic might involve creating new tasks for each virtual instance.
    if (virtualTaskIds.length > 0 && (updates.status === 'completed' || updates.status === 'archived')) {
        queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
            (old || []).filter(task => !virtualTaskIds.includes(task.id))
        );
        showSuccess('Virtual tasks completed/archived in bulk.');
    } else if (virtualTaskIds.length > 0) {
        // If other updates are applied to virtual tasks, they should ideally be converted to real tasks.
        // For now, we'll just let the optimistic update stand in the cache.
        // A more robust solution would involve creating new tasks for each virtual ID here.
        console.warn('Bulk updating virtual tasks with non-completion status changes. Consider converting to real tasks.');
    }

    showSuccess('Tasks updated successfully!');
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

  // Filter out virtual IDs for DB operation
  const realTaskIds = ids.filter(id => !isVirtualId(id));
  const virtualTaskIds = ids.filter(id => isVirtualId(id));

  // Optimistic update
  const previousTasks = (queryClient.getQueryData(['tasks', userId]) as Task[] || []);
  const tasksToDelete: Task[] = previousTasks.filter((t: Task) => ids.includes(t.id));
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    (old || []).filter(task => !ids.includes(task.id))
  );
  ids.forEach(id => inFlightUpdatesRef.current.add(id));

  try {
    if (realTaskIds.length > 0) {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', realTaskIds)
        .eq('user_id', userId);

      if (error) throw error;
    }

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

  // Filter out virtual IDs for DB operation, but apply optimistic update to all
  const realTaskIdsToComplete = taskIdsToComplete.filter(id => !isVirtualId(id));
  const virtualTaskIdsToComplete = taskIdsToComplete.filter(id => isVirtualId(id));

  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    (old || []).map(task => (taskIdsToComplete.includes(task.id) ? { ...task, status: 'completed' } : task))
  );
  taskIdsToComplete.forEach((id: string) => inFlightUpdatesRef.current.add(id));

  try {
    if (realTaskIdsToComplete.length > 0) {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .in('id', realTaskIdsToComplete)
        .eq('user_id', userId);

      if (error) throw error;
    }

    // For virtual tasks marked completed, remove them from the cache as they are one-off completions
    if (virtualTaskIdsToComplete.length > 0) {
        queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
            (old || []).filter(task => !virtualTaskIdsToComplete.includes(task.id))
        );
    }

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

  // If the active task is virtual, it needs to be converted to a real task first
  let actualActiveId = activeId;
  let actualNewParentId = newParentId;
  let actualNewSectionId = newSectionId;

  if (isVirtualId(activeId)) {
    // Create a new concrete task from the virtual one
    const newTaskData: NewTaskData = {
      user_id: userId,
      description: activeTask.description,
      status: activeTask.status,
      priority: activeTask.priority,
      due_date: activeTask.due_date,
      notes: activeTask.notes,
      remind_at: activeTask.remind_at,
      section_id: activeTask.section_id,
      order: activeTask.order,
      category: activeTask.category,
      link: activeTask.link,
      image_url: activeTask.image_url,
      recurring_type: 'none',
      original_task_id: activeTask.original_task_id || activeTask.id,
      parent_task_id: activeTask.parent_task_id,
    };

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert(prepareTaskForDb(newTaskData))
        .select()
        .single();

      if (error) throw error;
      actualActiveId = data.id;

      // Remove the virtual task from cache and add the new concrete one
      queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
        const filtered = (old || []).filter(task => task.id !== activeId);
        return [...filtered, { ...data, category_color: context.categoriesMap.get(data.category || '') || 'gray' }];
      });
      showSuccess('Virtual task converted to real task for reordering.');
    } catch (error: any) {
      showError('Failed to convert virtual task for reordering.');
      console.error('Error converting virtual task:', error.message);
      return;
    }
  }

  // If the new parent or section is virtual, it also needs to be handled.
  // For simplicity, we'll assume newParentId and newSectionId are always real IDs or null.
  // If they could be virtual, similar conversion logic would be needed here.

  const updates: Partial<Task> = {
    parent_task_id: actualNewParentId,
    section_id: actualNewSectionId,
  };

  // Determine new order
  let newOrder: number | null = null;
  const siblings: Task[] = allTasks.filter((t: Task) => t.parent_task_id === actualNewParentId && t.section_id === actualNewSectionId && t.id !== actualActiveId);

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
    (old || []).map(task => (task.id === actualActiveId ? { ...task, ...updates } : task))
  );
  inFlightUpdatesRef.current.add(actualActiveId);

  try {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', actualActiveId)
      .eq('user_id', userId);

    if (error) throw error;

    // Re-normalize order if necessary (e.g., if fractional orders accumulate)
    const updatedTasks = (queryClient.getQueryData(['tasks', userId]) as Task[] || []);
    const tasksToReorder: Task[] = updatedTasks.filter((t: Task) => t.parent_task_id === actualNewParentId && t.section_id === actualNewSectionId)
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
    inFlightUpdatesRef.current.delete(actualActiveId);
    invalidateTasksQueries();
  }
};

export const toggleDoTodayMutation = async (task: Task, currentDate: Date, doTodayOffIds: Set<string>, context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');
  const originalTaskId = task.original_task_id || task.id; // Always use original_task_id for logging
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