import { Task, TaskUpdate, MutationContext } from '@/hooks/useTasks';
import { format, isValid } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

// Helper to get category color
const getCategoryColor = (categoryId: string | null, categoriesMap: Map<string, string>): string => {
  return categoryId ? categoriesMap.get(categoryId) || 'gray' : 'gray';
};

// --- Task Mutations ---

export const addTaskMutation = async (
  data: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'category_color' | 'isDoTodayOff'> & { order: number | null },
  context: MutationContext
): Promise<string | null> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, scheduleReminder } = context;

  const tempId = `temp-${Date.now()}`;
  inFlightUpdatesRef.current.add(tempId);

  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    const newTask: Task = {
      ...data,
      id: tempId,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
      category_color: getCategoryColor(data.category, context.categoriesMap),
      isDoTodayOff: false,
    };
    return [...(old || []), newTask];
  });

  try {
    const { data: newTasks, error } = await supabase
      .from('tasks')
      .insert({ ...data, user_id: userId })
      .select()
      .single();

    if (error) throw error;

    // Update optimistic cache with real data
    queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
      old ? old.map((task) => (task.id === tempId ? { ...newTasks, category_color: getCategoryColor(newTasks.category, context.categoriesMap) } : task)) : [newTasks]
    );

    if (newTasks.remind_at && newTasks.status === 'to-do') {
      const d = parseISO(newTasks.remind_at);
      if (isValid(d)) scheduleReminder(newTasks.id, `Reminder: ${newTasks.description}`, d);
    }
    showSuccess('Task added!');
    invalidateTasksQueries();
    return newTasks.id;
  } catch (error: any) {
    showError('Failed to add task.');
    console.error('Error adding task:', error.message);
    // Rollback optimistic update
    queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
      old ? old.filter((task) => task.id !== tempId) : []
    );
    return null;
  } finally {
    inFlightUpdatesRef.current.delete(tempId);
  }
};

export const updateTaskMutation = async (
  taskId: string,
  updates: TaskUpdate,
  context: MutationContext
): Promise<string | null> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, scheduleReminder, cancelReminder } = context;

  inFlightUpdatesRef.current.add(taskId);

  // Optimistic update
  const previousTask = queryClient.getQueryData(['tasks', userId])?.find((t: Task) => t.id === taskId);
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    old ? old.map((task) =>
      task.id === taskId
        ? {
          ...task,
          ...updates,
          category_color: getCategoryColor(updates.category || task.category, context.categoriesMap),
          updated_at: new Date().toISOString(),
          completed_at: updates.status === 'completed' ? new Date().toISOString() : (updates.status === 'to-do' ? null : task.completed_at),
        }
        : task
    ) : []
  );

  try {
    // Handle virtual tasks: convert to real task on first update
    let actualTaskId = taskId;
    let finalUpdates = { ...updates };

    if (taskId.startsWith('virtual-')) {
      const originalTaskId = taskId.split('-')[1];
      const originalTask = context.processedTasks.find(t => t.id === originalTaskId);

      if (!originalTask) throw new Error('Original task not found for virtual task.');

      // Insert a new real task based on the virtual task's properties
      const { data: newRealTask, error: insertError } = await supabase
        .from('tasks')
        .insert({
          description: updates.description || originalTask.description,
          status: updates.status || originalTask.status,
          recurring_type: originalTask.recurring_type, // Keep original recurring type
          user_id: userId,
          category: updates.category || originalTask.category,
          priority: updates.priority || originalTask.priority,
          due_date: updates.due_date || originalTask.due_date,
          notes: updates.notes || originalTask.notes,
          remind_at: updates.remind_at || originalTask.remind_at,
          section_id: updates.section_id || originalTask.section_id,
          order: updates.order || originalTask.order,
          parent_task_id: updates.parent_task_id || originalTask.parent_task_id,
          original_task_id: originalTask.id, // Link to the original recurring task
          link: updates.link || originalTask.link,
          image_url: updates.image_url || originalTask.image_url,
          completed_at: updates.status === 'completed' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      actualTaskId = newRealTask.id;

      // Remove the virtual task from cache and add the new real task
      queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
        old ? old.filter(t => t.id !== taskId).concat({ ...newRealTask, category_color: getCategoryColor(newRealTask.category, context.categoriesMap) }) : [newRealTask]
      );
      showSuccess('Virtual task converted to real task!');
    } else {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...finalUpdates,
          updated_at: new Date().toISOString(),
          completed_at: finalUpdates.status === 'completed' ? new Date().toISOString() : (finalUpdates.status === 'to-do' ? null : previousTask?.completed_at),
        })
        .eq('id', actualTaskId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      if (data.remind_at && data.status === 'to-do') {
        const d = parseISO(data.remind_at);
        if (isValid(d)) scheduleReminder(data.id, `Reminder: ${data.description}`, d);
      } else if (data.status === 'completed' || data.status === 'archived' || data.remind_at === null) {
        cancelReminder(data.id);
      }
      showSuccess('Task updated!');
    }
    invalidateTasksQueries();
    return actualTaskId;
  } catch (error: any) {
    showError('Failed to update task.');
    console.error('Error updating task:', error.message);
    // Rollback optimistic update
    if (previousTask) {
      queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
        old ? old.map((task) => (task.id === taskId ? previousTask : task)) : []
      );
    } else {
      queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
        old ? old.filter((task) => task.id !== taskId) : []
      );
    }
    return null;
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
  }
};

