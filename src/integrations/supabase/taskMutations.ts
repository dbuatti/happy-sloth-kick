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
  // IMPORTANT: Do NOT set description to '' if it's undefined, as this clears it on status updates.
  // The description should only be updated if explicitly provided.
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
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, processedTasks } = context;

  const previousTask = processedTasks.find((t: Task) => t.id === taskId);

  if (!previousTask) {
    showError('Task not found for update.');
    return null;
  }

  const isVirtual = isVirtualId(taskId);
  const isRecurringTemplate = previousTask.recurring_type !== 'none';
  const isStatusUpdate = updates.status !== undefined && updates.status !== previousTask.status;

  // Optimistic update (applies to both real and virtual tasks for immediate UI feedback)
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    (old || []).map(task => (task.id === taskId ? { ...task, ...updates, category_color: context.categoriesMap.get(updates.category || task.category || '') || 'gray' } : task))
  );
  inFlightUpdatesRef.current.add(taskId);

  try {
    let resultId: string | null = null;

    if (isVirtual && isRecurringTemplate && isStatusUpdate) {
      // This is a virtual instance of a recurring task, and its status is changing.
      // We should log its completion/uncompletion for the current day, not create a new task.
      const originalTaskId = previousTask.original_task_id || previousTask.id;
      const completionDate = format(context.currentDate, 'yyyy-MM-dd'); // Assuming currentDate is available in context

      if (updates.status === 'completed') {
        // Log completion for today
        const { error } = await supabase
          .from('recurring_task_completion_log')
          .insert({ user_id: userId, original_task_id: originalTaskId, completion_date: completionDate });
        if (error) throw error;
        showSuccess('Recurring task completed for today!');
      } else if (updates.status === 'to-do') {
        // Remove completion log for today
        const { error } = await supabase
          .from('recurring_task_completion_log')
          .delete()
          .eq('user_id', userId)
          .eq('original_task_id', originalTaskId)
          .eq('completion_date', completionDate);
        if (error) throw error;
        showSuccess('Recurring task marked as to-do for today.');
      }
      resultId = taskId; // Keep the virtual ID for optimistic update consistency
      // No need to update the 'tasks' table for this virtual instance
    } else if (isVirtual) {
      // If it's a virtual task, but not a status update for a recurring template,
      // or if it's a virtual subtask, convert it to a real task.
      const newTaskData: NewTaskData = {
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
        recurring_type: 'none', // This instance becomes a one-off
        original_task_id: previousTask.original_task_id || previousTask.id, // Link to the original recurring task
        parent_task_id: previousTask.parent_task_id, // Maintain parent if it was a subtask of a virtual parent
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...prepareTaskForDb(newTaskData), user_id: userId })
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

    // Handle reminders for real tasks or newly created tasks
    if (resultId && !isVirtual) { // Only for real tasks or newly created ones
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
      if (isVirtual && isRecurringTemplate && isStatusUpdate) {
        // For recurring task completion, revert the status in the cache
        return (old || []).map(task => (task.id === taskId ? { ...task, status: previousTask.status } : task));
      } else if (isVirtual) {
        // If it was a virtual task that was supposed to be converted, just remove the optimistic update
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
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, processedTasks } = context;

  const taskToDelete = processedTasks.find((t: Task) => t.id === taskId);
  if (!taskToDelete) {
    showError('Task not found for deletion.');
    return false;
  }

  let idsToDelete: string[] = [];
  let originalTaskIdToDelete: string | null = null;

  // Determine if it's a recurring task or an instance of one
  if (taskToDelete.recurring_type !== 'none' || taskToDelete.original_task_id) {
    // If it's a recurring template or an instance, delete the entire series
    originalTaskIdToDelete = taskToDelete.original_task_id || taskToDelete.id;
    
    // Collect all tasks belonging to this series (template + all instances)
    idsToDelete = processedTasks
      .filter(t => t.id === originalTaskIdToDelete || t.original_task_id === originalTaskIdToDelete)
      .map(t => t.id);
  } else {
    // It's a non-recurring task, delete it and its subtasks
    idsToDelete = processedTasks
      .filter(t => t.id === taskId || t.parent_task_id === taskId)
      .map(t => t.id);
  }

  // Optimistic update
  const previousTasks = (queryClient.getQueryData(['tasks', userId]) as Task[] || []);
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    (old || []).filter(task => !idsToDelete.includes(task.id))
  );
  idsToDelete.forEach(id => inFlightUpdatesRef.current.add(id));

  try {
    // Delete from 'tasks' table
    const { error: tasksError } = await supabase
      .from('tasks')
      .delete()
      .in('id', idsToDelete)
      .eq('user_id', userId); // Ensure RLS is respected

    if (tasksError) throw tasksError;

    // If it was a recurring series, also delete from 'recurring_task_completion_log'
    if (originalTaskIdToDelete) {
      const { error: recurringLogError } = await supabase
        .from('recurring_task_completion_log')
        .delete()
        .eq('user_id', userId)
        .eq('original_task_id', originalTaskIdToDelete);
      
      if (recurringLogError) {
        console.warn('Failed to delete recurring task completion logs:', recurringLogError.message);
        // Don't throw, as task deletion is more critical
      }
    }

    showSuccess('Task(s) deleted successfully!');
    idsToDelete.forEach(id => context.cancelReminder(id)); // Cancel reminders for all deleted tasks
    return true;
  } catch (error: any) {
    showError('Failed to delete task(s).');
    console.error('Error deleting task(s):', error.message);
    // Revert optimistic update
    queryClient.setQueryData(['tasks', userId], previousTasks);
    return false;
  } finally {
    idsToDelete.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const bulkUpdateTasksMutation = async (updates: Partial<Task>, ids: string[], context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, processedTasks } = context;

  // Separate real and virtual task IDs
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
      const { error } = await supabase
        .from('tasks')
        .update(prepareTaskForDb(updates))
        .in('id', realTaskIds)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
    }

    // Handle virtual tasks in bulk update
    if (virtualTaskIds.length > 0 && updates.status !== undefined) {
      const completionDate = format(context.currentDate, 'yyyy-MM-dd');
      const virtualRecurringTasks = processedTasks.filter(t => virtualTaskIds.includes(t.id) && t.recurring_type !== 'none');

      if (updates.status === 'completed') {
        const payload = virtualRecurringTasks.map(task => ({
          user_id: userId,
          original_task_id: task.original_task_id || task.id,
          completion_date: completionDate,
        }));
        if (payload.length > 0) {
          const { error } = await supabase.from('recurring_task_completion_log').insert(payload);
          if (error) throw error;
        }
        showSuccess('Recurring tasks completed in bulk for today!');
      } else if (updates.status === 'to-do') {
        const originalTaskIdsToUncomplete = virtualRecurringTasks.map(task => task.original_task_id || task.id);
        if (originalTaskIdsToUncomplete.length > 0) {
          const { error } = await supabase
            .from('recurring_task_completion_log')
            .delete()
            .eq('user_id', userId)
            .eq('completion_date', completionDate)
            .in('original_task_id', originalTaskIdsToUncomplete);
          if (error) throw error;
        }
        showSuccess('Recurring tasks marked as to-do in bulk for today.');
      } else {
        // For other updates to virtual tasks (not status change), they should ideally be converted to real tasks.
        // For now, we'll just let the optimistic update stand in the cache.
        console.warn('Bulk updating virtual tasks with non-completion status changes. Consider converting to real tasks.');
      }
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
  void virtualTaskIds; // Explicitly mark as read to satisfy TS6133

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
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, processedTasks } = context;

  const tasksInSection: Task[] = processedTasks.filter((t: Task) =>
    t.status === 'to-do' && t.parent_task_id === null && (sectionId === null ? t.section_id === null : t.section_id === sectionId)
  );
  const taskIdsToComplete: string[] = tasksInSection.map((t: Task) => t.id);

  if (taskIdsToComplete.length === 0) {
    showSuccess('No pending tasks in this section to mark as completed.');
    return;
  }

  // Separate real and virtual task IDs
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

    // For virtual recurring tasks marked completed, log their completion
    if (virtualTaskIdsToComplete.length > 0) {
      const completionDate = format(context.currentDate, 'yyyy-MM-dd');
      const virtualRecurringTasks = processedTasks.filter(t => virtualTaskIdsToComplete.includes(t.id) && t.recurring_type !== 'none');
      const payload = virtualRecurringTasks.map(task => ({
        user_id: userId,
        original_task_id: task.original_task_id || task.id,
        completion_date: completionDate,
      }));
      if (payload.length > 0) {
        const { error } = await supabase.from('recurring_task_completion_log').insert(payload);
        if (error) throw error;
      }
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
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, processedTasks } = context;

  const activeTask = processedTasks.find((t: Task) => t.id === activeId);

  if (!activeTask) return;

  // If the active task is virtual, it needs to be converted to a real task first
  let actualActiveId = activeId;
  let actualNewParentId = newParentId;
  let actualNewSectionId = newSectionId;

  if (isVirtualId(activeId)) {
    // Create a new concrete task from the virtual one
    const newTaskData: NewTaskData = {
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
        .insert({ ...prepareTaskForDb(newTaskData), user_id: userId })
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
  const siblings: Task[] = processedTasks.filter((t: Task) => t.parent_task_id === actualNewParentId && t.section_id === actualNewSectionId && t.id !== actualActiveId);

  if (overId) {
    const overTask = processedTasks.find((t: Task) => t.id === overId);
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
    queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => old || []); // Revert to previous state, or a more complex revert if needed
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