import { QueryClient } from '@tanstack/react-query';
import { Task, TaskSection, NewTaskData, TaskUpdate } from '@/hooks/useTasks';
import { format, parseISO, isValid } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';

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

// Helper to handle optimistic updates
const optimisticUpdate = (
  queryClient: QueryClient,
  queryKey: any[],
  id: string,
  updates: Partial<Task>,
  inFlightUpdatesRef: React.MutableRefObject<Set<string>>
) => {
  queryClient.setQueryData(queryKey, (oldData: Task[] | undefined) => {
    if (!oldData) return [];
    return oldData.map(task =>
      task.id === id ? { ...task, ...updates } : task
    );
  });
  inFlightUpdatesRef.current.add(id);
};

// Helper to handle optimistic deletion
const optimisticDelete = (
  queryClient: QueryClient,
  queryKey: any[],
  id: string,
  inFlightUpdatesRef: React.MutableRefObject<Set<string>>
) => {
  queryClient.setQueryData(queryKey, (oldData: Task[] | undefined) => {
    if (!oldData) return [];
    return oldData.filter(task => task.id !== id);
  });
  inFlightUpdatesRef.current.add(id);
};

// Helper to handle optimistic bulk updates
const optimisticBulkUpdate = (
  queryClient: QueryClient,
  queryKey: any[],
  updates: Partial<Task>,
  ids: string[],
  inFlightUpdatesRef: React.MutableRefObject<Set<string>>
) => {
  queryClient.setQueryData(queryKey, (oldData: Task[] | undefined) => {
    if (!oldData) return [];
    return oldData.map(task =>
      ids.includes(task.id) ? { ...task, ...updates } : task
    );
  });
  ids.forEach(id => inFlightUpdatesRef.current.add(id));
};

// Helper to handle optimistic bulk deletion
const optimisticBulkDelete = (
  queryClient: QueryClient,
  queryKey: any[],
  ids: string[],
  inFlightUpdatesRef: React.MutableRefObject<Set<string>>
) => {
  queryClient.setQueryData(queryKey, (oldData: Task[] | undefined) => {
    if (!oldData) return [];
    return oldData.filter(task => !ids.includes(task.id));
  });
  ids.forEach(id => inFlightUpdatesRef.current.add(id));
};


export const addTaskMutation = async (newTaskData: NewTaskData, context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, categoriesMap, addReminder } = context;
  const tempId = `temp-${uuidv4()}`;
  const now = new Date().toISOString();

  const categoryColor = categoriesMap.get(newTaskData.category || '') || 'gray';

  const taskToInsert: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'category_color'> & { order?: number | null } = {
    ...newTaskData,
    status: newTaskData.status || 'to-do',
    recurring_type: newTaskData.recurring_type || 'none',
    priority: newTaskData.priority || 'medium',
    order: newTaskData.order ?? 0,
  };

  const optimisticTask: Task = {
    id: tempId,
    user_id: userId,
    created_at: now,
    updated_at: now,
    completed_at: null,
    category_color: categoryColor,
    ...taskToInsert,
    description: taskToInsert.description || '', // Ensure description is not null
    category: taskToInsert.category || null,
    priority: taskToInsert.priority || 'medium',
    recurring_type: taskToInsert.recurring_type || 'none',
  };

  queryClient.setQueryData(['tasks', userId], (oldData: Task[] | undefined) => {
    return [...(oldData || []), optimisticTask];
  });
  inFlightUpdatesRef.current.add(tempId);

  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...taskToInsert, user_id: userId })
      .select()
      .single();

    if (error) throw error;

    queryClient.setQueryData(['tasks', userId], (oldData: Task[] | undefined) => {
      return oldData ? oldData.map(task => (task.id === tempId ? { ...data, category_color: categoryColor } : task)) : [data];
    });

    if (data.remind_at && data.status === 'to-do') {
      const d = parseISO(data.remind_at);
      if (isValid(d)) addReminder(data.id, `Reminder: ${data.description}`, d);
    }
    showSuccess('Task added successfully!');
    return data;
  } catch (error: any) {
    showError('Failed to add task.');
    console.error('Error adding task:', error.message);
    queryClient.setQueryData(['tasks', userId], (oldData: Task[] | undefined) =>
      oldData ? oldData.filter(task => task.id !== tempId) : []
    );
    return false;
  } finally {
    inFlightUpdatesRef.current.delete(tempId);
    invalidateTasksQueries();
  }
};

