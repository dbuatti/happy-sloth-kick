import { QueryClient } from '@tanstack/react-query';
import { Task, TaskSection } from '@/hooks/useTasks'; // Import Task type
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating new IDs
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isValid } from 'date-fns';
import { showSuccess, showError } from '@/utils/toast'; // Import toast utilities

// Define a more comprehensive MutationContext interface
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

interface NewTaskData {
  description: string;
  status?: Task['status'];
  recurring_type?: Task['recurring_type'];
  category: string | null;
  priority?: Task['priority'];
  due_date?: string | null;
  notes?: string | null;
  remind_at?: string | null;
  section_id?: string | null;
  parent_task_id?: string | null;
  original_task_id?: string | null;
  created_at?: string; // Allow created_at to be passed for virtual tasks
  link?: string | null;
  image_url?: string | null;
  order?: number | null;
}

type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'category_color'>>;

export const addTaskMutation = async (
  newTaskData: NewTaskData,
  context: MutationContext
): Promise<string | null> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, addReminder, categoriesMap } = context;

  const categoryColor = newTaskData.category ? categoriesMap.get(newTaskData.category) || 'gray' : 'gray';

  const payload = {
    user_id: userId,
    completed_at: null,
    status: 'to-do' as Task['status'], // Explicitly cast
    recurring_type: 'none' as Task['recurring_type'], // Explicitly cast
    priority: 'medium' as Task['priority'], // Explicitly cast
    due_date: null,
    notes: null,
    remind_at: null,
    section_id: null,
    order: null,
    original_task_id: null,
    parent_task_id: null,
    link: null,
    image_url: null,
    ...newTaskData, // Spread newTaskData last to allow it to override defaults
  };

  // Optimistic update
  const newId = uuidv4();
  const optimisticTask: Task = {
    id: newId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    description: payload.description || '', // Ensure description is string
    status: payload.status,
    recurring_type: payload.recurring_type,
    priority: payload.priority,
    category: payload.category, // Ensure category is included
    category_color: categoryColor,
    due_date: payload.due_date,
    notes: payload.notes,
    remind_at: payload.remind_at,
    section_id: payload.section_id,
    order: payload.order,
    original_task_id: payload.original_task_id,
    parent_task_id: payload.parent_task_id,
    link: payload.link,
    image_url: payload.image_url,
    user_id: userId, // Add user_id
    completed_at: payload.completed_at, // Add completed_at
  };

  inFlightUpdatesRef.current.add(newId);
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    return old ? [...old, optimisticTask] : [optimisticTask];
  });

  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

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
    inFlightUpdatesRef.current.delete(newId);
    invalidateTasksQueries();
  }
};

