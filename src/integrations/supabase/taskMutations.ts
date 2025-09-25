import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { QueryClient } from '@tanstack/react-query';
import { Task, TaskSection, Category, NewTaskData, TaskUpdate } from '@/hooks/useTasks';
import { format, parseISO, isValid } from 'date-fns';

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

export const addTaskMutation = async (newTaskData: NewTaskData, context: MutationContext): Promise<Task | null> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, categoriesMap, addReminder } = context;

  const tempId = `temp-${Date.now()}`;
  inFlightUpdatesRef.current.add(tempId);

  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) => {
    const newTempTask: Omit<Task, 'category_color'> = {
      id: tempId,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: newTaskData.status === 'completed' ? new Date().toISOString() : null, // Set completed_at if status is completed
      status: newTaskData.status || 'to-do',
      recurring_type: newTaskData.recurring_type || 'none',
      priority: newTaskData.priority || 'medium',
      description: newTaskData.description,
      category: newTaskData.category || null,
      due_date: newTaskData.due_date || null,
      notes: newTaskData.notes || null,
      remind_at: newTaskData.remind_at || null,
      section_id: newTaskData.section_id || null,
      order: newTaskData.order || 0,
      original_task_id: newTaskData.original_task_id || null,
      parent_task_id: newTaskData.parent_task_id || null,
      link: newTaskData.link || null,
      image_url: newTaskData.image_url || null,
    };
    return oldData ? [...oldData, newTempTask] : [newTempTask];
  });

  try {
    const payload = {
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: newTaskData.status === 'completed' ? new Date().toISOString() : null, // Ensure completed_at is set here too
      ...newTaskData,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    showSuccess('Task added successfully!');
    if (data.remind_at && data.status === 'to-do') {
      const d = parseISO(data.remind_at);
      if (isValid(d)) addReminder(data.id, `Reminder: ${data.description}`, d);
    }
    return { ...data, category_color: categoriesMap.get(data.category || '') || 'gray' };
  } catch (error: any) {
    showError('Failed to add task.');
    console.error('Error adding task:', error.message);
    // Revert optimistic update on error
    queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) =>
      oldData ? oldData.filter(task => task.id !== tempId) : []
    );
    return null;
  } finally {
    inFlightUpdatesRef.current.delete(tempId);
    invalidateTasksQueries();
  }
};

export const updateTaskMutation = async (taskId: string, updates: TaskUpdate, context: MutationContext): Promise<string | null> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, processedTasks } = context;

  let finalTaskId = taskId;
  let taskToUpdateInDB: Partial<Task> = { ...updates };

  // If it's a virtual task, first create a real one
  if (taskId.startsWith('virtual-')) {
    const virtualTask = processedTasks.find(t => t.id === taskId);
    if (!virtualTask) {
      showError('Virtual task not found for update.');
      return null;
    }

    // Merge virtual task data with the updates to create the new real task
    const newRealTaskData: NewTaskData = {
      description: virtualTask.description,
      status: virtualTask.status,
      recurring_type: virtualTask.recurring_type,
      category: virtualTask.category,
      priority: virtualTask.priority,
      due_date: virtualTask.due_date,
      notes: virtualTask.notes,
      remind_at: virtualTask.remind_at,
      section_id: virtualTask.section_id,
      parent_task_id: virtualTask.parent_task_id,
      original_task_id: virtualTask.original_task_id,
      link: virtualTask.link,
      image_url: virtualTask.image_url,
      // Apply the updates directly to the new task being created
      ...updates,
    };

    const newRealTask = await addTaskMutation(newRealTaskData, context);
    if (!newRealTask) {
      showError('Failed to create real task from virtual task.');
      return null;
    }
    finalTaskId = newRealTask.id;
    // No further update needed for this new task, as updates were applied during creation
    // We just need to ensure the query cache is invalidated for the old virtual ID and new real ID.
    invalidateTasksQueries(); // Invalidate to reflect the new real task and remove the virtual one
    return finalTaskId;
  }

  // For real tasks, proceed with normal update
  inFlightUpdatesRef.current.add(finalTaskId);
  queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) => {
    if (!oldData) return oldData;
    return oldData.map(task =>
      task.id === finalTaskId ? { ...task, ...taskToUpdateInDB } : task
    );
  });

  try {
    // Handle specific status updates for `completed_at`
    if (updates.status === 'completed') {
      taskToUpdateInDB.completed_at = new Date().toISOString();
    } else if (updates.status === 'to-do' && updates.completed_at === undefined) {
      // If status is changed back to 'to-do' and completed_at is not explicitly set, clear it
      taskToUpdateInDB.completed_at = null;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(taskToUpdateInDB)
      .eq('id', finalTaskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    showSuccess('Task updated successfully!');
    return data.id;
  } catch (error: any) {
    showError('Failed to update task.');
    console.error('Error updating task:', error.message);
    // Revert optimistic update on error
    queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map(task =>
        task.id === finalTaskId ? processedTasks.find(t => t.id === finalTaskId) || task : task
      );
    });
    return null;
  } finally {
    inFlightUpdatesRef.current.delete(finalTaskId);
    invalidateTasksQueries(); // Ensure full re-fetch after update
  }
};

