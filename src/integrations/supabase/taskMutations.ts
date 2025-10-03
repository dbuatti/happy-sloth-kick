import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { format, parseISO, isValid } from 'date-fns';
import { Task, NewTaskData, TaskUpdate, MutationContext } from '@/hooks/useTasks';

// Helper to check if an ID is a virtual client-side ID
const isVirtualId = (id: string) => id.startsWith('virtual-');

// This function prepares data specifically for INSERT operations, applying defaults for missing fields.
const prepareTaskForInsert = (taskData: NewTaskData, userId: string): Partial<Task> => {
  return {
    user_id: userId,
    description: taskData.description,
    status: taskData.status || 'to-do',
    recurring_type: taskData.recurring_type || 'none',
    priority: taskData.priority || 'medium',
    category: taskData.category || null,
    due_date: taskData.due_date || null,
    notes: taskData.notes || null,
    remind_at: taskData.remind_at || null,
    section_id: taskData.section_id || null,
    parent_task_id: taskData.parent_task_id || null,
    original_task_id: taskData.original_task_id || null,
    link: taskData.link || null,
    image_url: taskData.image_url || null,
    // created_at, updated_at, completed_at are handled by DB defaults or specific logic
  };
};

// This function prepares data specifically for UPDATE operations.
// It only includes properties that are explicitly provided (not undefined),
// ensuring that other fields in the database are not inadvertently set to null.
const prepareTaskForUpdate = (updates: Partial<Task>): Partial<Task> => {
  const prepared: Record<string, any> = {}; // Use Record<string, any> for flexible assignment
  for (const key in updates) {
    const value = updates[key as keyof Partial<Task>];
    if (value !== undefined) {
      prepared[key] = value;
    }
  }
  return prepared as Partial<Task>; // Assert the final type
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
      .insert(prepareTaskForInsert(newTaskData, userId)) // Use prepareTaskForInsert here
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

  let actualActiveId: string | null = taskId;

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
      const originalTaskId = previousTask.original_task_id || previousTask.id;
      const completionDate = format(context.currentDate, 'yyyy-MM-dd');

      if (updates.status === 'completed') {
        const { error } = await supabase
          .from('recurring_task_completion_log')
          .insert({ user_id: userId, original_task_id: originalTaskId, completion_date: completionDate });
        if (error) throw error;
        showSuccess('Recurring task completed for today!');
      } else if (updates.status === 'to-do') {
        const { error } = await supabase
          .from('recurring_task_completion_log')
          .delete()
          .eq('user_id', userId)
          .eq('original_task_id', originalTaskId)
          .eq('completion_date', completionDate);
        if (error) throw error;
        showSuccess('Recurring task marked as to-do for today.');
      }
      resultId = taskId;
    } else if (isVirtual) {
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
        recurring_type: 'none',
        original_task_id: previousTask.original_task_id || previousTask.id,
        parent_task_id: previousTask.parent_task_id,
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(prepareTaskForInsert(newTaskData, userId)) // Use prepareTaskForInsert here
        .select()
        .single();

      if (error) throw error;
      actualActiveId = data.id;
      resultId = actualActiveId;

      queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
        const filtered = (old || []).filter(task => task.id !== taskId);
        return [...filtered, { ...data, category_color: context.categoriesMap.get(data.category || '') || 'gray' }];
      });

      showSuccess('Recurring task instance saved as a new task!');

    } else {
      const { data, error } = await supabase
        .from('tasks')
        .update(prepareTaskForUpdate(updates)) // Use prepareTaskForUpdate here
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      resultId = data.id;
      showSuccess('Task updated successfully!');
    }

    if (resultId && !isVirtual) {
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
    queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
      if (isVirtual && isRecurringTemplate && isStatusUpdate) {
        return (old || []).map(task => (task.id === taskId ? { ...task, status: previousTask.status } : task));
      } else if (isVirtual) {
        return (old || []).filter(task => task.id !== taskId);
      } else {
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

  const taskToDelete = processedTasks.find(t => t.id === taskId);
  if (!taskToDelete) {
    showError('Task not found for deletion.');
    return false;
  }

  const originalTaskId = taskToDelete.original_task_id || taskToDelete.id;

  // Optimistic update: remove the task and its direct subtasks from the cache
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    (old || []).filter(task => task.id !== taskId && task.parent_task_id !== taskId)
  );
  inFlightUpdatesRef.current.add(taskId);

  try {
    // Delete the task itself from the database
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) throw error;

    // If it was a recurring task, also delete its completion logs for today
    if (taskToDelete.recurring_type !== 'none') {
      const { error: recurringLogError } = await supabase
        .from('recurring_task_completion_log')
        .delete()
        .eq('user_id', userId)
        .eq('original_task_id', originalTaskId)
        .eq('completion_date', format(context.currentDate, 'yyyy-MM-dd'));
      
      if (recurringLogError) {
        console.warn('Failed to delete recurring task completion log during single task delete:', recurringLogError.message);
      }
    }

    showSuccess('Task deleted successfully!');
    context.cancelReminder(taskId);
    return true;
  } catch (error: any) {
    showError('Failed to delete task.');
    console.error('Error deleting task:', error.message);
    // Revert optimistic update (this is tricky for single delete, might need to refetch or reconstruct)
    // For simplicity, we'll just invalidate and let it refetch.
    queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
    return false;
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
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
        .update(prepareTaskForUpdate(updates)) // Use prepareTaskForUpdate here
        .in('id', realTaskIds)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
    }

    // Handle virtual tasks in bulk update
    if (virtualTaskIds.length > 0 && updates.status !== undefined) {
      const completionDate = format(context.currentDate, 'yyyy-MM-dd');
      const virtualRecurringTasks = processedTasks.filter(t => virtualTaskIds.includes(t.id) && t.recurring_type !== 'none');
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

    showSuccess('Tasks updated successfully!');
  } catch (error: any) {
    showError('Failed to bulk update tasks.');
    console.error('Error bulk updating tasks:', error.message);
    queryClient.setQueryData(['tasks', userId], previousTasks);
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const bulkDeleteTasksMutation = async (ids: string[], context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, rawTasks } = context;

  console.log('--- bulkDeleteTasksMutation START ---');
  console.log('Attempting to bulk delete task IDs:', ids);
  console.log('Current rawTasks count:', rawTasks.length);

  const originalTaskIdsToConsider = new Set<string>();
  const tasksToProcessForDeletion = rawTasks.filter(t => ids.includes(t.id));

  ids.forEach(id => {
    if (isVirtualId(id)) {
      const parts = id.split('-');
      if (parts.length >= 3) {
        originalTaskIdsToConsider.add(parts[1]);
      }
    } else {
      const realTask = tasksToProcessForDeletion.find((t: Omit<Task, 'category_color' | 'isDoTodayOff'>) => t.id === id);
      if (realTask) {
        originalTaskIdsToConsider.add(realTask.original_task_id || realTask.id);
      }
    }
  });
  console.log('Original Task IDs to consider for bulk deletion:', Array.from(originalTaskIdsToConsider));

  let allIdsToDelete: string[] = [];
  originalTaskIdsToConsider.forEach(originalId => {
    const relatedTasks = rawTasks.filter(t => t.id === originalId || t.original_task_id === originalId);
    relatedTasks.forEach(t => allIdsToDelete.push(t.id));
  });

  ids.filter(id => isVirtualId(id)).forEach(virtualId => {
    if (!allIdsToDelete.includes(virtualId)) {
      allIdsToDelete.push(virtualId);
    }
  });

  allIdsToDelete = Array.from(new Set(allIdsToDelete));
  console.log('Final consolidated IDs to delete (including virtual for cache):', allIdsToDelete);

  const realTaskIdsToDelete = allIdsToDelete.filter(id => !isVirtualId(id));
  const _virtualTaskIdsToDelete = allIdsToDelete.filter(id => isVirtualId(id));
  void _virtualTaskIdsToDelete; // Explicitly mark as void to suppress unused variable warning
  console.log('Real task IDs to delete from DB (bulk):', realTaskIdsToDelete);
  console.log('Virtual task IDs (will be removed from cache only) (bulk):', _virtualTaskIdsToDelete);


  const previousTasks = (queryClient.getQueryData(['tasks', userId]) as Task[] || []);
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    (old || []).filter(task => !allIdsToDelete.includes(task.id))
  );
  allIdsToDelete.forEach(id => inFlightUpdatesRef.current.add(id));
  console.log('Optimistically removed tasks from cache (bulk).');

  try {
    if (realTaskIdsToDelete.length > 0) {
      console.log('Executing Supabase bulk delete for real tasks:', realTaskIdsToDelete);
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', realTaskIdsToDelete)
        .eq('user_id', userId);

      if (error) throw error;
      console.log('Supabase bulk delete for real tasks successful.');
    } else {
      console.log('No real tasks to delete from DB (bulk).');
    }

    if (originalTaskIdsToConsider.size > 0) {
      console.log('Executing Supabase delete for recurring task completion logs for originalTaskIds (bulk):', Array.from(originalTaskIdsToConsider));
      const { error: recurringLogError } = await supabase
        .from('recurring_task_completion_log')
        .delete()
        .eq('user_id', userId)
        .in('original_task_id', Array.from(originalTaskIdsToConsider));
      
      if (recurringLogError) {
        console.warn('Failed to delete recurring task completion logs during bulk delete:', recurringLogError.message);
      } else {
        console.log('Supabase delete for recurring task completion logs successful (bulk).');
      }
    }

    showSuccess('Tasks deleted successfully!');
    allIdsToDelete.forEach((id: string) => context.cancelReminder(id));
    console.log('--- bulkDeleteTasksMutation END (Success) ---');
    return true;
  } catch (error: any) {
    showError('Failed to bulk delete tasks.');
    console.error('Error bulk deleting tasks in catch block:', error.message);
    queryClient.setQueryData(['tasks', userId], previousTasks);
    console.log('Reverted optimistic update due to error (bulk).');
    console.log('--- bulkDeleteTasksMutation END (Failed) ---');
    return false;
  } finally {
    allIdsToDelete.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
    console.log('Cleared in-flight updates and invalidated queries (bulk).');
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
      .update(prepareTaskForUpdate({ status: 'archived' })) // Use prepareTaskForUpdate here
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (error) throw error;

    showSuccess('All completed tasks archived!');
  } catch (error: any) {
    showError('Failed to archive completed tasks.');
    console.error('Error archiving completed tasks:', error.message);
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
        .update(prepareTaskForUpdate({ status: 'completed' })) // Use prepareTaskForUpdate here
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

  let actualActiveId = activeId;
  let actualNewParentId = newParentId;
  let actualNewSectionId = newSectionId;

  if (isVirtualId(activeId)) {
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
        .insert(prepareTaskForInsert(newTaskData, userId)) // Use prepareTaskForInsert here
        .select()
        .single();

      if (error) throw error;
      actualActiveId = data.id;

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

  const updates: Partial<Task> = {
    parent_task_id: actualNewParentId,
    section_id: actualNewSectionId,
  };

  let newOrder: number | null = null;
  const siblings: Task[] = processedTasks.filter((t: Task) => t.parent_task_id === actualNewParentId && t.section_id === actualNewSectionId && t.id !== actualActiveId);

  if (overId) {
    const overTask = processedTasks.find((t: Task) => t.id === overId);
    if (overTask) {
      if (isDraggingDown) {
        newOrder = (overTask.order || 0) + 0.5;
      } else {
        newOrder = (overTask.order || 0) - 0.5;
      }
    }
  } else {
    newOrder = siblings.length > 0 ? Math.max(...siblings.map((s: Task) => s.order || 0)) + 1 : 0;
  }

  updates.order = newOrder;

  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    (old || []).map(task => (task.id === actualActiveId ? { ...task, ...updates } : task))
  );
  inFlightUpdatesRef.current.add(actualActiveId);

  try {
    const { error } = await supabase
      .from('tasks')
      .update(prepareTaskForUpdate(updates)) // Use prepareTaskForUpdate here
      .eq('id', actualActiveId)
      .eq('user_id', userId);

    if (error) throw error;

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
    queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => old || []);
  } finally {
    inFlightUpdatesRef.current.delete(actualActiveId);
    invalidateTasksQueries();
  }
};