export const updateTaskMutation = async (
  taskId: string,
  updates: TaskUpdate,
  context: MutationContext
): Promise<string | null> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, addReminder, dismissReminder, categoriesMap, processedTasks } = context;

  const currentTask = processedTasks.find(t => t.id === taskId);
  if (!currentTask) {
    showError('Task not found for update.');
    return null;
  }

  // Remove category_color from updates before sending to DB
  const { category_color, ...updatesWithoutColor } = updates;

  const finalUpdates: Partial<Task> = {
    ...updatesWithoutColor,
    updated_at: new Date().toISOString(),
  };

  if (updates.status === 'completed' || updates.status === 'archived') {
    finalUpdates.completed_at = new Date().toISOString();
  } else if (currentTask.status === 'completed' && updates.status === 'to-do') {
    finalUpdates.completed_at = null;
  }

  // Handle virtual task conversion to real task if it's being updated
  let realTaskId = taskId;
  if (taskId.startsWith('virtual-') && !currentTask.original_task_id) {
    const virtualTaskCreatedAt = parseISO(currentTask.created_at);

    const newRealTaskData: NewTaskData = {
      description: currentTask.description || '', // Ensure description is string
      status: currentTask.status,
      recurring_type: currentTask.recurring_type,
      category: currentTask.category,
      priority: currentTask.priority,
      due_date: currentTask.due_date,
      notes: currentTask.notes,
      remind_at: currentTask.remind_at,
      section_id: currentTask.section_id,
      order: currentTask.order,
      original_task_id: currentTask.id, // The virtual task's ID becomes the original_task_id for the new real instance
      parent_task_id: currentTask.parent_task_id,
      created_at: virtualTaskCreatedAt.toISOString(), // Set created_at to the virtual task's date
      link: currentTask.link,
      image_url: currentTask.image_url,
    };

    const newId = await addTaskMutation(newRealTaskData, context);
    if (!newId) {
      showError('Failed to create real task instance for virtual task update.');
      return null;
    }
    realTaskId = newId;
  }

  // Optimistic update
  inFlightUpdatesRef.current.add(realTaskId);
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    return old?.map(task => task.id === realTaskId ? { ...task, ...finalUpdates, category_color: category_color || currentTask.category_color } : task) || [];
  });

  try {
    const { error } = await supabase
      .from('tasks')
      .update(finalUpdates)
      .eq('id', realTaskId)
      .eq('user_id', userId);

    if (error) throw error;

    if (finalUpdates.remind_at && finalUpdates.status === 'to-do') {
      const d = parseISO(finalUpdates.remind_at);
      if (isValid(d)) addReminder(realTaskId, `Reminder: ${finalUpdates.description || ''}`, d);
    } else if (finalUpdates.status === 'completed' || finalUpdates.status === 'archived' || finalUpdates.remind_at === null) {
      dismissReminder(realTaskId);
    }

    showSuccess('Task updated successfully!');
    return realTaskId;
  } catch (error: any) {
    showError('Failed to update task.');
    console.error('Error updating task:', error.message);
    return null;
  } finally {
    inFlightUpdatesRef.current.delete(realTaskId);
    invalidateTasksQueries();
  }
};

export const deleteTaskMutation = async (
  taskId: string,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;

  // Optimistic update
  inFlightUpdatesRef.current.add(taskId);
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    return old?.filter(task => task.id !== taskId && task.parent_task_id !== taskId) || [];
  });

  try {
    // Delete subtasks first
    await supabase.from('tasks').delete().eq('parent_task_id', taskId).eq('user_id', userId);

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) throw error;

    dismissReminder(taskId);
    showSuccess('Task deleted successfully!');
  } catch (error: any) {
    showError('Failed to delete task.');
    console.error('Error deleting task:', error.message);
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
    invalidateTasksQueries();
  }
};