export const deleteTaskMutation = async (
  taskId: string,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, cancelReminder } = context;

  inFlightUpdatesRef.current.add(taskId);

  // Optimistic update
  const previousTasks = queryClient.getQueryData(['tasks', userId]);
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    old ? old.filter((task) => task.id !== taskId && task.parent_task_id !== taskId) : []
  );

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .or(`id.eq.${taskId},parent_task_id.eq.${taskId}`)
      .eq('user_id', userId);

    if (error) throw error;

    cancelReminder(taskId);
    showSuccess('Task deleted!');
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to delete task.');
    console.error('Error deleting task:', error.message);
    // Rollback optimistic update
    queryClient.setQueryData(['tasks', userId], previousTasks);
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
  }
};

export const bulkUpdateTasksMutation = async (
  updates: Partial<Task>,
  ids: string[],
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, scheduleReminder, cancelReminder } = context;

  ids.forEach(id => inFlightUpdatesRef.current.add(id));

  // Optimistic update
  const previousTasks = queryClient.getQueryData(['tasks', userId]);
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    old ? old.map((task) =>
      ids.includes(task.id)
        ? {
          ...task,
          ...updates,
          category_color: getCategoryColor(updates.category || task.category, context.categoriesMap),
          updated_at: new Date().toISOString(),
          completed_at: updates.status === 'completed' ? new Date().toISOString() : (updates.status === 'to-do' ? null : task.completed_at),
        }
        : task
    ) : []
  );

  try {
    const { error } = await supabase
      .from('tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        completed_at: updates.status === 'completed' ? new Date().toISOString() : (updates.status === 'to-do' ? null : undefined),
      })
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;

    ids.forEach(id => {
      const updatedTask = queryClient.getQueryData(['tasks', userId])?.find((t: Task) => t.id === id);
      if (updatedTask) {
        if (updatedTask.remind_at && updatedTask.status === 'to-do') {
          const d = parseISO(updatedTask.remind_at);
          if (isValid(d)) scheduleReminder(updatedTask.id, `Reminder: ${updatedTask.description}`, d);
        } else if (updatedTask.status === 'completed' || updatedTask.status === 'archived' || updatedTask.remind_at === null) {
          cancelReminder(updatedTask.id);
        }
      }
    });
    showSuccess('Tasks updated!');
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to bulk update tasks.');
    console.error('Error bulk updating tasks:', error.message);
    // Rollback optimistic update
    queryClient.setQueryData(['tasks', userId], previousTasks);
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
  }
};

export const bulkDeleteTasksMutation = async (
  ids: string[],
  context: MutationContext
): Promise<boolean> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, cancelReminder } = context;

  ids.forEach(id => inFlightUpdatesRef.current.add(id));

  // Optimistic update
  const previousTasks = queryClient.getQueryData(['tasks', userId]);
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    old ? old.filter((task) => !ids.includes(task.id) && !ids.includes(task.parent_task_id || '')) : []
  );

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;

    ids.forEach(id => cancelReminder(id));
    showSuccess('Tasks deleted!');
    invalidateTasksQueries();
    return true;
  } catch (error: any) {
    showError('Failed to bulk delete tasks.');
    console.error('Error bulk deleting tasks:', error.message);
    // Rollback optimistic update
    queryClient.setQueryData(['tasks', userId], previousTasks);
    return false;
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
  }
};