export const updateTaskMutation = async (taskId: string, updates: TaskUpdate, context: MutationContext): Promise<string | null> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder, addReminder, categoriesMap } = context;
  const now = new Date().toISOString();

  const currentTask = queryClient.getQueryData(['tasks', userId])?.find((t: Task) => t.id === taskId);
  const categoryColor = updates.category ? categoriesMap.get(updates.category) || 'gray' : currentTask?.category_color || 'gray';

  const updatedTaskData = {
    ...updates,
    updated_at: now,
    ...(updates.status === 'completed' && { completed_at: now }),
    ...(updates.status !== 'completed' && { completed_at: null }),
    category_color: categoryColor,
  };

  optimisticUpdate(queryClient, ['tasks', userId], taskId, updatedTaskData, inFlightUpdatesRef);

  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updatedTaskData)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    if (data.remind_at && data.status === 'to-do') {
      const d = parseISO(data.remind_at);
      if (isValid(d)) addReminder(data.id, `Reminder: ${data.description}`, d);
    } else {
      dismissReminder(data.id);
    }
    showSuccess('Task updated successfully!');
    return data.id;
  } catch (error: any) {
    showError('Failed to update task.');
    console.error('Error updating task:', error.message);
    // Revert optimistic update on error
    queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
    return null;
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
    invalidateTasksQueries();
  }
};

export const deleteTaskMutation = async (taskId: string, context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;

  optimisticDelete(queryClient, ['tasks', userId], taskId, inFlightUpdatesRef);
  dismissReminder(taskId);

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) throw error;
    showSuccess('Task deleted successfully!');
  } catch (error: any) {
    showError('Failed to delete task.');
    console.error('Error deleting task:', error.message);
    queryClient.invalidateQueries({ queryKey: ['tasks', userId] }); // Revert optimistic update
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
    invalidateTasksQueries();
  }
};

