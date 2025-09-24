import { QueryClient } from '@tanstack/react-query';
import { Task, TaskSection } from '@/hooks/useTasks';
import { format, parseISO, isValid } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { arrayMove } from '@dnd-kit/sortable';

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

// Helper to add/update reminders
const handleReminder = (task: Task, context: MutationContext) => {
  if (task.remind_at && task.status === 'to-do') {
    const d = parseISO(task.remind_at);
    if (isValid(d)) {
      context.addReminder(task.id, `Reminder: ${task.description}`, d);
    }
  } else {
    context.dismissReminder(task.id);
  }
};

// --- Task Mutations ---

export const addTaskMutation = async (
  newTaskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'category_color'> & { order?: number | null },
  context: MutationContext,
): Promise<Task | null> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, categoriesMap } = context;
  if (!userId) {
    showError('User not authenticated.');
    return null;
  }

  inFlightUpdatesRef.current.add('addTask');
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...newTaskData, user_id: userId })
      .select()
      .single();

    if (error) throw error;

    const addedTask = { ...data, category_color: categoriesMap.get(data.category || '') || 'gray' };
    handleReminder(addedTask, context);
    showSuccess('Task added successfully!');
    invalidateTasksQueries();
    return addedTask;
  } catch (err: any) {
    console.error('Error adding task:', err.message);
    showError('Failed to add task.');
    return null;
  } finally {
    inFlightUpdatesRef.current.delete('addTask');
  }
};

export const updateTaskMutation = async (
  taskId: string,
  updates: Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'category_color'>>,
  context: MutationContext,
): Promise<string | null> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, categoriesMap, processedTasks } = context;
  if (!userId) {
    showError('User not authenticated.');
    return null;
  }

  let finalTaskId = taskId;
  let taskToUpdate: Task | undefined;

  if (taskId.startsWith('virtual-')) {
    // This is a virtual task, we need to materialize it first
    const originalTaskId = taskId.split('-')[1]; // Assuming format 'virtual-{originalId}-{date}'
    const virtualTaskTemplate = processedTasks.find(t => t.id === taskId);

    if (!virtualTaskTemplate) {
      showError('Virtual task template not found.');
      return null;
    }

    // Create a new real task based on the virtual task's properties
    const newRealTaskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'category_color'> & { order?: number | null } = {
      description: virtualTaskTemplate.description,
      status: virtualTaskTemplate.status,
      recurring_type: virtualTaskTemplate.recurring_type,
      category: virtualTaskTemplate.category,
      priority: virtualTaskTemplate.priority,
      due_date: virtualTaskTemplate.due_date,
      notes: virtualTaskTemplate.notes,
      remind_at: virtualTaskTemplate.remind_at,
      section_id: virtualTaskTemplate.section_id,
      order: virtualTaskTemplate.order,
      original_task_id: originalTaskId, // Link to the original recurring task
      parent_task_id: virtualTaskTemplate.parent_task_id,
      link: virtualTaskTemplate.link,
      image_url: virtualTaskTemplate.image_url,
      // created_at and updated_at are handled by DB defaults
    };

    const newRealTask = await addTaskMutation(newRealTaskData, context);
    if (!newRealTask) {
      showError('Failed to materialize virtual task.');
      return null;
    }
    finalTaskId = newRealTask.id;
    taskToUpdate = newRealTask; // Now we have a real task to update
  } else {
    // This is an existing real task
    taskToUpdate = processedTasks.find(t => t.id === taskId);
    if (!taskToUpdate) {
      showError('Task not found for update.');
      return null;
    }
    finalTaskId = taskId;
  }

  inFlightUpdatesRef.current.add(finalTaskId);
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...updates,
        ...(updates.status === 'completed' && { completed_at: new Date().toISOString() }),
        ...(updates.status !== 'completed' && { completed_at: null }),
      })
      .eq('id', finalTaskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    const updatedTask = { ...data, category_color: categoriesMap.get(data.category || '') || 'gray' };
    handleReminder(updatedTask, context);
    showSuccess('Task updated successfully!');
    invalidateTasksQueries();
    return updatedTask.id;
  } catch (err: any) {
    console.error('Error updating task:', err.message);
    showError('Failed to update task.');
    return null;
  } finally {
    inFlightUpdatesRef.current.delete(finalTaskId);
  }
};