export const archiveAllCompletedTasksMutation = async (
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, cancelReminder } = context;

  const completedTasks = context.processedTasks.filter(task => task.status === 'completed');
  const idsToArchive = completedTasks.map(task => task.id);

  if (idsToArchive.length === 0) {
    showSuccess('No completed tasks to archive.');
    return;
  }

  idsToArchive.forEach(id => inFlightUpdatesRef.current.add(id));

  // Optimistic update
  const previousTasks = queryClient.getQueryData(['tasks', userId]);
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    old ? old.map((task) =>
      idsToArchive.includes(task.id)
        ? { ...task, status: 'archived', updated_at: new Date().toISOString() }
        : task
    ) : []
  );

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .in('id', idsToArchive)
      .eq('user_id', userId);

    if (error) throw error;

    idsToArchive.forEach(id => cancelReminder(id));
    showSuccess('All completed tasks archived!');
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to archive completed tasks.');
    console.error('Error archiving completed tasks:', error.message);
    // Rollback optimistic update
    queryClient.setQueryData(['tasks', userId], previousTasks);
  } finally {
    idsToArchive.forEach(id => inFlightUpdatesRef.current.delete(id));
  }
};

export const markAllTasksInSectionCompletedMutation = async (
  sectionId: string | null,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, cancelReminder } = context;

  const tasksToComplete = context.processedTasks.filter(task =>
    task.status === 'to-do' &&
    task.parent_task_id === null && // Only mark top-level tasks
    (sectionId === null ? task.section_id === null : task.section_id === sectionId)
  );
  const idsToComplete = tasksToComplete.map(task => task.id);

  if (idsToComplete.length === 0) {
    showSuccess('No pending tasks in this section to mark complete.');
    return;
  }

  idsToComplete.forEach(id => inFlightUpdatesRef.current.add(id));

  // Optimistic update
  const previousTasks = queryClient.getQueryData(['tasks', userId]);
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) =>
    old ? old.map((task) =>
      idsToComplete.includes(task.id)
        ? { ...task, status: 'completed', updated_at: new Date().toISOString(), completed_at: new Date().toISOString() }
        : task
    ) : []
  );

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed', updated_at: new Date().toISOString(), completed_at: new Date().toISOString() })
      .in('id', idsToComplete)
      .eq('user_id', userId);

    if (error) throw error;

    idsToComplete.forEach(id => cancelReminder(id));
    showSuccess('All tasks in section marked complete!');
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to mark all tasks in section complete.');
    console.error('Error marking all tasks in section complete:', error.message);
    // Rollback optimistic update
    queryClient.setQueryData(['tasks', userId], previousTasks);
  } finally {
    idsToComplete.forEach(id => inFlightUpdatesRef.current.delete(id));
  }
};

export const updateTaskParentAndOrderMutation = async (
  activeId: string,
  newParentId: string | null,
  newSectionId: string | null,
  overId: string | null,
  isDraggingDown: boolean,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, processedTasks, invalidateTasksQueries } = context;

  inFlightUpdatesRef.current.add(activeId);

  const activeTask = processedTasks.find(t => t.id === activeId);
  if (!activeTask) {
    inFlightUpdatesRef.current.delete(activeId);
    return;
  }

  // Determine the target list of tasks for reordering
  let targetTasks: Task[];
  if (newParentId) {
    targetTasks = processedTasks.filter(t => t.parent_task_id === newParentId).sort((a, b) => (a.order || 0) - (b.order || 0));
  } else if (newSectionId) {
    targetTasks = processedTasks.filter(t => t.parent_task_id === null && t.section_id === newSectionId).sort((a, b) => (a.order || 0) - (b.order || 0));
  } else { // No section
    targetTasks = processedTasks.filter(t => t.parent_task_id === null && t.section_id === null).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  // Remove the active task from its original position in the target list if it was already there
  targetTasks = targetTasks.filter(t => t.id !== activeId);

  // Find the index to insert the active task
  let insertIndex = targetTasks.length; // Default to end
  if (overId) {
    const overTaskIndex = targetTasks.findIndex(t => t.id === overId);
    if (overTaskIndex !== -1) {
      insertIndex = isDraggingDown ? overTaskIndex + 1 : overTaskIndex;
    }
  }

  // Insert the active task into its new position
  targetTasks.splice(insertIndex, 0, { ...activeTask, parent_task_id: newParentId, section_id: newSectionId });

  // Prepare updates for all tasks in the affected list
  const updates = targetTasks.map((task, index) => ({
    id: task.id,
    order: index,
    parent_task_id: newParentId,
    section_id: newSectionId,
    user_id: userId, // Required for upsert
  }));

  // Optimistic update
  const previousTasks = queryClient.getQueryData(['tasks', userId]);
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    if (!old) return [];
    const updatedOld = old.map(task => {
      const update = updates.find(u => u.id === task.id);
      return update ? { ...task, ...update } : task;
    });
    return updatedOld;
  });

  try {
    const { error } = await supabase
      .from('tasks')
      .upsert(updates, { onConflict: 'id' });

    if (error) throw error;

    showSuccess('Task reordered!');
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to reorder task.');
    console.error('Error reordering task:', error.message);
    queryClient.setQueryData(['tasks', userId], previousTasks); // Rollback
  } finally {
    inFlightUpdatesRef.current.delete(activeId);
  }
};