export const bulkUpdateTasksMutation = async (
  updates: Partial<Task>,
  ids: string[],
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, addReminder, dismissReminder } = context;

  // Filter out category_color from updates before sending to DB
  const { category_color, ...updatesWithoutColor } = updates;

  // Optimistic update
  ids.forEach(id => inFlightUpdatesRef.current.add(id));
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    return old?.map(task => ids.includes(task.id) ? { ...task, ...updates, category_color: category_color || task.category_color } : task) || [];
  });

  try {
    const { error } = await supabase
      .from('tasks')
      .update(updatesWithoutColor)
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;

    ids.forEach(id => {
      if (updates.remind_at && updates.status === 'to-do') {
        const d = parseISO(updates.remind_at);
        if (isValid(d)) addReminder(id, `Reminder: ${updates.description || ''}`, d);
      } else if (updates.status === 'completed' || updates.status === 'archived' || updates.remind_at === null) {
        dismissReminder(id);
      }
    });
    showSuccess('Tasks updated successfully!');
  } catch (error: any) {
    showError('Failed to update tasks.');
    console.error('Error bulk updating tasks:', error.message);
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const bulkDeleteTasksMutation = async (
  ids: string[],
  context: MutationContext
): Promise<boolean> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;

  // Optimistic update
  ids.forEach(id => inFlightUpdatesRef.current.add(id));
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    return old?.filter(task => !ids.includes(task.id) && !ids.includes(task.parent_task_id || '')) || [];
  });

  try {
    // Delete subtasks first
    await supabase.from('tasks').delete().in('parent_task_id', ids).eq('user_id', userId);

    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;

    ids.forEach(id => dismissReminder(id));
    showSuccess('Tasks deleted successfully!');
    return true;
  } catch (error: any) {
    showError('Failed to delete tasks.');
    console.error('Error bulk deleting tasks:', error.message);
    return false;
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const archiveAllCompletedTasksMutation = async (
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder, processedTasks } = context;

  const completedTaskIds = processedTasks
    .filter(task => task.status === 'completed' && task.parent_task_id === null)
    .map(task => task.id);

  if (completedTaskIds.length === 0) {
    showSuccess('No completed tasks to archive!');
    return;
  }

  // Optimistic update
  completedTaskIds.forEach(id => inFlightUpdatesRef.current.add(id));
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    return old?.map(task => completedTaskIds.includes(task.id) ? { ...task, status: 'archived', completed_at: new Date().toISOString() } : task) || [];
  });

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'archived', completed_at: new Date().toISOString() })
      .in('id', completedTaskIds)
      .eq('user_id', userId);

    if (error) throw error;
    showSuccess('All completed tasks archived!');
    completedTaskIds.forEach(id => dismissReminder(id));
  } catch (error: any) {
    showError('Failed to archive completed tasks.');
    console.error('Error archiving completed tasks:', error.message);
  } finally {
    completedTaskIds.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const markAllTasksInSectionCompletedMutation = async (
  sectionId: string | null,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder, processedTasks } = context;

  const tasksToCompleteIds = processedTasks
    .filter(task =>
      task.status === 'to-do' &&
      task.parent_task_id === null && // Only top-level tasks
      (sectionId === null ? task.section_id === null : task.section_id === sectionId)
    )
    .map(task => task.id);

  if (tasksToCompleteIds.length === 0) {
    showSuccess('No pending tasks in this section to mark as completed!');
    return;
  }

  // Optimistic update
  tasksToCompleteIds.forEach(id => inFlightUpdatesRef.current.add(id));
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    return old?.map(task => tasksToCompleteIds.includes(task.id) ? { ...task, status: 'completed', completed_at: new Date().toISOString() } : task) || [];
  });

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .in('id', tasksToCompleteIds)
      .eq('user_id', userId);

    if (error) throw error;

    tasksToCompleteIds.forEach(id => dismissReminder(id));
    showSuccess('All tasks in section marked as completed!');
  } catch (error: any) {
    showError('Failed to mark all tasks in section as completed.');
    console.error('Error marking all tasks in section completed:', error.message);
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
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, processedTasks } = context;

  const activeTask = processedTasks.find(t => t.id === activeId);
  if (!activeTask) return;

  const updates: Partial<Task> = {
    parent_task_id: newParentId,
    section_id: newSectionId,
  };

  // Determine new order
  let newOrder: number | null = null;
  const siblings = processedTasks.filter(t => t.parent_task_id === newParentId && t.section_id === newSectionId && t.id !== activeId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (overId) {
    const overTaskIndex = siblings.findIndex(t => t.id === overId);
    if (overTaskIndex !== -1) {
      if (isDraggingDown) {
        newOrder = (siblings[overTaskIndex]?.order || 0) + 1;
      } else {
        newOrder = (siblings[overTaskIndex]?.order || 0) - 1;
      }
    }
  } else if (siblings.length > 0) {
    newOrder = (siblings[siblings.length - 1].order || 0) + 1;
  } else {
    newOrder = 0;
  }
  updates.order = newOrder;

  // Optimistic update
  inFlightUpdatesRef.current.add(activeId);
  queryClient.setQueryData(['tasks', userId], (old: Task[] | undefined) => {
    return old?.map(task => task.id === activeId ? { ...task, ...updates } : task) || [];
  });

  try {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', activeId)
      .eq('user_id', userId);

    if (error) throw error;
    showSuccess('Task reordered!');
  } catch (error: any) {
    showError('Failed to reorder task.');
    console.error('Error reordering task:', error.message);
  } finally {
    inFlightUpdatesRef.current.delete(activeId);
    invalidateTasksQueries();
  }
};

