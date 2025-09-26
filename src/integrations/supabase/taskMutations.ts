import { supabase } from './client';
import { showSuccess, showError } from '@/utils/toast';
import { Task, NewTaskData, TaskUpdate, TaskSection, MutationContext } from '@/hooks/useTasks';
import { format, startOfDay } from 'date-fns';

// Helper to add/remove from in-flight updates set
const withInFlightTracking = async <T>(
  id: string,
  context: MutationContext,
  mutationFn: () => Promise<T>
): Promise<T> => {
  context.inFlightUpdatesRef.current.add(id);
  try {
    return await mutationFn();
  } finally {
    context.inFlightUpdatesRef.current.delete(id);
  }
};

export const addTaskMutation = async (
  newTaskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'category_color' | 'isDoTodayOff'> & { order: number | null },
  context: MutationContext
): Promise<string | null> => {
  const { userId, invalidateTasksQueries, scheduleReminder } = context;
  try {
    const { data, error } = await withInFlightTracking(
      `temp-${Date.now()}`, // Use a temporary ID for tracking
      context,
      async () => {
        const { data, error } = await supabase
          .from('tasks')
          .insert({ ...newTaskData, user_id: userId })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    );

    if (error) throw error;

    showSuccess('Task added successfully!');
    invalidateTasksQueries();

    if (data.remind_at && data.status === 'to-do') {
      scheduleReminder(data.id, `Reminder: ${data.description}`, new Date(data.remind_at));
    }
    return data.id;
  } catch (error: any) {
    showError('Failed to add task.');
    console.error('addTaskMutation error:', error.message);
    return null;
  }
};

export const updateTaskMutation = async (
  taskId: string,
  updates: TaskUpdate,
  context: MutationContext
): Promise<string | null> => {
  const { userId, invalidateTasksQueries, scheduleReminder, cancelReminder } = context;
  try {
    const { data, error } = await withInFlightTracking(
      taskId,
      context,
      async () => {
        const { data, error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', taskId)
          .eq('user_id', userId)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    );

    if (error) throw error;

    showSuccess('Task updated successfully!');
    invalidateTasksQueries();

    if (data.remind_at && data.status === 'to-do') {
      scheduleReminder(data.id, `Reminder: ${data.description}`, new Date(data.remind_at));
    } else if (data.status === 'completed' || data.status === 'archived' || data.remind_at === null) {
      cancelReminder(data.id);
    }
    return data.id;
  } catch (error: any) {
    showError('Failed to update task.');
    console.error('updateTaskMutation error:', error.message);
    return null;
  }
};

export const deleteTaskMutation = async (
  taskId: string,
  context: MutationContext
): Promise<boolean> => {
  const { userId, invalidateTasksQueries, cancelReminder } = context;
  try {
    await withInFlightTracking(
      taskId,
      context,
      async () => {
        // Delete sub-tasks first
        await supabase
          .from('tasks')
          .delete()
          .eq('parent_task_id', taskId)
          .eq('user_id', userId);

        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId)
          .eq('user_id', userId);
        if (error) throw error;
      }
    );

    showSuccess('Task deleted successfully!');
    invalidateTasksQueries();
    cancelReminder(taskId);
    return true;
  } catch (error: any) {
    showError('Failed to delete task.');
    console.error('deleteTaskMutation error:', error.message);
    return false;
  }
};

export const bulkUpdateTasksMutation = async (
  updates: Partial<Task>,
  ids: string[],
  context: MutationContext
): Promise<void> => {
  const { userId, invalidateTasksQueries, scheduleReminder, cancelReminder } = context;
  try {
    // Optimistic update: Add all IDs to in-flight tracking
    ids.forEach(id => context.inFlightUpdatesRef.current.add(id));

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .in('id', ids)
      .eq('user_id', userId)
      .select();

    if (error) throw error;

    showSuccess('Tasks updated successfully!');
    invalidateTasksQueries();

    data.forEach(task => {
      if (task.remind_at && task.status === 'to-do') {
        scheduleReminder(task.id, `Reminder: ${task.description}`, new Date(task.remind_at));
      } else if (task.status === 'completed' || task.status === 'archived' || task.remind_at === null) {
        cancelReminder(task.id);
      }
    });
  } catch (error: any) {
    showError('Failed to update tasks.');
    console.error('bulkUpdateTasksMutation error:', error.message);
  } finally {
    // Remove all IDs from in-flight tracking
    ids.forEach(id => context.inFlightUpdatesRef.current.delete(id));
  }
};

export const bulkDeleteTasksMutation = async (
  ids: string[],
  context: MutationContext
): Promise<boolean> => {
  const { userId, invalidateTasksQueries, cancelReminder } = context;
  try {
    // Optimistic update: Add all IDs to in-flight tracking
    ids.forEach(id => context.inFlightUpdatesRef.current.add(id));

    // First, delete all sub-tasks associated with the tasks being deleted
    await supabase
      .from('tasks')
      .delete()
      .in('parent_task_id', ids)
      .eq('user_id', userId);

    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('Tasks deleted successfully!');
    invalidateTasksQueries();
    ids.forEach(id => cancelReminder(id));
    return true;
  } catch (error: any) {
    showError('Failed to delete tasks.');
    console.error('bulkDeleteTasksMutation error:', error.message);
    return false;
  } finally {
    // Remove all IDs from in-flight tracking
    ids.forEach(id => context.inFlightUpdatesRef.current.delete(id));
  }
};

export const archiveAllCompletedTasksMutation = async (
  context: MutationContext
): Promise<void> => {
  const { userId, invalidateTasksQueries } = context;
  try {
    const { data: completedTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (fetchError) throw fetchError;

    const completedTaskIds = completedTasks.map(task => task.id);
    if (completedTaskIds.length === 0) {
      showSuccess('No completed tasks to archive.');
      return;
    }

    await bulkUpdateTasksMutation({ status: 'archived' }, completedTaskIds, context);
    showSuccess('All completed tasks archived!');
  } catch (error: any) {
    showError('Failed to archive completed tasks.');
    console.error('archiveAllCompletedTasksMutation error:', error.message);
  }
};

export const markAllTasksInSectionCompletedMutation = async (
  sectionId: string | null,
  context: MutationContext
): Promise<void> => {
  const { userId, invalidateTasksQueries } = context;
  try {
    let query = supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'to-do')
      .is('parent_task_id', null); // Only mark top-level tasks

    if (sectionId === null) {
      query = query.is('section_id', null);
    } else {
      query = query.eq('section_id', sectionId);
    }

    const { data: tasksToComplete, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    const taskIdsToComplete = tasksToComplete.map(task => task.id);
    if (taskIdsToComplete.length === 0) {
      showSuccess('No pending tasks in this section to complete.');
      return;
    }

    await bulkUpdateTasksMutation({ status: 'completed' }, taskIdsToComplete, context);
    showSuccess('All tasks in section marked completed!');
  } catch (error: any) {
    showError('Failed to mark all tasks in section completed.');
    console.error('markAllTasksInSectionCompletedMutation error:', error.message);
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
  const { userId, invalidateTasksQueries, processedTasks } = context;
  try {
    const activeTask = processedTasks.find(t => t.id === activeId);
    if (!activeTask) throw new Error('Active task not found.');

    const tasksInTargetScope = processedTasks.filter(t =>
      t.parent_task_id === newParentId && t.section_id === newSectionId && t.id !== activeId
    ).sort((a, b) => (a.order || 0) - (b.order || 0));

    let newOrder = 0;
    if (overId) {
      const overTaskIndex = tasksInTargetScope.findIndex(t => t.id === overId);
      if (overTaskIndex !== -1) {
        newOrder = isDraggingDown ? overTaskIndex + 1 : overTaskIndex;
      } else {
        newOrder = tasksInTargetScope.length; // If dropped over nothing in scope, put at end
      }
    } else {
      newOrder = tasksInTargetScope.length; // If no overId, put at end
    }

    const updatedTasks = [
      ...tasksInTargetScope.slice(0, newOrder),
      { ...activeTask, parent_task_id: newParentId, section_id: newSectionId, order: newOrder },
      ...tasksInTargetScope.slice(newOrder),
    ];

    const reorderedUpdates = updatedTasks.map((task, index) => ({
      id: task.id,
      order: index,
      parent_task_id: task.parent_task_id,
      section_id: task.section_id,
      user_id: userId,
    }));

    // Optimistic update: Add all IDs to in-flight tracking
    reorderedUpdates.forEach(update => context.inFlightUpdatesRef.current.add(update.id));

    const { error } = await supabase
      .from('tasks')
      .upsert(reorderedUpdates, { onConflict: 'id' });

    if (error) throw error;

    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to reorder task.');
    console.error('updateTaskParentAndOrderMutation error:', error.message);
  } finally {
    // Remove all IDs from in-flight tracking
    const activeTask = processedTasks.find(t => t.id === activeId);
    if (activeTask) {
      const tasksInTargetScope = processedTasks.filter(t =>
        t.parent_task_id === newParentId && t.section_id === newSectionId && t.id !== activeId
      ).sort((a, b) => (a.order || 0) - (b.order || 0));
      const updatedTaskIds = [activeId, ...tasksInTargetScope.map(t => t.id)];
      updatedTaskIds.forEach(id => context.inFlightUpdatesRef.current.delete(id));
    }
  }
};

export const toggleDoTodayMutation = async (
  task: Task,
  currentDate: Date,
  doTodayOffIds: Set<string>,
  context: MutationContext
): Promise<void> => {
  const { userId, invalidateTasksQueries } = context;
  const todayFormatted = format(startOfDay(currentDate), 'yyyy-MM-dd');
  const originalId = task.original_task_id || task.id;
  const isCurrentlyOff = doTodayOffIds.has(originalId);

  try {
    if (isCurrentlyOff) {
      // Remove from do_today_off_log
      await withInFlightTracking(
        originalId,
        context,
        async () => {
          const { error } = await supabase
            .from('do_today_off_log')
            .delete()
            .eq('user_id', userId)
            .eq('task_id', originalId)
            .eq('off_date', todayFormatted);
          if (error) throw error;
        }
      );
      showSuccess(`'${task.description}' added back to 'Do Today'.`);
    } else {
      // Add to do_today_off_log
      await withInFlightTracking(
        originalId,
        context,
        async () => {
          const { error } = await supabase
            .from('do_today_off_log')
            .insert({ user_id: userId, task_id: originalId, off_date: todayFormatted });
          if (error) throw error;
        }
      );
      showSuccess(`'${task.description}' moved out of 'Do Today'.`);
    }
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to update "Do Today" status.');
    console.error('toggleDoTodayMutation error:', error.message);
  }
};

export const toggleAllDoTodayMutation = async (
  tasks: Task[],
  currentDate: Date,
  doTodayOffIds: Set<string>,
  context: MutationContext
): Promise<void> => {
  const { userId, invalidateTasksQueries } = context;
  const todayFormatted = format(startOfDay(currentDate), 'yyyy-MM-dd');

  try {
    const tasksToToggle = tasks.filter(t => t.parent_task_id === null && t.recurring_type === 'none');
    if (tasksToToggle.length === 0) {
      showSuccess('No non-recurring tasks to toggle "Do Today" status.');
      return;
    }

    const allAreOn = tasksToToggle.every(t => !doTodayOffIds.has(t.id));

    if (allAreOn) {
      // Turn all off
      const recordsToInsert = tasksToToggle.map(t => ({
        user_id: userId,
        task_id: t.id,
        off_date: todayFormatted,
      }));
      await withInFlightTracking(
        'bulk-do-today-off',
        context,
        async () => {
          const { error } = await supabase
            .from('do_today_off_log')
            .upsert(recordsToInsert, { onConflict: 'user_id, task_id, off_date' });
          if (error) throw error;
        }
      );
      showSuccess('All non-recurring tasks moved out of "Do Today".');
    } else {
      // Turn all on (delete existing off logs)
      const taskIdsToTurnOn = tasksToToggle.filter(t => doTodayOffIds.has(t.id)).map(t => t.id);
      if (taskIdsToTurnOn.length > 0) {
        await withInFlightTracking(
          'bulk-do-today-on',
          context,
          async () => {
            const { error } = await supabase
              .from('do_today_off_log')
              .delete()
              .in('task_id', taskIdsToTurnOn)
              .eq('user_id', userId)
              .eq('off_date', todayFormatted);
            if (error) throw error;
          }
        );
        showSuccess('All non-recurring tasks added back to "Do Today".');
      } else {
        showSuccess('All non-recurring tasks are already in "Do Today".');
      }
    }
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to toggle all "Do Today" tasks.');
    console.error('toggleAllDoTodayMutation error:', error.message);
  }
};