export const toggleDoTodayMutation = async (task: Task, currentDate: Date, doTodayOffIds: Set<string>, context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');
  const originalTaskId = task.original_task_id || task.id;
  const isCurrentlyOff = doTodayOffIds.has(originalTaskId);

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
    queryClient.setQueryData(['do_today_off_log', userId, formattedDate], doTodayOffIds);
  } finally {
    inFlightUpdatesRef.current.delete(originalTaskId);
    invalidateTasksQueries();
  }
};

export const toggleAllDoTodayMutation = async (context: MutationContext) => { // Removed filteredTasks argument
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, processedTasks, currentDate, doTodayOffIds } = context;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');

  // Filter tasks based on the same logic as `dailyProgress` or `filteredTasks` in the UI
  const nonRecurringTopLevelTasks = processedTasks.filter(t => 
    t.recurring_type === 'none' && 
    t.parent_task_id === null &&
    t.status === 'to-do' // Only consider to-do tasks for toggling
  );
  const allOriginalTaskIds = new Set(nonRecurringTopLevelTasks.map(t => t.original_task_id || t.id));

  const tasksToTurnOff = Array.from(allOriginalTaskIds).filter(id => !doTodayOffIds.has(id));
  const tasksToTurnOn = Array.from(allOriginalTaskIds).filter(id => doTodayOffIds.has(id));

  if (tasksToTurnOff.length === 0 && tasksToTurnOn.length === 0) {
    showSuccess('No non-recurring tasks to toggle "Do Today" status.');
    return;
  }

  const isTurningAllOff = tasksToTurnOff.length > 0;

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
    queryClient.setQueryData(['do_today_off_log', userId, formattedDate], doTodayOffIds);
  } finally {
    Array.from(allOriginalTaskIds).forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const markAllTasksAsSkippedMutation = async (context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, processedTasks } = context;

  const tasksToSkip: Task[] = processedTasks.filter((t: Task) =>
    t.status === 'to-do' && t.parent_task_id === null
  );
  const taskIdsToSkip: string[] = tasksToSkip.map((t: Task) => t.id);

  if (taskIdsToSkip.length === 0) {
    showSuccess('No pending tasks to mark as skipped.');
    return;
  }

  const realTaskIdsToSkip = taskIdsToSkip.filter(id => !isVirtualId(id));
  const _virtualTaskIdsToSkip = taskIdsToSkip.filter(id => isVirtualId(id));
  void _virtualTaskIdsToSkip; // Explicitly mark as void to suppress unused variable warning

  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    (old || []).map(task => (taskIdsToSkip.includes(task.id) ? { ...task, status: 'skipped' } : task))
  );
  taskIdsToSkip.forEach((id: string) => inFlightUpdatesRef.current.add(id));

  try {
    if (realTaskIdsToSkip.length > 0) {
      const { error } = await supabase
        .from('tasks')
        .update(prepareTaskForUpdate({ status: 'skipped' })) // Use prepareTaskForUpdate here
        .in('id', realTaskIdsToSkip)
        .eq('user_id', userId);

      if (error) throw error;
    }

    showSuccess('All pending tasks marked as skipped!');
  } catch (error: any) {
    showError('Failed to mark tasks as skipped.');
    console.error('Error marking tasks as skipped:', error.message);
    queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
      (old || []).map(task => (taskIdsToSkip.includes(task.id) ? { ...task, status: 'to-do' } : task))
    );
  } finally {
    taskIdsToSkip.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};