export const bulkUpdateTasksMutation = async (updates: Partial<Task>, ids: string[], context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder, addReminder } = context;
  const now = new Date().toISOString();

  const updatedData = {
    ...updates,
    updated_at: now,
    ...(updates.status === 'completed' && { completed_at: now }),
    ...(updates.status !== 'completed' && { completed_at: null }),
  };

  optimisticBulkUpdate(queryClient, ['tasks', userId], updatedData, ids, inFlightUpdatesRef);

  try {
    const { error } = await supabase
      .from('tasks')
      .update(updatedData)
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;

    ids.forEach(id => {
      const task = queryClient.getQueryData(['tasks', userId])?.find((t: Task) => t.id === id);
      if (task) {
        if (task.remind_at && task.status === 'to-do') {
          const d = parseISO(task.remind_at);
          if (isValid(d)) addReminder(task.id, `Reminder: ${task.description}`, d);
        } else {
          dismissReminder(task.id);
        }
      }
    });
    showSuccess('Tasks updated successfully!');
  } catch (error: any) {
    showError('Failed to bulk update tasks.');
    console.error('Error bulk updating tasks:', error.message);
    queryClient.invalidateQueries({ queryKey: ['tasks', userId] }); // Revert optimistic update
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const bulkDeleteTasksMutation = async (ids: string[], context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;

  optimisticBulkDelete(queryClient, ['tasks', userId], ids, inFlightUpdatesRef);
  ids.forEach(id => dismissReminder(id));

  try {
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
    queryClient.invalidateQueries({ queryKey: ['tasks', userId] }); // Revert optimistic update
    return false;
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const archiveAllCompletedTasksMutation = async (context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const now = new Date().toISOString();

  const completedTaskIds = context.processedTasks
    .filter(task => task.status === 'completed' && task.parent_task_id === null)
    .map(task => task.id);

  if (completedTaskIds.length === 0) {
    showSuccess('No completed tasks to archive.');
    return;
  }

  optimisticBulkUpdate(queryClient, ['tasks', userId], { status: 'archived', updated_at: now }, completedTaskIds, inFlightUpdatesRef);

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'archived', updated_at: now })
      .in('id', completedTaskIds)
      .eq('user_id', userId);

    if (error) throw error;
    showSuccess('All completed tasks archived!');
  } catch (error: any) {
    showError('Failed to archive completed tasks.');
    console.error('Error archiving completed tasks:', error.message);
    queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
  } finally {
    completedTaskIds.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const markAllTasksInSectionCompletedMutation = async (sectionId: string | null, context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const now = new Date().toISOString();

  const tasksToCompleteIds = context.processedTasks
    .filter(task =>
      task.status === 'to-do' &&
      task.parent_task_id === null &&
      (sectionId === null ? task.section_id === null : task.section_id === sectionId)
    )
    .map(task => task.id);

  if (tasksToCompleteIds.length === 0) {
    showSuccess('No pending tasks in this section to mark as completed.');
    return;
  }

  optimisticBulkUpdate(queryClient, ['tasks', userId], { status: 'completed', updated_at: now, completed_at: now }, tasksToCompleteIds, inFlightUpdatesRef);

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed', updated_at: now, completed_at: now })
      .in('id', tasksToCompleteIds)
      .eq('user_id', userId);

    if (error) throw error;
    showSuccess('All tasks in section marked as completed!');
  } catch (error: any) {
    showError('Failed to mark all tasks in section as completed.');
    console.error('Error marking all tasks in section as completed:', error.message);
    queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
  } finally {
    tasksToCompleteIds.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const updateTaskParentAndOrderMutation = async (
  activeId: string,
  newParentId: string | null,
  newSectionId: string | null,
  overId: string | null,
  isDraggingDown: boolean,
  context: MutationContext
) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, processedTasks } = context;

  const activeTask = processedTasks.find(t => t.id === activeId);
  if (!activeTask) return;

  const tasksInTargetSection = processedTasks.filter(t =>
    t.parent_task_id === newParentId &&
    (newParentId ? true : (t.section_id === newSectionId))
  ).sort((a, b) => (a.order || 0) - (b.order || 0));

  const oldIndex = tasksInTargetSection.findIndex(t => t.id === activeId);
  let newIndex = overId ? tasksInTargetSection.findIndex(t => t.id === overId) : -1;

  if (oldIndex !== -1) {
    tasksInTargetSection.splice(oldIndex, 1);
  }

  if (newIndex === -1) {
    newIndex = tasksInTargetSection.length;
  } else if (oldIndex !== -1 && oldIndex < newIndex) {
    newIndex--;
  }

  tasksInTargetSection.splice(newIndex, 0, activeTask);

  const updates = tasksInTargetSection.map((task, index) => ({
    id: task.id,
    order: index,
    parent_task_id: newParentId,
    section_id: newSectionId,
    user_id: userId,
  }));

  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (oldData: Task[] | undefined) => {
    if (!oldData) return [];
    const updatedTasksMap = new Map(oldData.map(t => [t.id, t]));
    updates.forEach(update => {
      if (updatedTasksMap.has(update.id)) {
        updatedTasksMap.set(update.id, { ...updatedTasksMap.get(update.id)!, ...update });
      }
    });
    return Array.from(updatedTasksMap.values());
  });
  updates.forEach(update => inFlightUpdatesRef.current.add(update.id));

  try {
    const { error } = await supabase
      .from('tasks')
      .upsert(updates, { onConflict: 'id' });

    if (error) throw error;
    showSuccess('Task order updated!');
  } catch (error: any) {
    showError('Failed to update task order.');
    console.error('Error updating task order:', error.message);
    queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
  } finally {
    updates.forEach(update => inFlightUpdatesRef.current.delete(update.id));
    invalidateTasksQueries();
  }
};

