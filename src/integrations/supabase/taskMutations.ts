import { supabase } from './client';
import { showSuccess, showError } from '@/utils/toast';
import { QueryClient } from '@tanstack/react-query';
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
import { format, startOfDay, parseISO, isValid } from 'date-fns';

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

type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'category_color'>>;

export const addTaskMutation = async (newTaskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'category_color'> & { order?: number | null }, context: MutationContext) => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, addReminder } = context;

  const tempId = `temp-${Date.now()}`;
  inFlightUpdatesRef.current.add(tempId);

  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...newTaskData, user_id: userId })
      .select()
      .single();

    if (error) throw error;

    showSuccess('Task added successfully!');
    invalidateTasksQueries();

    if (data.remind_at && data.status === 'to-do') {
      const d = parseISO(data.remind_at);
      if (isValid(d)) addReminder(data.id, `Reminder: ${data.description}`, d);
    }

    return data.id;
  } catch (error: any) {
    showError('Failed to add task.');
    console.error('Error adding task:', error.message);
    return null;
  } finally {
    inFlightUpdatesRef.current.delete(tempId);
  }
};

export const updateTaskMutation = async (taskId: string, updates: TaskUpdate, context: MutationContext) => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, addReminder, dismissReminder } = context;

  inFlightUpdatesRef.current.add(taskId);

  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    showSuccess('Task updated successfully!');
    invalidateTasksQueries();

    if (data.remind_at && data.status === 'to-do') {
      const d = parseISO(data.remind_at);
      if (isValid(d)) addReminder(data.id, `Reminder: ${data.description}`, d);
    } else if (data.status === 'completed' || data.status === 'archived' || data.remind_at === null) {
      dismissReminder(data.id);
    }

    return data.id;
  } catch (error: any) {
    showError('Failed to update task.');
    console.error('Error updating task:', error.message);
    return null;
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
  }
};

export const deleteTaskMutation = async (taskId: string, context: MutationContext) => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;

  inFlightUpdatesRef.current.add(taskId);

  try {
    // First, get the task to check for subtasks and image_url
    const { data: taskToDelete, error: fetchError } = await supabase
      .from('tasks')
      .select('id, image_url')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Delete the task and its subtasks
    const { error } = await supabase
      .from('tasks')
      .delete()
      .or(`id.eq.${taskId},parent_task_id.eq.${taskId}`)
      .eq('user_id', userId);

    if (error) throw error;

    // If there was an image, delete it from storage
    if (taskToDelete?.image_url) {
      const imagePath = taskToDelete.image_url.split('/taskimages/')[1];
      if (imagePath) {
        await supabase.storage.from('taskimages').remove([imagePath]);
      }
    }

    showSuccess('Task deleted successfully!');
    invalidateTasksQueries();
    dismissReminder(taskId);
  } catch (error: any) {
    showError('Failed to delete task.');
    console.error('Error deleting task:', error.message);
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
  }
};

export const bulkUpdateTasksMutation = async (updates: Partial<Task>, ids: string[], context: MutationContext) => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, addReminder, dismissReminder } = context;

  ids.forEach(id => inFlightUpdatesRef.current.add(id));

  try {
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
        const d = parseISO(task.remind_at);
        if (isValid(d)) addReminder(task.id, `Reminder: ${task.description}`, d);
      } else if (task.status === 'completed' || task.status === 'archived' || task.remind_at === null) {
        dismissReminder(task.id);
      }
    });
  } catch (error: any) {
    showError('Failed to bulk update tasks.');
    console.error('Error bulk updating tasks:', error.message);
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
  }
};

export const bulkDeleteTasksMutation = async (ids: string[], context: MutationContext) => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;

  ids.forEach(id => inFlightUpdatesRef.current.add(id));

  try {
    // Fetch tasks to get image_urls before deleting
    const { data: tasksToDelete, error: fetchError } = await supabase
      .from('tasks')
      .select('id, image_url')
      .in('id', ids)
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;

    // Delete associated images
    if (tasksToDelete) {
      const imagePaths = tasksToDelete.map(task => task.image_url).filter(Boolean) as string[];
      if (imagePaths.length > 0) {
        const keysToDelete = imagePaths.map(url => url.split('/taskimages/')[1]).filter(Boolean);
        if (keysToDelete.length > 0) {
          await supabase.storage.from('taskimages').remove(keysToDelete);
        }
      }
    }

    showSuccess('Tasks deleted successfully!');
    invalidateTasksQueries();
    ids.forEach(id => dismissReminder(id));
    return true;
  } catch (error: any) {
    showError('Failed to bulk delete tasks.');
    console.error('Error bulk deleting tasks:', error.message);
    return false;
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
  }
};