export const deleteTaskMutation = async (
  taskId: string,
  context: MutationContext,
): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries } = context;
  if (!userId) {
    showError('User not authenticated.');
    return;
  }

  inFlightUpdatesRef.current.add(taskId);
  try {
    // Delete sub-tasks first
    const { error: subtaskError } = await supabase
      .from('tasks')
      .delete()
      .eq('parent_task_id', taskId)
      .eq('user_id', userId);

    if (subtaskError) throw subtaskError;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) throw error;

    context.dismissReminder(taskId);
    showSuccess('Task deleted successfully!');
    invalidateTasksQueries();
  } catch (err: any) {
    console.error('Error deleting task:', err.message);
    showError('Failed to delete task.');
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
  }
};

export const bulkUpdateTasksMutation = async (
  updates: Partial<Task>,
  ids: string[],
  context: MutationContext,
): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries } = context;
  if (!userId) {
    showError('User not authenticated.');
    return;
  }

  ids.forEach(id => inFlightUpdatesRef.current.add(id));
  try {
    const { error } = await supabase
      .from('tasks')
      .update({
        ...updates,
        ...(updates.status === 'completed' && { completed_at: new Date().toISOString() }),
        ...(updates.status !== 'completed' && { completed_at: null }),
      })
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;

    // Re-evaluate reminders for updated tasks
    const { data: updatedTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .in('id', ids)
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    updatedTasks.forEach(task => handleReminder(task as Task, context));

    showSuccess('Tasks updated successfully!');
    invalidateTasksQueries();
  } catch (err: any) {
    console.error('Error bulk updating tasks:', err.message);
    showError('Failed to update tasks.');
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
  }
};

export const bulkDeleteTasksMutation = async (
  ids: string[],
  context: MutationContext,
): Promise<boolean> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries } = context;
  if (!userId) {
    showError('User not authenticated.');
    return false;
  }

  ids.forEach(id => inFlightUpdatesRef.current.add(id));
  try {
    // Delete sub-tasks first
    const { error: subtaskError } = await supabase
      .from('tasks')
      .delete()
      .in('parent_task_id', ids)
      .eq('user_id', userId);

    if (subtaskError) throw subtaskError;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;

    ids.forEach(id => context.dismissReminder(id));
    showSuccess('Tasks deleted successfully!');
    invalidateTasksQueries();
    return true;
  } catch (err: any) {
    console.error('Error bulk deleting tasks:', err.message);
    showError('Failed to delete tasks.');
    return false;
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
  }
};

export const archiveAllCompletedTasksMutation = async (
  context: MutationContext,
): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries } = context;
  if (!userId) {
    showError('User not authenticated.');
    return;
  }

  inFlightUpdatesRef.current.add('archiveAllCompleted');
  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'archived' })
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (error) throw error;

    showSuccess('All completed tasks archived!');
    invalidateTasksQueries();
  } catch (err: any) {
    console.error('Error archiving completed tasks:', err.message);
    showError('Failed to archive completed tasks.');
  } finally {
    inFlightUpdatesRef.current.delete('archiveAllCompleted');
  }
};

export const markAllTasksInSectionCompletedMutation = async (
  sectionId: string | null,
  context: MutationContext,
): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries } = context;
  if (!userId) {
    showError('User not authenticated.');
    return;
  }

  inFlightUpdatesRef.current.add(`markAllCompleted-${sectionId || 'no-section'}`);
  try {
    let query = supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'to-do');

    if (sectionId === null) {
      query = query.is('section_id', null);
    } else {
      query = query.eq('section_id', sectionId);
    }

    const { error } = await query;

    if (error) throw error;

    showSuccess('All tasks in section marked completed!');
    invalidateTasksQueries();
  } catch (err: any) {
    console.error('Error marking all tasks in section completed:', err.message);
    showError('Failed to mark tasks completed.');
  } finally {
    inFlightUpdatesRef.current.delete(`markAllCompleted-${sectionId || 'no-section'}`);
  }
};