export const toggleDoTodayMutation = async (
  task: Task,
  currentDate: Date,
  doTodayOffIds: Set<string>,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const logDate = format(currentDate, 'yyyy-MM-dd');
  const originalTaskId = task.original_task_id || task.id;
  const isCurrentlyOff = doTodayOffIds.has(originalTaskId);

  inFlightUpdatesRef.current.add(task.id);

  // Optimistic update
  queryClient.setQueryData(['do_today_off_log', userId, logDate], (old: Set<string> | undefined) => {
    const newSet = new Set(old || doTodayOffIds);
    if (isCurrentlyOff) {
      newSet.delete(originalTaskId);
    } else {
      newSet.add(originalTaskId);
    }
    return newSet;
  });

  try {
    if (isCurrentlyOff) {
      // Remove from do_today_off_log
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('user_id', userId)
        .eq('task_id', originalTaskId)
        .eq('off_date', logDate);
      if (error) throw error;
      showSuccess('Task added to "Do Today"!');
    } else {
      // Add to do_today_off_log
      const { error } = await supabase
        .from('do_today_off_log')
        .insert({ user_id: userId, task_id: originalTaskId, off_date: logDate });
      if (error) throw error;
      showSuccess('Task removed from "Do Today".');
    }
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to update "Do Today" status.');
    console.error('Error toggling Do Today:', error.message);
    // Rollback optimistic update
    queryClient.setQueryData(['do_today_off_log', userId, logDate], doTodayOffIds);
  } finally {
    inFlightUpdatesRef.current.delete(task.id);
  }
};

export const toggleAllDoTodayMutation = async (
  tasks: Task[],
  currentDate: Date,
  doTodayOffIds: Set<string>,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const logDate = format(currentDate, 'yyyy-MM-dd');

  const topLevelTasks = tasks.filter(t => t.parent_task_id === null && t.recurring_type === 'none');
  const allAreOff = topLevelTasks.every(task => doTodayOffIds.has(task.original_task_id || task.id));

  const idsToToggle = topLevelTasks.map(task => task.original_task_id || task.id);

  if (idsToToggle.length === 0) {
    showSuccess('No non-recurring tasks to toggle "Do Today" status.');
    return;
  }

  idsToToggle.forEach(id => inFlightUpdatesRef.current.add(id));

  // Optimistic update
  queryClient.setQueryData(['do_today_off_log', userId, logDate], (old: Set<string> | undefined) => {
    const newSet = new Set(old || doTodayOffIds);
    if (allAreOff) {
      idsToToggle.forEach(id => newSet.delete(id));
    } else {
      idsToToggle.forEach(id => newSet.add(id));
    }
    return newSet;
  });

  try {
    if (allAreOff) {
      // Remove all from do_today_off_log
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .in('task_id', idsToToggle)
        .eq('user_id', userId)
        .eq('off_date', logDate);
      if (error) throw error;
      showSuccess('All tasks added to "Do Today"!');
    } else {
      // Add all to do_today_off_log
      const recordsToInsert = idsToToggle.map(taskId => ({ user_id: userId, task_id: taskId, off_date: logDate }));
      const { error } = await supabase
        .from('do_today_off_log')
        .insert(recordsToInsert);
      if (error) throw error;
      showSuccess('All tasks removed from "Do Today".');
    }
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to toggle all "Do Today" statuses.');
    console.error('Error toggling all Do Today:', error.message);
    // Rollback optimistic update
    queryClient.setQueryData(['do_today_off_log', userId, logDate], doTodayOffIds);
  } finally {
    idsToToggle.forEach(id => inFlightUpdatesRef.current.delete(id));
  }
};