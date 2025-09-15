import { supabase } from '@/integrations/supabase/client';
import { parseISO, isValid } from 'date-fns';
import { QueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/utils/toast';
import { cleanTaskForDb } from '@/utils/taskUtils';
import { Task, TaskSection } from '@/hooks/useTasks'; // Import types

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
  // bulkUpdateTasksMutation is an external function, not a property of this context object
}

// Helper to add/remove task from in-flight updates
const trackInFlight = (id: string, inFlightUpdatesRef: React.MutableRefObject<Set<string>>, action: 'add' | 'remove') => {
  if (action === 'add') {
    inFlightUpdatesRef.current.add(id);
  } else {
    inFlightUpdatesRef.current.delete(id);
  }
};

export const addTaskMutation = async (
  newTaskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'category_color'> & { order?: number | null },
  { userId, inFlightUpdatesRef, invalidateTasksQueries, addReminder }: MutationContext
): Promise<string | null> => {
  trackInFlight('add-task-temp', inFlightUpdatesRef, 'add'); // Use a temp ID for add operation
  try {
    const payload = {
      ...cleanTaskForDb(newTaskData),
      user_id: userId,
      status: newTaskData.status || 'to-do',
      recurring_type: newTaskData.recurring_type || 'none',
      order: newTaskData.order || 0, // Default order
    };

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
    invalidateTasksQueries();
    return data.id;
  } catch (err: any) {
    showError('Failed to add task.');
    console.error('Error adding task:', err.message);
    return null;
  } finally {
    trackInFlight('add-task-temp', inFlightUpdatesRef, 'remove');
  }
};

export const updateTaskMutation = async (
  taskId: string,
  updates: Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'category_color'>>,
  { userId, inFlightUpdatesRef, invalidateTasksQueries, addReminder, dismissReminder, processedTasks }: MutationContext
): Promise<string | null> => {
  trackInFlight(taskId, inFlightUpdatesRef, 'add');
  try {
    const currentTask = processedTasks.find(t => t.id === taskId);
    if (!currentTask) throw new Error('Task not found for update.');

    const payload = cleanTaskForDb(updates);

    // Only modify completed_at if status is explicitly updated
    if (updates.status !== undefined) {
        if (updates.status === 'completed') {
            payload.completed_at = new Date().toISOString();
        } else {
            payload.completed_at = null;
        }
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    if (data.remind_at && data.status === 'to-do') {
      const d = parseISO(data.remind_at);
      if (isValid(d)) addReminder(data.id, `Reminder: ${data.description}`, d);
    } else if (data.status === 'completed' || data.status === 'archived' || data.remind_at === null) {
      dismissReminder(data.id);
    }

    showSuccess('Task updated successfully!');
    invalidateTasksQueries();
    return data.id;
  } catch (err: any) {
    showError('Failed to update task.');
    console.error('Error updating task:', err.message);
    return null;
  } finally {
    trackInFlight(taskId, inFlightUpdatesRef, 'remove');
  }
};

export const deleteTaskMutation = async (
  taskId: string,
  { userId, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder, processedTasks }: MutationContext
): Promise<void> => {
  trackInFlight(taskId, inFlightUpdatesRef, 'add');
  try {
    const taskToDelete = processedTasks.find(t => t.id === taskId);
    if (!taskToDelete) throw new Error('Task not found for deletion.');

    // Delete sub-tasks first
    const subtaskIds = processedTasks.filter(t => t.parent_task_id === taskId).map(t => t.id);
    if (subtaskIds.length > 0) {
      const { error: subtaskDeleteError } = await supabase
        .from('tasks')
        .delete()
        .in('id', subtaskIds)
        .eq('user_id', userId);
      if (subtaskDeleteError) throw subtaskDeleteError;
      subtaskIds.forEach(id => dismissReminder(id));
    }

    // Delete main task
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) throw error;

    dismissReminder(taskId);
    showSuccess('Task deleted successfully!');
    invalidateTasksQueries();
  } catch (err: any) {
    showError('Failed to delete task.');
    console.error('Error deleting task:', err.message);
  } finally {
    trackInFlight(taskId, inFlightUpdatesRef, 'remove');
  }
};