export const updateTaskParentAndOrderMutation = async (
  activeId: string,
  newParentId: string | null,
  newSectionId: string | null,
  overId: string | null,
  isDraggingDown: boolean,
  context: MutationContext,
): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, processedTasks } = context;
  if (!userId) {
    showError('User not authenticated.');
    return;
  }

  let finalActiveId = activeId;
  let activeTask: Task | undefined = processedTasks.find(t => t.id === activeId);

  if (activeId.startsWith('virtual-')) {
    // Materialize the virtual task first
    const originalTaskId = activeId.split('-')[1];
    const virtualTaskTemplate = processedTasks.find(t => t.id === activeId);

    if (!virtualTaskTemplate) {
      showError('Virtual task template not found for drag operation.');
      return;
    }

    const newRealTaskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'category_color'> & { order?: number | null } = {
      description: virtualTaskTemplate.description,
      status: virtualTaskTemplate.status,
      recurring_type: virtualTaskTemplate.recurring_type,
      category: virtualTaskTemplate.category,
      priority: virtualTaskTemplate.priority,
      due_date: virtualTaskTemplate.due_date,
      notes: virtualTaskTemplate.notes,
      remind_at: virtualTaskTemplate.remind_at,
      section_id: virtualTaskTemplate.section_id,
      order: virtualTaskTemplate.order,
      original_task_id: originalTaskId,
      parent_task_id: virtualTaskTemplate.parent_task_id,
      link: virtualTaskTemplate.link,
      image_url: virtualTaskTemplate.image_url,
      // created_at and updated_at are handled by DB defaults
    };

    const newRealTask = await addTaskMutation(newRealTaskData, context);
    if (!newRealTask) {
      showError('Failed to materialize virtual task during drag operation.');
      return;
    }
    finalActiveId = newRealTask.id;
    activeTask = newRealTask; // Update activeTask to the real one
  }

  if (!activeTask) {
    showError('Active task not found after materialization attempt.');
    return;
  }

  inFlightUpdatesRef.current.add(finalActiveId);
  try {
    let newOrder: number | null = null;

    if (overId) {
      const overTask = processedTasks.find(t => t.id === overId);
      if (overTask) {
        const siblings = processedTasks.filter(t => t.parent_task_id === newParentId && t.section_id === newSectionId);
        const currentOrderIds = siblings.sort((a, b) => (a.order || 0) - (b.order || 0)).map(t => t.id);
        const oldIndex = currentOrderIds.indexOf(finalActiveId);
        const newIndex = currentOrderIds.indexOf(overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const reorderedIds = arrayMove(currentOrderIds, oldIndex, newIndex);
          const updatedSiblings = reorderedIds.map(id => ({
            id,
            order: reorderedIds.indexOf(id),
          }));

          const activeTaskNewOrder = updatedSiblings.find(item => item.id === finalActiveId)?.order;
          if (activeTaskNewOrder !== undefined) {
            newOrder = activeTaskNewOrder;
          }

          const { error: batchUpdateError } = await supabase
            .from('tasks')
            .upsert(updatedSiblings.map(item => ({
              id: item.id,
              order: item.order,
              user_id: userId,
            })), { onConflict: 'id' });

          if (batchUpdateError) throw batchUpdateError;
        } else {
          newOrder = (overTask.order || 0) + (isDraggingDown ? 0.5 : -0.5);
        }
      }
    } else {
      const siblingsInNewLocation = processedTasks.filter(t => t.parent_task_id === newParentId && t.section_id === newSectionId);
      newOrder = siblingsInNewLocation.length > 0 ? Math.max(...siblingsInNewLocation.map(t => t.order || 0)) + 1 : 0;
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        parent_task_id: newParentId,
        section_id: newSectionId,
        order: newOrder,
      })
      .eq('id', finalActiveId)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('Task reordered successfully!');
    invalidateTasksQueries();
  } catch (err: any) {
    console.error('Error updating task parent and order:', err.message);
    showError('Failed to reorder task.');
  } finally {
    inFlightUpdatesRef.current.delete(finalActiveId);
  }
};