export const archiveAllCompletedTasksMutation = async (context: MutationContext) => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries } = context;

  try {
    const { data: completedTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (fetchError) throw fetchError;

    const idsToArchive = completedTasks.map(task => task.id);
    if (idsToArchive.length === 0) {
      showSuccess('No completed tasks to archive.');
      return;
    }

    idsToArchive.forEach(id => inFlightUpdatesRef.current.add(id));

    const { error } = await supabase
      .from('tasks')
      .update({ status: 'archived' })
      .in('id', idsToArchive)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('All completed tasks archived!');
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to archive completed tasks.');
    console.error('Error archiving completed tasks:', error.message);
  } finally {
    context.processedTasks.filter(t => t.status === 'completed').map(t => t.id).forEach(id => inFlightUpdatesRef.current.delete(id));
  }
};

export const markAllTasksInSectionCompletedMutation = async (sectionId: string | null, context: MutationContext) => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries } = context;

  try {
    let query = supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'to-do');

    if (sectionId === null) {
      query = query.is('section_id', null);
    } else {
      query = query.eq('section_id', sectionId);
    }

    const { data: tasksToComplete, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    const idsToComplete = tasksToComplete.map(task => task.id);
    if (idsToComplete.length === 0) {
      showSuccess('No tasks to complete in this section.');
      return;
    }

    idsToComplete.forEach(id => inFlightUpdatesRef.current.add(id));

    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .in('id', idsToComplete)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('All tasks in section marked completed!');
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to mark tasks as completed.');
    console.error('Error marking tasks as completed:', error.message);
  } finally {
    context.processedTasks.filter(t => t.status === 'to-do' && (sectionId === null ? t.section_id === null : t.section_id === sectionId)).map(t => t.id).forEach(id => inFlightUpdatesRef.current.delete(id));
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
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, queryClient } = context;

  inFlightUpdatesRef.current.add(activeId); // Add original activeId to in-flight

  let finalActiveId = activeId;
  let activeTaskInProcessed = context.processedTasks.find(t => t.id === activeId);

  if (!activeTaskInProcessed) {
    showError('Active task not found in processed tasks for reordering.');
    inFlightUpdatesRef.current.delete(activeId);
    return null;
  }

  // Handle virtual tasks: materialize if being moved
  if (activeId.startsWith('virtual-')) {
    const virtualTask = activeTaskInProcessed;
    
    const newRealTaskId = await addTaskMutation({
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
      order: virtualTask.order,
    }, context);

    if (!newRealTaskId) {
      showError('Failed to materialize virtual task for reordering.');
      inFlightUpdatesRef.current.delete(activeId);
      return null;
    }
    finalActiveId = newRealTaskId;
    inFlightUpdatesRef.current.delete(activeId); // Remove virtual ID
    inFlightUpdatesRef.current.add(finalActiveId); // Add real ID
    
    // Await refetch to ensure the query cache is updated with the new real task
    await queryClient.refetchQueries({ queryKey: ['tasks', userId] });
  }

  const updates: Partial<Task> = {
    parent_task_id: newParentId,
    section_id: newSectionId,
  };

  let newOrder: number | null = null;

  // Fetch the most up-to-date list of *real* tasks from the query client's cache
  // This should now include the materialized task if it was virtual.
  const currentRealTasks = queryClient.getQueryData(['tasks', userId]) as Task[] || [];

  // Filter for tasks that will be siblings in the new context
  const potentialSiblings = currentRealTasks.filter(t =>
    t.parent_task_id === newParentId && t.section_id === newSectionId && t.id !== finalActiveId
  ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (overId) {
    const overTask = potentialSiblings.find(s => s.id === overId);
    if (overTask) {
      const overOrder = overTask.order ?? 0;

      if (isDraggingDown) {
        const nextSibling = potentialSiblings
          .filter(s => (s.order ?? 0) > overOrder)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
        
        if (nextSibling) {
          newOrder = (overOrder + (nextSibling.order ?? 0)) / 2;
        } else {
          newOrder = overOrder + 1;
        }
      } else {
        const prevSibling = potentialSiblings
          .filter(s => (s.order ?? 0) < overOrder)
          .sort((a, b) => (b.order ?? 0) - (a.order ?? 0))[0];
        
        if (prevSibling) {
          newOrder = ((prevSibling.order ?? 0) + overOrder) / 2;
        } else {
          newOrder = overOrder - 1;
          if (newOrder < 0) newOrder = 0;
        }
      }
    } else {
      // If overId is provided but overTask is not found in potentialSiblings,
      // it might mean overId is a virtual task that hasn't been materialized yet,
      // or it's a task that doesn't belong to the new parent/section.
      // For now, we'll treat this as if no specific overId was found in the target list.
      if (potentialSiblings.length === 0) {
        newOrder = 0;
      } else {
        const maxOrder = Math.max(...potentialSiblings.map(s => s.order ?? 0));
        newOrder = maxOrder + 1;
      }
    }
  } else {
    if (potentialSiblings.length === 0) {
      newOrder = 0;
    } else {
      const maxOrder = Math.max(...potentialSiblings.map(s => s.order ?? 0));
      newOrder = maxOrder + 1;
    }
  }

  updates.order = newOrder;

  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', finalActiveId)
    .eq('user_id', userId);

  if (error) throw error;

  showSuccess('Task reordered successfully!');
  invalidateTasksQueries();
  return finalActiveId;
} catch (error: any) {
  showError('Failed to reorder task.');
  console.error('Error reordering task:', error.message);
  return null;
} finally {
  inFlightUpdatesRef.current.delete(finalActiveId);
  if (finalActiveId !== activeId) {
    inFlightUpdatesRef.current.delete(activeId);
  }
}
};