export const deleteTaskMutation = async (taskId: string, context: MutationContext): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;

  inFlightUpdatesRef.current.add(taskId);
  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) =>
    oldData ? oldData.filter(task => task.id !== taskId) : []
  );

  try {
    // Delete the task and any sub-tasks associated with it
    const { error } = await supabase
      .from('tasks')
      .delete()
      .or(`id.eq.${taskId},parent_task_id.eq.${taskId}`)
      .eq('user_id', userId);

    if (error) throw error;
    showSuccess('Task deleted successfully!');
    dismissReminder(taskId);
  } catch (error: any) {
    showError('Failed to delete task.');
    console.error('Error deleting task:', error.message);
    // Revert optimistic update on error (requires re-fetching or storing old state)
    invalidateTasksQueries(); // Simpler to just re-fetch on error
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
    invalidateTasksQueries();
  }
};

export const bulkUpdateTasksMutation = async (updates: Partial<Task>, ids: string[], context: MutationContext): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;

  ids.forEach(id => inFlightUpdatesRef.current.add(id));

  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) => {
    if (!oldData) return oldData;
    return oldData.map(task =>
      ids.includes(task.id) ? { ...task, ...updates } : task
    );
  });

  try {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;
    showSuccess('Tasks updated successfully!');
  } catch (error: any) {
    showError('Failed to bulk update tasks.');
    console.error('Error bulk updating tasks:', error.message);
    invalidateTasksQueries(); // Revert optimistic update on error
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const bulkDeleteTasksMutation = async (ids: string[], context: MutationContext): Promise<boolean> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;

  ids.forEach(id => inFlightUpdatesRef.current.add(id));

  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) =>
    oldData ? oldData.filter(task => !ids.includes(task.id)) : []
  );

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;
    showSuccess('Tasks deleted successfully!');
    ids.forEach(id => dismissReminder(id));
    return true;
  } catch (error: any) {
    showError('Failed to bulk delete tasks.');
    console.error('Error bulk deleting tasks:', error.message);
    invalidateTasksQueries(); // Revert optimistic update on error
    return false;
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const archiveAllCompletedTasksMutation = async (context: MutationContext): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;

  const completedTasks = context.processedTasks.filter(task => task.status === 'completed' && task.parent_task_id === null);
  const idsToArchive = completedTasks.map(task => task.id);

  if (idsToArchive.length === 0) {
    showSuccess('No completed tasks to archive.');
    return;
  }

  idsToArchive.forEach(id => inFlightUpdatesRef.current.add(id));

  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) => {
    if (!oldData) return oldData;
    return oldData.map(task =>
      idsToArchive.includes(task.id) ? { ...task, status: 'archived' } : task
    );
  });

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'archived' })
      .in('id', idsToArchive)
      .eq('user_id', userId);

    if (error) throw error;
    showSuccess('All completed tasks archived!');
  } catch (error: any) {
    showError('Failed to archive completed tasks.');
    console.error('Error archiving completed tasks:', error.message);
    invalidateTasksQueries(); // Revert optimistic update on error
  } finally {
    idsToArchive.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const markAllTasksInSectionCompletedMutation = async (sectionId: string | null, context: MutationContext): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;

  const tasksInSection = context.processedTasks.filter(task =>
    (sectionId === null ? task.section_id === null : task.section_id === sectionId) &&
    task.status === 'to-do' &&
    task.parent_task_id === null // Only mark top-level tasks
  );
  const idsToComplete = tasksInSection.map(task => task.id);

  if (idsToComplete.length === 0) {
    showSuccess('No pending tasks in this section to mark as completed.');
    return;
  }

  idsToComplete.forEach(id => inFlightUpdatesRef.current.add(id));

  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) => {
    if (!oldData) return oldData;
    return oldData.map(task =>
      idsToComplete.includes(task.id) ? { ...task, status: 'completed', completed_at: new Date().toISOString() } : task
    );
  });

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .in('id', idsToComplete)
      .eq('user_id', userId);

    if (error) throw error;
    showSuccess('All tasks in section marked as completed!');
  } catch (error: any) {
    showError('Failed to mark tasks in section as completed.');
    console.error('Error marking tasks in section as completed:', error.message);
    invalidateTasksQueries(); // Revert optimistic update on error
  } finally {
    idsToComplete.forEach(id => inFlightUpdatesRef.current.delete(id));
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

  inFlightUpdatesRef.current.add(activeId);

  try {
    const activeTask = processedTasks.find(t => t.id === activeId);
    if (!activeTask) throw new Error('Active task not found.');

    let newOrder: number;
    const siblings = processedTasks.filter(t =>
      t.parent_task_id === newParentId &&
      t.section_id === newSectionId &&
      t.id !== activeId
    ).sort((a, b) => (a.order || 0) - (b.order || 0));

    if (overId) {
      const overTaskIndex = siblings.findIndex(s => s.id === overId);
      if (overTaskIndex !== -1) {
        if (isDraggingDown) {
          newOrder = (siblings[overTaskIndex].order || 0) + 1;
        } else {
          newOrder = (siblings[overTaskIndex].order || 0) - 1;
        }
      } else {
        // If overId is not a sibling, place at end or beginning
        newOrder = isDraggingDown ? (siblings[siblings.length - 1]?.order || 0) + 1 : (siblings[0]?.order || 0) - 1;
      }
    } else {
      // No overId, place at the end of the list
      newOrder = (siblings[siblings.length - 1]?.order || 0) + 1;
    }

    const updates: Partial<Task> = {
      parent_task_id: newParentId,
      section_id: newSectionId,
      order: newOrder,
    };

    // Optimistic update
    queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map(task =>
        task.id === activeId ? { ...task, ...updates } : task
      );
    });

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', activeId)
      .eq('user_id', userId);

    if (error) throw error;
    showSuccess('Task moved successfully!');
  } catch (error: any) {
    showError('Failed to move task.');
    console.error('Error moving task:', error.message);
    invalidateTasksQueries(); // Revert optimistic update on error
  } finally {
    inFlightUpdatesRef.current.delete(activeId);
    invalidateTasksQueries();
  }
};