export const toggleDoTodayMutation = async (task: Task, currentDate: Date, doTodayOffIds: Set<string>, context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');
  const taskIdToLog = task.original_task_id || task.id;

  const isCurrentlyOff = doTodayOffIds.has(taskIdToLog);

  // Optimistic update
  queryClient.setQueryData(['do_today_off_log', userId, formattedDate], (oldData: Set<string> | undefined) => {
    const newSet = new Set(oldData || []);
    if (isCurrentlyOff) {
      newSet.delete(taskIdToLog);
    } else {
      newSet.add(taskIdToLog);
    }
    return newSet;
  });
  inFlightUpdatesRef.current.add(taskIdToLog); // Use the original task ID for in-flight tracking

  try {
    if (isCurrentlyOff) {
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('user_id', userId)
        .eq('task_id', taskIdToLog)
        .eq('off_date', formattedDate);
      if (error) throw error;
      showSuccess('Task added to "Do Today"!');
    } else {
      const { error } = await supabase
        .from('do_today_off_log')
        .insert({ user_id: userId, task_id: taskIdToLog, off_date: formattedDate });
      if (error) throw error;
      showSuccess('Task removed from "Do Today".');
    }
  } catch (error: any) {
    showError('Failed to update "Do Today" status.');
    console.error('Error toggling Do Today:', error.message);
    queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] }); // Revert optimistic update
  } finally {
    inFlightUpdatesRef.current.delete(taskIdToLog);
    invalidateTasksQueries(); // Invalidate tasks to re-evaluate visibility
  }
};

export const toggleAllDoTodayMutation = async (filteredTasks: Task[], currentDate: Date, doTodayOffIds: Set<string>, context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');

  const topLevelPendingTasks = filteredTasks.filter(t => t.parent_task_id === null && t.status === 'to-do');

  const tasksToToggleOn = topLevelPendingTasks.filter(task => doTodayOffIds.has(task.original_task_id || task.id));
  const tasksToToggleOff = topLevelPendingTasks.filter(task => !doTodayOffIds.has(task.original_task_id || task.id));

  if (tasksToToggleOn.length === 0 && tasksToToggleOff.length === 0) {
    showSuccess('No pending tasks to toggle "Do Today" status.');
    return;
  }

  // Optimistic update
  queryClient.setQueryData(['do_today_off_log', userId, formattedDate], (oldData: Set<string> | undefined) => {
    const newSet = new Set(oldData || []);
    tasksToToggleOn.forEach(task => newSet.delete(task.original_task_id || task.id));
    tasksToToggleOff.forEach(task => newSet.add(task.original_task_id || task.id));
    return newSet;
  });
  [...tasksToToggleOn, ...tasksToToggleOff].forEach(task => inFlightUpdatesRef.current.add(task.original_task_id || task.id));

  try {
    if (tasksToToggleOn.length > 0) {
      const idsToDelete = tasksToToggleOn.map(task => task.original_task_id || task.id);
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('user_id', userId)
        .eq('off_date', formattedDate)
        .in('task_id', idsToDelete);
      if (error) throw error;
    }

    if (tasksToToggleOff.length > 0) {
      const recordsToInsert = tasksToToggleOff.map(task => ({
        user_id: userId,
        task_id: task.original_task_id || task.id,
        off_date: formattedDate,
      }));
      const { error } = await supabase
        .from('do_today_off_log')
        .insert(recordsToInsert);
      if (error) throw error;
    }
    showSuccess('All "Do Today" statuses toggled!');
  } catch (error: any) {
    showError('Failed to toggle all "Do Today" statuses.');
    console.error('Error toggling all Do Today:', error.message);
    queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] }); // Revert optimistic update
  } finally {
    [...tasksToToggleOn, ...tasksToToggleOff].forEach(task => inFlightUpdatesRef.current.delete(task.original_task_id || task.id));
    invalidateTasksQueries();
  }
};