export const toggleDoTodayMutation = async (task: Task, currentDate: Date, doTodayOffIds: Set<string>, context: MutationContext) => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const taskId = task.original_task_id || task.id;
  const formattedDate = format(startOfDay(currentDate), 'yyyy-MM-dd');

  inFlightUpdatesRef.current.add(taskId);

  try {
    if (doTodayOffIds.has(taskId)) {
      // Remove from do_today_off_log (mark as "Do Today")
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('user_id', userId)
        .eq('task_id', taskId)
        .eq('off_date', formattedDate);
      if (error) throw error;
      showSuccess('Task marked as "Do Today"!');
    } else {
      // Add to do_today_off_log (mark as "Do Later")
      const { error } = await supabase
        .from('do_today_off_log')
        .insert({ user_id: userId, task_id: taskId, off_date: formattedDate });
      if (error) throw error;
      showSuccess('Task moved to "Do Later"!');
    }
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to update "Do Today" status.');
    console.error('Error toggling Do Today:', error.message);
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
  }
};

export const toggleAllDoTodayMutation = async (filteredTasks: Task[], currentDate: Date, doTodayOffIds: Set<string>, context: MutationContext) => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const formattedDate = format(startOfDay(currentDate), 'yyyy-MM-dd');

  try {
    const tasksToToggle = filteredTasks.filter(t => t.parent_task_id === null && t.status === 'to-do');
    if (tasksToToggle.length === 0) {
      showSuccess('No pending tasks to toggle.');
      return;
    }

    const allAreDoToday = tasksToToggle.every(t => !doTodayOffIds.has(t.original_task_id || t.id));

    if (allAreDoToday) {
      // Mark all as "Do Later"
      const recordsToInsert = tasksToToggle
        .filter(t => t.recurring_type === 'none' && !doTodayOffIds.has(t.original_task_id || t.id))
        .map(t => ({
          user_id: userId,
          task_id: t.original_task_id || t.id,
          off_date: formattedDate,
        }));
      
      if (recordsToInsert.length > 0) {
        const { error } = await supabase.from('do_today_off_log').insert(recordsToInsert);
        if (error) throw error;
      }
      showSuccess('All tasks moved to "Do Later"!');
    } else {
      // Mark all as "Do Today"
      const idsToRemove = tasksToToggle
        .filter(t => doTodayOffIds.has(t.original_task_id || t.id))
        .map(t => t.original_task_id || t.id);

      if (idsToRemove.length > 0) {
        const { error } = await supabase
          .from('do_today_off_log')
          .delete()
          .in('task_id', idsToRemove)
          .eq('user_id', userId)
          .eq('off_date', formattedDate);
        if (error) throw error;
      }
      showSuccess('All tasks marked as "Do Today"!');
    }
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to toggle "Do Today" status for all tasks.');
    console.error('Error toggling all Do Today:', error.message);
  } finally {
    tasksToToggle.map(t => t.id).forEach(id => inFlightUpdatesRef.current.delete(id));
  }
};