export const bulkUpdateTasksMutation = async (
  updates: Partial<Task>,
  ids: string[],
  context: Omit<MutationContext, 'bulkUpdateTasksMutation'> // Changed to Omit
): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, addReminder, dismissReminder, processedTasks } = context; // Destructure from context
  const inFlightIds = ids.map(id => `bulk-update-${id}`);
  inFlightIds.forEach(id => trackInFlight(id, inFlightUpdatesRef, 'add'));

  try {
    const payload = cleanTaskForDb(updates);

    // Only modify completed_at if status is explicitly updated
    if (updates.status !== undefined) {
        if (updates.status === 'completed') {
            payload.completed_at = new Date().toISOString();
        } else {
            payload.completed_at = null;
        }
    }

    const { error } = await supabase
      .from('tasks')
      .update(payload)
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;

    ids.forEach(id => {
      const task = processedTasks.find(t => t.id === id);
      if (task) {
        if (payload.remind_at && payload.status === 'to-do') {
          const d = parseISO(payload.remind_at);
          if (isValid(d)) addReminder(id, `Reminder: ${task.description}`, d);
        } else if (payload.status === 'completed' || payload.status === 'archived' || payload.remind_at === null) {
          dismissReminder(id);
        }
      }
    });

    showSuccess('Tasks updated successfully!');
    invalidateTasksQueries();
  } catch (err: any) {
    showError('Failed to bulk update tasks.');
    console.error('Error bulk updating tasks:', err.message);
  } finally {
    inFlightIds.forEach(id => trackInFlight(id, inFlightUpdatesRef, 'remove'));
  }
};

export const bulkDeleteTasksMutation = async (
  ids: string[],
  { userId, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder }: MutationContext
): Promise<boolean> => {
  const inFlightIds = ids.map(id => `bulk-delete-${id}`);
  inFlightIds.forEach(id => trackInFlight(id, inFlightUpdatesRef, 'add'));

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;

    ids.forEach(id => dismissReminder(id));
    showSuccess('Tasks deleted successfully!');
    invalidateTasksQueries();
    return true;
  } catch (err: any) {
    showError('Failed to bulk delete tasks.');
    console.error('Error bulk deleting tasks:', err.message);
    return false;
  } finally {
    inFlightIds.forEach(id => trackInFlight(id, inFlightUpdatesRef, 'remove'));
  }
};

export const archiveAllCompletedTasksMutation = async (
  context: MutationContext
) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, invalidateSectionsQueries, invalidateCategoriesQueries, processedTasks, sections, categoriesMap, addReminder, dismissReminder } = context;
  const completedTaskIds = processedTasks
    .filter(task => task.status === 'completed' && task.parent_task_id === null)
    .map(task => task.id);

  if (completedTaskIds.length === 0) {
    showSuccess('No completed tasks to archive.');
    return;
  }

  await bulkUpdateTasksMutation({ status: 'archived' }, completedTaskIds, { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, invalidateSectionsQueries, invalidateCategoriesQueries, addReminder, dismissReminder, categoriesMap, processedTasks, sections });
  showSuccess('All completed tasks archived!');
};

export const markAllTasksInSectionCompletedMutation = async (
  sectionId: string | null,
  context: MutationContext
) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, invalidateSectionsQueries, invalidateCategoriesQueries, processedTasks, sections, categoriesMap, addReminder, dismissReminder } = context;
  const tasksToCompleteIds = processedTasks
    .filter(task =>
      task.status === 'to-do' &&
      (sectionId === null ? task.section_id === null : task.section_id === sectionId)
    )
    .map(task => task.id);

  if (tasksToCompleteIds.length === 0) {
    showSuccess('No pending tasks in this section to mark completed.');
    return;
  }

  await bulkUpdateTasksMutation({ status: 'completed' }, tasksToCompleteIds, { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, invalidateSectionsQueries, invalidateCategoriesQueries, addReminder, dismissReminder, categoriesMap, processedTasks, sections });
  showSuccess('All tasks in section marked completed!');
};

