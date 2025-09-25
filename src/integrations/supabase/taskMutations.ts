import { format, parseISO, isValid } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Task, NewTaskData, TaskUpdate, TaskSection } from '@/hooks/useTasks';
import { MutationContext } from '@/hooks/useTasks'; // Import MutationContext
import { trackInFlight } from './utils';

// Helper to get the next order value for a new task in a section
const getNextTaskOrder = (tasks: Task[], sectionId: string | null, parentTaskId: string | null): number => {
  const relevantTasks = tasks.filter(t => t.section_id === sectionId && t.parent_task_id === parentTaskId);
  if (relevantTasks.length === 0) {
    return 0;
  }
  const maxOrder = Math.max(...relevantTasks.map(t => t.order || 0));
  return maxOrder + 1;
};

// --- Task Mutations ---

export const addTaskMutation = async (newTaskData: NewTaskData, context: MutationContext): Promise<boolean> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, addReminder } = context;
  const cleanup = trackInFlight('add-task', inFlightUpdatesRef);

  try {
    const taskToInsert: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at' | 'category_color'> & { order: number | null } = {
      ...newTaskData,
      user_id: userId, // user_id is already part of NewTaskData, but we ensure it's set here
      status: newTaskData.status || 'to-do',
      priority: newTaskData.priority || 'medium',
      recurring_type: newTaskData.recurring_type || 'none',
      order: newTaskData.order ?? getNextTaskOrder(context.processedTasks, newTaskData.section_id || null, newTaskData.parent_task_id || null),
      category: newTaskData.category || null,
      due_date: newTaskData.due_date || null,
      remind_at: newTaskData.remind_at || null,
      notes: newTaskData.notes || null,
      section_id: newTaskData.section_id || null,
      parent_task_id: newTaskData.parent_task_id || null,
      original_task_id: newTaskData.original_task_id || null,
      link: newTaskData.link || null,
      image_url: newTaskData.image_url || null,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(taskToInsert)
      .select()
      .single();

    if (error) throw error;

    if (data.remind_at && data.status === 'to-do') {
      const d = parseISO(data.remind_at);
      if (isValid(d)) addReminder(data.id, `Reminder: ${data.description}`, d);
    }

    showSuccess('Task added successfully!');
    invalidateTasksQueries();
    return true;
  } catch (error: any) {
    showError('Failed to add task.');
    console.error('addTaskMutation error:', error.message);
    return false;
  } finally {
    cleanup();
  }
};

export const updateTaskMutation = async (taskId: string, updates: TaskUpdate, context: MutationContext): Promise<string | null> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, addReminder, dismissReminder } = context;
  const cleanup = trackInFlight(taskId, inFlightUpdatesRef);

  try {
    // If it's a virtual task, we need to create a real instance first
    if (taskId.startsWith('virtual-')) {
      const originalTaskId = taskId.split('-')[1];
      const originalTask = context.processedTasks.find((t: Task) => t.id === originalTaskId || t.original_task_id === originalTaskId);
      if (!originalTask) {
        throw new Error('Original task not found for virtual task.');
      }

      const newRealTaskData: NewTaskData = {
        description: originalTask.description,
        status: updates.status || originalTask.status,
        recurring_type: originalTask.recurring_type,
        category: originalTask.category,
        priority: originalTask.priority,
        due_date: updates.due_date || originalTask.due_date,
        notes: updates.notes || originalTask.notes,
        remind_at: updates.remind_at || originalTask.remind_at,
        section_id: updates.section_id || originalTask.section_id,
        parent_task_id: originalTask.parent_task_id,
        original_task_id: originalTask.id, // The original task becomes the parent of this new instance
        created_at: new Date().toISOString(),
        link: updates.link || originalTask.link,
        image_url: updates.image_url || originalTask.image_url,
        order: originalTask.order,
      };

      const { data: newRealTask, error: insertError } = await supabase
        .from('tasks')
        .insert({ ...newRealTaskData, user_id: userId })
        .select()
        .single();

      if (insertError) throw insertError;
      taskId = newRealTask.id; // Update taskId to the new real task's ID
      showSuccess('Virtual task converted to real task!');
    }

    const finalUpdates: Partial<Task> = { ...updates };
    if (updates.status === 'completed') {
      finalUpdates.completed_at = new Date().toISOString();
    } else if (updates.status === 'to-do' && context.processedTasks.find((t: Task) => t.id === taskId)?.status === 'completed') {
      finalUpdates.completed_at = null; // Clear completed_at if status changes from completed to to-do
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(finalUpdates)
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
    return taskId;
  } catch (error: any) {
    showError('Failed to update task.');
    console.error('updateTaskMutation error:', error.message);
    return null;
  } finally {
    cleanup();
  }
};