export const toggleDoTodayMutation = async (
  task: Task,
  effectiveCurrentDate: Date,
  doTodayOffIds: Set<string>,
  context: MutationContext,
): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries } = context;
  if (!userId) {
    showError('User not authenticated.');
    return;
  }

  const originalId = task.original_task_id || task.id;
  const formattedDate = format(effectiveCurrentDate, 'yyyy-MM-dd');
  const isCurrentlyDoToday = task.recurring_type !== 'none' || !doTodayOffIds.has(originalId);

  inFlightUpdatesRef.current.add(`toggleDoToday-${originalId}`);
  try {
    if (isCurrentlyDoToday) {
      // Turn OFF "Do Today"
      if (task.recurring_type === 'none') {
        const { error } = await supabase
          .from('do_today_off_log')
          .insert({ user_id: userId, task_id: originalId, off_date: formattedDate });
        if (error) throw error;
        showSuccess('Task removed from "Do Today".');
      } else {
        // For recurring tasks, "turning off" means marking it skipped for today
        await updateTaskMutation(task.id, { status: 'skipped' }, context);
        showSuccess('Recurring task skipped for today.');
      }
    } else {
      // Turn ON "Do Today"
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('user_id', userId)
        .eq('task_id', originalId)
        .eq('off_date', formattedDate);
      if (error) throw error;
      showSuccess('Task added to "Do Today".');
    }
    invalidateTasksQueries();
    context.queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] });
  } catch (err: any) {
    console.error('Error toggling "Do Today" status:', err.message);
    showError('Failed to toggle "Do Today" status.');
  } finally {
    inFlightUpdatesRef.current.delete(`toggleDoToday-${originalId}`);
  }
};

export const toggleAllDoTodayMutation = async (
  tasksToToggle: Task[],
  effectiveCurrentDate: Date,
  doTodayOffIds: Set<string>,
  context: MutationContext,
): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries } = context;
  if (!userId) {
    showError('User not authenticated.');
    return;
  }

  const tasksToInsertIntoLog: { task_id: string; off_date: string; user_id: string }[] = [];
  const tasksToDeleteFromLog: string[] = [];
  const tasksToUpdateStatus: { id: string; status: Task['status'] }[] = [];

  const formattedDate = format(effectiveCurrentDate, 'yyyy-MM-dd');

  for (const task of tasksToToggle) {
    const originalId = task.original_task_id || task.id;
    const isCurrentlyDoToday = task.recurring_type !== 'none' || !doTodayOffIds.has(originalId);

    if (isCurrentlyDoToday) {
      // If it's currently "Do Today", we want to turn it OFF
      if (task.recurring_type === 'none') {
        tasksToInsertIntoLog.push({
          task_id: originalId,
          off_date: formattedDate,
          user_id: userId,
        });
      } else {
        // For recurring tasks, "turning off" means marking it skipped for today
        tasksToUpdateStatus.push({ id: task.id, status: 'skipped' });
      }
    } else {
      // If it's currently NOT "Do Today", we want to turn it ON
      if (task.recurring_type === 'none') {
        const logEntry = await supabase
          .from('do_today_off_log')
          .select('id')
          .eq('user_id', userId)
          .eq('task_id', originalId)
          .eq('off_date', formattedDate)
          .single();
        if (logEntry.data) {
          tasksToDeleteFromLog.push(logEntry.data.id);
        }
      }
      // Recurring tasks are always "Do Today" by default unless skipped/completed,
      // so no action needed here for them to be "on".
    }
  }

  try {
    if (tasksToInsertIntoLog.length > 0) {
      inFlightUpdatesRef.current.add('do_today_off_log_insert');
      const { error } = await supabase.from('do_today_off_log').insert(tasksToInsertIntoLog);
      if (error) throw error;
    }
    if (tasksToDeleteFromLog.length > 0) {
      inFlightUpdatesRef.current.add('do_today_off_log_delete');
      const { error } = await supabase.from('do_today_off_log').delete().in('id', tasksToDeleteFromLog);
      if (error) throw error;
    }
    if (tasksToUpdateStatus.length > 0) {
      inFlightUpdatesRef.current.add('bulk_update_status');
      const { error } = await supabase.from('tasks').upsert(tasksToUpdateStatus.map(t => ({
        id: t.id,
        status: t.status,
        user_id: userId,
        completed_at: t.status === 'skipped' ? new Date().toISOString() : null,
      })), { onConflict: 'id' });
      if (error) throw error;
    }

    showSuccess('All "Do Today" statuses toggled!');
    invalidateTasksQueries();
    context.queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] });
  } catch (err: any) {
    console.error('Error toggling all "Do Today" statuses:', err.message);
    showError('Failed to toggle all "Do Today" statuses.');
  } finally {
    tasksToToggle.map((t: Task) => t.id).forEach((id: string) => inFlightUpdatesRef.current.delete(id));
    inFlightUpdatesRef.current.delete('do_today_off_log_insert');
    inFlightUpdatesRef.current.delete('do_today_off_log_delete');
    inFlightUpdatesRef.current.delete('bulk_update_status');
  }
};