export const updateTaskParentAndOrderMutation = async (
  activeId: string,
  newParentId: string | null,
  newSectionId: string | null,
  overId: string | null,
  isDraggingDown: boolean,
  { userId, inFlightUpdatesRef, processedTasks, invalidateTasksQueries }: MutationContext
) => {
  trackInFlight(activeId, inFlightUpdatesRef, 'add');
  try {
    const activeTask = processedTasks.find(t => t.id === activeId);
    if (!activeTask) throw new Error('Active task not found.');

    const updates: Partial<Task> = {
      parent_task_id: newParentId,
      section_id: newSectionId,
    };

    let newOrder = 0;
    const siblings = processedTasks.filter(t =>
      t.parent_task_id === newParentId &&
      t.section_id === newSectionId &&
      t.id !== activeId
    ).sort((a, b) => (a.order || 0) - (b.order || 0));

    if (overId) {
      const overIndex = siblings.findIndex(s => s.id === overId);
      if (overIndex !== -1) {
        newOrder = (siblings[overIndex]?.order || 0) + (isDraggingDown ? 1 : -1);
      } else {
        // If overId is not a sibling, place at the end or beginning
        newOrder = isDraggingDown ? (siblings[siblings.length - 1]?.order || 0) + 1 : (siblings[0]?.order || 0) - 1;
      }
    } else {
      // No overId, place at the end of the list
      newOrder = (siblings[siblings.length - 1]?.order || 0) + 1;
    }

    updates.order = newOrder;

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', activeId)
      .eq('user_id', userId);

    if (error) throw error;

    // Re-order affected siblings to ensure no duplicate orders
    const affectedSiblings = processedTasks.filter(t =>
      t.parent_task_id === newParentId &&
      t.section_id === newSectionId &&
      t.id !== activeId
    );

    const allItemsInGroup = [...affectedSiblings, { ...activeTask, ...updates } as Task]
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const reorderPayload = allItemsInGroup.map((item, index) => ({
      id: item.id,
      order: index,
      user_id: userId,
    }));

    const { error: reorderError } = await supabase
      .from('tasks')
      .upsert(reorderPayload, { onConflict: 'id' });

    if (reorderError) throw reorderError;

    showSuccess('Task reordered!');
    invalidateTasksQueries();
  } catch (err: any) {
    showError('Failed to reorder task.');
    console.error('Error reordering task:', err.message);
  } finally {
    trackInFlight(activeId, inFlightUpdatesRef, 'remove');
  }
};

export const toggleDoTodayMutation = async (
  task: Task,
  currentDate: Date,
  doTodayOffIds: Set<string>,
  { userId, inFlightUpdatesRef, invalidateTasksQueries }: MutationContext
) => {
  trackInFlight(task.id, inFlightUpdatesRef, 'add');
  try {
    const formattedDate = new Date(currentDate).toISOString().split('T')[0];
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
      showSuccess('Task added to "Do Today"!');
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
      showSuccess('Task removed from "Do Today".');
    }
    invalidateTasksQueries();
  } catch (err: any) {
    showError('Failed to update "Do Today" status.');
    console.error('Error toggling Do Today:', err.message);
  } finally {
    trackInFlight(task.id, inFlightUpdatesRef, 'remove');
  }
};

export const toggleAllDoTodayMutation = async (
  filteredTasks: Task[],
  currentDate: Date,
  doTodayOffIds: Set<string>,
  { userId, inFlightUpdatesRef, invalidateTasksQueries }: MutationContext
) => {
  const formattedDate = new Date(currentDate).toISOString().split('T')[0];
  const tasksToToggle = filteredTasks.filter(t => t.recurring_type === 'none' && t.parent_task_id === null);

  if (tasksToToggle.length === 0) {
    showSuccess('No non-recurring tasks to toggle.');
    return;
  }

  const allAreOn = tasksToToggle.every(t => !doTodayOffIds.has(t.original_task_id || t.id));

  const inFlightIds = tasksToToggle.map(t => `toggle-all-${t.id}`);
  inFlightIds.forEach(id => trackInFlight(id, inFlightUpdatesRef, 'add'));

  try {
    if (allAreOn) {
      // All are currently 'on', so turn them 'off'
      const recordsToInsert = tasksToToggle.map(t => ({
        user_id: userId,
        task_id: t.original_task_id || t.id,
        off_date: formattedDate,
      }));
      const { error } = await supabase.from('do_today_off_log').insert(recordsToInsert);
      if (error) throw error;
      showSuccess('All tasks removed from "Do Today".');
    } else {
      // Some are 'off', so turn them 'on' (delete existing 'off' records)
      const taskIdsToTurnOn = tasksToToggle
        .filter(t => doTodayOffIds.has(t.original_task_id || t.id))
        .map(t => t.original_task_id || t.id);

      if (taskIdsToTurnOn.length > 0) {
        const { error } = await supabase
          .from('do_today_off_log')
          .delete()
          .eq('user_id', userId)
          .eq('off_date', formattedDate)
          .in('task_id', taskIdsToTurnOn);
        if (error) throw error;
        showSuccess('All tasks added to "Do Today"!');
      } else {
        showSuccess('All tasks are already in "Do Today".');
      }
    }
    invalidateTasksQueries();
  } catch (err: any) {
    showError('Failed to toggle "Do Today" status for all tasks.');
    console.error('Error toggling all Do Today:', err.message);
  } finally {
    inFlightIds.forEach(id => trackInFlight(id, inFlightUpdatesRef, 'remove'));
  }
};