export const deleteTaskMutation = async (taskId: string, context: MutationContext): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;
  const cleanup = trackInFlight(taskId, inFlightUpdatesRef);

  try {
    // Delete the task and any sub-tasks associated with it
    const { error } = await supabase
      .from('tasks')
      .delete()
      .or(`id.eq.${taskId},parent_task_id.eq.${taskId}`)
      .eq('user_id', userId);

    if (error) throw error;

    dismissReminder(taskId);
    showSuccess('Task deleted successfully!');
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to delete task.');
    console.error('deleteTaskMutation error:', error.message);
  } finally {
    cleanup();
  }
};

export const bulkUpdateTasksMutation = async (updates: Partial<Task>, ids: string[], context: MutationContext): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, addReminder, dismissReminder } = context;
  const cleanup = trackInFlight('bulk-update-tasks', inFlightUpdatesRef);

  try {
    const updatesWithCompletedAt = { ...updates };
    if (updates.status === 'completed') {
      updatesWithCompletedAt.completed_at = new Date().toISOString();
    } else if (updates.status === 'to-do') {
      updatesWithCompletedAt.completed_at = null;
    }

    const { error } = await supabase
      .from('tasks')
      .update(updatesWithCompletedAt)
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;

    ids.forEach(id => {
      const task = context.processedTasks.find((t: Task) => t.id === id);
      if (task) {
        if (updates.remind_at && updates.status === 'to-do') {
          const d = parseISO(updates.remind_at);
          if (isValid(d)) addReminder(id, `Reminder: ${task.description}`, d);
        } else if (updates.status === 'completed' || updates.status === 'archived' || updates.remind_at === null) {
          dismissReminder(id);
        }
      }
    });

    showSuccess('Tasks updated successfully!');
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to bulk update tasks.');
    console.error('bulkUpdateTasksMutation error:', error.message);
  } finally {
    cleanup();
  }
};

export const bulkDeleteTasksMutation = async (ids: string[], context: MutationContext): Promise<boolean> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;
  const cleanup = trackInFlight('bulk-delete-tasks', inFlightUpdatesRef);

  try {
    // Fetch all tasks to identify sub-tasks of the ones being deleted
    const { data: allTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, parent_task_id')
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    const idsToDelete = new Set(ids);
    allTasks.forEach(task => {
      if (task.parent_task_id && idsToDelete.has(task.parent_task_id)) {
        idsToDelete.add(task.id); // Add sub-tasks to the deletion list
      }
    });

    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', Array.from(idsToDelete))
      .eq('user_id', userId);

    if (error) throw error;

    idsToDelete.forEach(id => dismissReminder(id));
    showSuccess('Tasks deleted successfully!');
    invalidateTasksQueries();
    return true;
  } catch (error: any) {
    showError('Failed to bulk delete tasks.');
    console.error('bulkDeleteTasksMutation error:', error.message);
    return false;
  } finally {
    cleanup();
  }
};

export const archiveAllCompletedTasksMutation = async (context: MutationContext): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;
  const cleanup = trackInFlight('archive-all-completed-tasks', inFlightUpdatesRef);

  try {
    const { data: completedTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (fetchError) throw fetchError;

    const completedTaskIds = completedTasks.map(task => task.id);

    if (completedTaskIds.length > 0) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: 'archived' })
        .in('id', completedTaskIds)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      completedTaskIds.forEach(id => dismissReminder(id));
      showSuccess('All completed tasks archived!');
      invalidateTasksQueries();
    } else {
      showSuccess('No completed tasks to archive.');
    }
  } catch (error: any) {
    showError('Failed to archive completed tasks.');
    console.error('archiveAllCompletedTasksMutation error:', error.message);
  } finally {
    cleanup();
  }
};

export const markAllTasksInSectionCompletedMutation = async (sectionId: string | null, context: MutationContext): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;
  const cleanup = trackInFlight(`mark-all-in-section-completed-${sectionId}`, inFlightUpdatesRef);

  try {
    const { data: tasksToComplete, error: fetchError } = await supabase
      .from('tasks')
      .select('id, description, remind_at')
      .eq('user_id', userId)
      .eq('section_id', sectionId)
      .eq('status', 'to-do');

    if (fetchError) throw fetchError;

    const taskIdsToComplete = tasksToComplete.map(task => task.id);

    if (taskIdsToComplete.length > 0) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .in('id', taskIdsToComplete)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      tasksToComplete.forEach(task => dismissReminder(task.id));
      showSuccess(`All tasks in section ${sectionId === null ? '"No Section"' : context.sections.find((s: TaskSection) => s.id === sectionId)?.name || ''} marked completed!`);
      invalidateTasksQueries();
    } else {
      showSuccess('No pending tasks in this section to mark completed.');
    }
  } catch (error: any) {
    showError('Failed to mark all tasks in section completed.');
    console.error('markAllTasksInSectionCompletedMutation error:', error.message);
  } finally {
    cleanup();
  }
};