export const toggleDoTodayMutation = async (task: Task, currentDate: Date, doTodayOffIds: Set<string>, context: MutationContext): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const originalTaskId = task.original_task_id || task.id;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');

  inFlightUpdatesRef.current.add(originalTaskId);

  const isCurrentlyOff = doTodayOffIds.has(originalTaskId);

  // Optimistic update
  queryClient.setQueryData(['do_today_off_log', userId, formattedDate], (oldData: Set<string> | undefined) => {
    const newData = new Set(oldData || []);
    if (isCurrentlyOff) {
      newData.delete(originalTaskId);
    } else {
      newData.add(originalTaskId);
    }
    return newData;
  });

  try {
    if (isCurrentlyOff) {
      // Remove from do_today_off_log
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('user_id', userId)
        .eq('task_id', originalTaskId)
        .eq('off_date', formattedDate);
      if (error) throw error;
      showSuccess('Task added to "Do Today"!');
    } else {
      // Add to do_today_off_log
      const { error } = await supabase
        .from('do_today_off_log')
        .insert({ user_id: userId, task_id: originalTaskId, off_date: formattedDate });
      if (error) throw error;
      showSuccess('Task removed from "Do Today".');
    }
  } catch (error: any) {
    showError('Failed to update "Do Today" status.');
    console.error('Error toggling Do Today:', error.message);
    invalidateTasksQueries(); // Revert optimistic update on error
  } finally {
    inFlightUpdatesRef.current.delete(originalTaskId);
    invalidateTasksQueries();
  }
};

export const toggleAllDoTodayMutation = async (filteredTasks: Task[], currentDate: Date, doTodayOffIds: Set<string>, context: MutationContext): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');

  const topLevelTasks = filteredTasks.filter(t => t.parent_task_id === null && t.status === 'to-do');
  const allAreOn = topLevelTasks.every(task => !doTodayOffIds.has(task.original_task_id || task.id));

  const tasksToToggle = topLevelTasks.map(task => task.original_task_id || task.id);

  if (tasksToToggle.length === 0) {
    showSuccess('No pending tasks to toggle "Do Today" status.');
    return;
  }

  tasksToToggle.forEach(id => inFlightUpdatesRef.current.add(id));

  // Optimistic update
  queryClient.setQueryData(['do_today_off_log', userId, formattedDate], (oldData: Set<string> | undefined) => {
    const newData = new Set(oldData || []);
    if (allAreOn) {
      tasksToToggle.forEach(id => newData.add(id));
    } else {
      tasksToToggle.forEach(id => newData.delete(id));
    }
    return newData;
  });

  try {
    if (allAreOn) {
      // Turn all off
      const recordsToInsert = tasksToToggle.map(taskId => ({
        user_id: userId,
        task_id: taskId,
        off_date: formattedDate,
      }));
      const { error } = await supabase
        .from('do_today_off_log')
        .insert(recordsToInsert);
      if (error) throw error;
      showSuccess('All tasks removed from "Do Today".');
    } else {
      // Turn all on
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .in('task_id', tasksToToggle)
        .eq('user_id', userId)
        .eq('off_date', formattedDate);
      if (error) throw error;
      showSuccess('All tasks added to "Do Today"!');
    }
  } catch (error: any) {
    showError('Failed to toggle "Do Today" status for all tasks.');
    console.error('Error toggling all Do Today:', error.message);
    invalidateTasksQueries(); // Revert optimistic update on error
  } finally {
    tasksToToggle.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};