export const toggleDoTodayMutation = async (
  task: Task,
  currentDate: Date,
  doTodayOffIds: Set<string>,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');
  const taskId = task.original_task_id || task.id;
  const isCurrentlyOff = doTodayOffIds.has(taskId);

  // Optimistic update
  inFlightUpdatesRef.current.add(taskId);
  queryClient.setQueryData(['do_today_off_log', userId, formattedDate], (old: Set<string> | undefined) => {
    const newSet = new Set(old);
    if (isCurrentlyOff) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    return newSet;
  });

  try {
    if (isCurrentlyOff) {
      // Remove from do_today_off_log
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('task_id', taskId)
        .eq('off_date', formattedDate)
        .eq('user_id', userId);
      if (error) throw error;
      showSuccess(`'${task.description}' added to 'Do Today'`);
    } else {
      // Add to do_today_off_log
      const { error } = await supabase
        .from('do_today_off_log')
        .insert({ task_id: taskId, off_date: formattedDate, user_id: userId });
      if (error) throw error;
      showSuccess(`'${task.description}' removed from 'Do Today'`);
    }
  } catch (error: any) {
    showError('Failed to update "Do Today" status.');
    console.error('Error toggling "Do Today" status:', error.message);
    // Revert optimistic update on error (re-fetch to be safe)
    queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] });
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
    invalidateTasksQueries();
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

  const nonRecurringTopLevelTasks = filteredTasks.filter(
    (task) => task.recurring_type === 'none' && task.parent_task_id === null
  );

  const allAreOn = nonRecurringTopLevelTasks.every(
    (task) => !doTodayOffIds.has(task.original_task_id || task.id)
  );

  const idsToUpdate = nonRecurringTopLevelTasks.map((task) => task.original_task_id || task.id);

  if (idsToUpdate.length === 0) {
    showSuccess('No non-recurring tasks to toggle "Do Today" status.');
    return;
  }

  // Optimistic update
  idsToUpdate.forEach((id) => inFlightUpdatesRef.current.add(id));
  queryClient.setQueryData(['do_today_off_log', userId, formattedDate], (old: Set<string> | undefined) => {
    const newSet = new Set(old);
    if (allAreOn) {
      // If all were 'on', turn them all 'off'
      idsToUpdate.forEach((id) => newSet.add(id));
    } else {
      // If some were 'off', turn them all 'on'
      idsToUpdate.forEach((id) => newSet.delete(id));
    }
    return newSet;
  });

  try {
    if (!allAreOn) {
      // Turn all 'on' (remove from off_log)
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .in('task_id', idsToUpdate)
        .eq('off_date', formattedDate)
        .eq('user_id', userId);
      if (error) throw error;
      showSuccess('All non-recurring tasks added to "Do Today"!');
    } else {
      // Turn all 'off' (add to off_log)
      const recordsToInsert = idsToUpdate.map((id) => ({
        task_id: id,
        off_date: formattedDate,
        user_id: userId,
      }));
      const { error } = await supabase
        .from('do_today_off_log')
        .insert(recordsToInsert);
      if (error) throw error;
      showSuccess('All non-recurring tasks removed from "Do Today"!');
    }
  } catch (error: any) {
    showError('Failed to toggle all "Do Today" statuses.');
    console.error('Error toggling all "Do Today" statuses:', error.message);
    // Revert optimistic update on error (re-fetch to be safe)
    queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] });
  } finally {
    idsToUpdate.forEach((id) => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};