export const updateTaskParentAndOrderMutation = async (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null, isDraggingDown: boolean, context: MutationContext): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const cleanup = trackInFlight(`reorder-task-${activeId}`, inFlightUpdatesRef);

  try {
    const activeTask = context.processedTasks.find((t: Task) => t.id === activeId);
    if (!activeTask) throw new Error('Active task not found.');

    const tasksInTargetSectionAndParent = context.processedTasks.filter((t: Task) =>
      t.section_id === newSectionId && t.parent_task_id === newParentId && t.id !== activeId
    ).sort((a: Task, b: Task) => (a.order || 0) - (b.order || 0));

    let newOrder: number;
    if (overId === null) { // Dropped at the end
      newOrder = tasksInTargetSectionAndParent.length > 0 ? (tasksInTargetSectionAndParent[tasksInTargetSectionAndParent.length - 1].order || 0) + 1 : 0;
    } else {
      const overTaskIndex = tasksInTargetSectionAndParent.findIndex((t: Task) => t.id === overId);
      if (overTaskIndex === -1) { // Should not happen if overId is valid
        newOrder = getNextTaskOrder(context.processedTasks, newSectionId, newParentId);
      } else {
        const overTask = tasksInTargetSectionAndParent[overTaskIndex];
        if (isDraggingDown) {
          newOrder = (overTask.order || 0) + 0.5; // Insert after
        } else {
          newOrder = (overTask.order || 0) - 0.5; // Insert before
        }
      }
    }

    const updates = {
      parent_task_id: newParentId,
      section_id: newSectionId,
      order: newOrder,
    };

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', activeId)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('Task reordered successfully!');
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to reorder task.');
    console.error('updateTaskParentAndOrderMutation error:', error.message);
  } finally {
    cleanup();
  }
};

export const toggleDoTodayMutation = async (task: Task, currentDate: Date, doTodayOffIds: Set<string>, context: MutationContext): Promise<boolean> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const cleanup = trackInFlight(`toggle-do-today-${task.id}`, inFlightUpdatesRef);

  try {
    const taskIdToToggle = task.original_task_id || task.id;
    const formattedDate = format(currentDate, 'yyyy-MM-dd');

    if (doTodayOffIds.has(taskIdToToggle)) {
      // It's currently off, so remove it from the log to turn it on
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('user_id', userId)
        .eq('task_id', taskIdToToggle)
        .eq('off_date', formattedDate);

      if (error) throw error;
      showSuccess('Task added to "Do Today"!');
    } else {
      // It's currently on, so add it to the log to turn it off
      const { error } = await supabase
        .from('do_today_off_log')
        .insert({
          user_id: userId,
          task_id: taskIdToToggle,
          off_date: formattedDate,
        });

      if (error) throw error;
      showSuccess('Task removed from "Do Today".');
    }
    invalidateTasksQueries();
    return true;
  } catch (error: any) {
    showError('Failed to update "Do Today" status.');
    console.error('toggleDoTodayMutation error:', error.message);
    return false;
  } finally {
    cleanup();
  }
};

export const toggleAllDoTodayMutation = async (tasks: Task[], currentDate: Date, doTodayOffIds: Set<string>, context: MutationContext): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const cleanup = trackInFlight('toggle-all-do-today', inFlightUpdatesRef);

  try {
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    const tasksToToggle = tasks.filter(t => t.parent_task_id === null && t.status === 'to-do');

    const allCurrentlyOn = tasksToToggle.every(task => !doTodayOffIds.has(task.original_task_id || task.id));

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
      showSuccess('All "Do Today" tasks turned off.');
    } else {
      // Turn all on (delete all relevant entries from log)
      const taskIdsToTurnOn = tasksToToggle.map(task => task.original_task_id || task.id);
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('user_id', userId)
        .eq('off_date', formattedDate)
        .in('task_id', taskIdsToTurnOn);
      if (error) throw error;
      showSuccess('All "Do Today" tasks turned on.');
    }
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to toggle all "Do Today" tasks.');
    console.error('toggleAllDoTodayMutation error:', error.message);
  } finally {
    cleanup();
  }
};