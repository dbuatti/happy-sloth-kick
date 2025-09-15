import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { parseISO, isValid, format, isSameDay } from 'date-fns';
import { QueryClient } from '@tanstack/react-query';
import { Task, TaskSection, Category } from '@/hooks/useTasks'; // Import Task type
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating new IDs

// Define a more comprehensive MutationContext interface
interface MutationContext {
  userId: string;
  queryClient: QueryClient;
  inFlightUpdatesRef: React.MutableRefObject<Set<string>>;
  categoriesMap: Map<string, string>;
  invalidateTasksQueries: () => void;
  invalidateSectionsQueries: () => void;
  invalidateCategoriesQueries: () => void;
  processedTasks: Task[]; // Ensure this is the fully processed tasks list
  sections: TaskSection[];
  addReminder: (id: string, message: string, date: Date) => void;
  dismissReminder: (id: string) => void;
}

type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>;
type NewTaskData = Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'category_color'> & { order?: number | null };

export const addTaskMutation = async (
  newTaskData: NewTaskData,
  context: MutationContext
): Promise<string | null> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, addReminder } = context;

  const tempId = uuidv4(); // Generate a temporary ID for optimistic update
  inFlightUpdatesRef.current.add(tempId);

  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) => {
    const categoryColor = context.categoriesMap.get(newTaskData.category || '') || 'gray';
    const optimisticTask: Task = {
      id: tempId,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
      status: 'to-do',
      recurring_type: 'none',
      priority: 'medium',
      description: '',
      category: null,
      category_color: categoryColor,
      due_date: null,
      notes: null,
      remind_at: null,
      section_id: null,
      order: null,
      original_task_id: null,
      parent_task_id: null,
      link: null,
      image_url: null,
      ...newTaskData,
    };
    return oldData ? [...oldData, optimisticTask] : [optimisticTask];
  });

  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...newTaskData, user_id: userId })
      .select()
      .single();

    if (error) throw error;

    // Handle reminders
    if (data.remind_at && data.status === 'to-do') {
      const d = parseISO(data.remind_at);
      if (isValid(d)) addReminder(data.id, `Reminder: ${data.description}`, d);
    }

    return data.id;
  } catch (error: any) {
    console.error('Error adding task:', error.message);
    showError('Failed to add task.');
    // Revert optimistic update on error
    queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) =>
      oldData?.filter(task => task.id !== tempId)
    );
    return null;
  } finally {
    inFlightUpdatesRef.current.delete(tempId);
    invalidateTasksQueries(); // Ensure queries are invalidated after the operation
  }
};

export const updateTaskMutation = async (
  taskId: string,
  updates: TaskUpdate,
  context: MutationContext
): Promise<string | null> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, addReminder, dismissReminder, processedTasks } = context;

  inFlightUpdatesRef.current.add(taskId);
  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) => {
    if (!oldData) return oldData;
    return oldData.map(task => task.id === taskId ? { ...task, ...updates } : task);
  });

  try {
    let actualTaskId = taskId;
    let taskToUpdate = processedTasks.find(t => t.id === taskId);

    if (taskId.startsWith('virtual-')) {
      // This is a virtual task, we need to create a real instance first
      const originalTaskId = taskToUpdate?.original_task_id || taskId.split('-')[1]; // Extract original ID
      const virtualTaskDatePart = taskId.split('-').slice(-3).join('-'); // Extract date part from virtual ID (e.g., 2025-09-16)
      const virtualTaskCreatedAt = parseISO(virtualTaskDatePart);

      // Check if a real instance already exists for this original task on this specific day
      const existingRealInstanceForToday = processedTasks.find(t =>
        (t.original_task_id === originalTaskId || t.id === originalTaskId) &&
        isSameDay(parseISO(t.created_at), virtualTaskCreatedAt) &&
        t.status !== 'archived'
      );

      if (existingRealInstanceForToday) {
        actualTaskId = existingRealInstanceForToday.id;
        taskToUpdate = existingRealInstanceForToday; // Use the existing real task for further updates
      } else {
        // If no real instance exists, create a new one based on the original recurring task
        const originalRecurringTask = processedTasks.find(t => t.id === originalTaskId);
        if (!originalRecurringTask) {
          throw new Error('Original recurring task not found for virtual task.');
        }

        const newRealTaskData: NewTaskData = {
          description: originalRecurringTask.description,
          status: 'to-do', // Default to to-do when creating a new instance
          recurring_type: originalRecurringTask.recurring_type,
          category: originalRecurringTask.category,
          priority: originalRecurringTask.priority,
          // Set due_date to the virtual task's date if the original had one, otherwise null
          due_date: originalRecurringTask.due_date ? format(virtualTaskCreatedAt, 'yyyy-MM-dd') : null,
          notes: originalRecurringTask.notes,
          // Adjust remind_at date to the virtual task's date, keeping the time
          remind_at: originalRecurringTask.remind_at ? format(virtualTaskCreatedAt, 'yyyy-MM-dd') + originalRecurringTask.remind_at.substring(10) : null,
          section_id: originalRecurringTask.section_id,
          parent_task_id: originalRecurringTask.parent_task_id,
          original_task_id: originalTaskId,
          created_at: virtualTaskCreatedAt.toISOString(), // Set created_at to the virtual task's date
          link: originalRecurringTask.link,
          image_url: originalRecurringTask.image_url,
          order: originalRecurringTask.order,
        };

        const { data: newRealTask, error: insertError } = await supabase
          .from('tasks')
          .insert({ ...newRealTaskData, user_id: userId })
          .select()
          .single();

        if (insertError) throw insertError;
        actualTaskId = newRealTask.id;
        taskToUpdate = newRealTask;
        // Invalidate to ensure the new real task is picked up by subsequent queries
        invalidateTasksQueries();
      }
    }

    // Now perform the update on the actualTaskId
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', actualTaskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Handle reminders
    if (data.remind_at && data.status === 'to-do') {
      const d = parseISO(data.remind_at);
      if (isValid(d)) addReminder(data.id, `Reminder: ${data.description}`, d);
    } else if (data.status === 'completed' || data.status === 'archived' || data.remind_at === null) {
      dismissReminder(data.id);
    }

    return data.id;
  } catch (error: any) {
    console.error('Error updating task:', error.message);
    showError('Failed to update task.');
    // Revert optimistic update on error
    queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) => {
      if (!oldData) return oldData;
      const originalTask = processedTasks.find(t => t.id === taskId);
      return oldData.map(task => task.id === taskId ? originalTask || task : task);
    });
    return null;
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
    invalidateTasksQueries(); // Ensure queries are invalidated after the operation
  }
};

export const deleteTaskMutation = async (
  taskId: string,
  context: MutationContext
): Promise<boolean> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;

  inFlightUpdatesRef.current.add(taskId);
  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) =>
    oldData?.filter(task => task.id !== taskId)
  );

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) throw error;

    dismissReminder(taskId);
    return true;
  } catch (error: any) {
    console.error('Error deleting task:', error.message);
    showError('Failed to delete task.');
    // Revert optimistic update on error (re-fetch to be safe)
    invalidateTasksQueries();
    return false;
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

  ids.forEach(id => inFlightUpdatesRef.current.add(id));
  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) => {
    if (!oldData) return oldData;
    return oldData.map(task => ids.includes(task.id) ? { ...task, ...updates } : task);
  });

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;

    // Handle reminders for bulk updates
    ids.forEach(id => {
      const updatedTask = context.processedTasks.find(t => t.id === id); // Find the task with its new updates
      if (updatedTask?.remind_at && updatedTask.status === 'to-do') {
        const d = parseISO(updatedTask.remind_at);
        if (isValid(d)) addReminder(updatedTask.id, `Reminder: ${updatedTask.description}`, d);
      } else if (updatedTask?.status === 'completed' || updatedTask?.status === 'archived' || updatedTask?.remind_at === null) {
        dismissReminder(updatedTask.id);
      }
    });

    showSuccess('Tasks updated successfully!');
  } catch (error: any) {
    console.error('Error bulk updating tasks:', error.message);
    showError('Failed to update tasks.');
    // Revert optimistic update on error (re-fetch to be safe)
    invalidateTasksQueries();
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

  ids.forEach(id => inFlightUpdatesRef.current.add(id));
  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) =>
    oldData?.filter(task => !ids.includes(task.id))
  );

  try {
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
    console.error('Error bulk deleting tasks:', error.message);
    showError('Failed to delete tasks.');
    // Revert optimistic update on error (re-fetch to be safe)
    invalidateTasksQueries();
    return false;
  } finally {
    ids.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const archiveAllCompletedTasksMutation = async (
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, processedTasks } = context;

  const completedTaskIds = processedTasks
    .filter(task => task.status === 'completed' && task.parent_task_id === null)
    .map(task => task.id);

  if (completedTaskIds.length === 0) {
    showError('No completed tasks to archive.');
    return;
  }

  completedTaskIds.forEach(id => inFlightUpdatesRef.current.add(id));
  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) => {
    if (!oldData) return oldData;
    return oldData.map(task =>
      completedTaskIds.includes(task.id) ? { ...task, status: 'archived', updated_at: new Date().toISOString() } : task
    );
  });

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .in('id', completedTaskIds)
      .eq('user_id', userId);

    if (error) throw error;
    showSuccess('All completed tasks archived!');
  } catch (error: any) {
    console.error('Error archiving completed tasks:', error.message);
    showError('Failed to archive completed tasks.');
    // Revert optimistic update on error (re-fetch to be safe)
    invalidateTasksQueries();
  } finally {
    completedTaskIds.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};

export const markAllTasksInSectionCompletedMutation = async (
  sectionId: string | null,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries, processedTasks, addReminder, dismissReminder } = context;

  const tasksToCompleteIds = processedTasks
    .filter(task =>
      task.status === 'to-do' &&
      (sectionId === null ? task.section_id === null : task.section_id === sectionId)
    )
    .map(task => task.id);

  if (tasksToCompleteIds.length === 0) {
    showError('No pending tasks in this section to mark as completed.');
    return;
  }

  tasksToCompleteIds.forEach(id => inFlightUpdatesRef.current.add(id));
  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) => {
    if (!oldData) return oldData;
    return oldData.map(task =>
      tasksToCompleteIds.includes(task.id) ? { ...task, status: 'completed', updated_at: new Date().toISOString() } : task
    );
  });

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .in('id', tasksToCompleteIds)
      .eq('user_id', userId);

    if (error) throw error;

    tasksToCompleteIds.forEach(id => dismissReminder(id));
    showSuccess('All tasks in section marked as completed!');
  } catch (error: any) {
    console.error('Error marking all tasks in section completed:', error.message);
    showError('Failed to mark tasks as completed.');
    // Revert optimistic update on error (re-fetch to be safe)
    invalidateTasksQueries();
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

  inFlightUpdatesRef.current.add(activeId);

  // Optimistic update
  queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) => {
    if (!oldData) return oldData;

    const activeTask = oldData.find(t => t.id === activeId);
    if (!activeTask) return oldData;

    const updatedTasks = oldData.filter(t => t.id !== activeId); // Remove active task for re-insertion

    let targetIndex = -1;
    if (overId) {
      targetIndex = updatedTasks.findIndex(t => t.id === overId);
    }

    const newOrder = overId ? (updatedTasks[targetIndex]?.order ?? 0) + (isDraggingDown ? 1 : -1) : 0; // Simple order adjustment

    const updatedActiveTask = {
      ...activeTask,
      parent_task_id: newParentId,
      section_id: newSectionId,
      order: newOrder,
      updated_at: new Date().toISOString(),
    };

    if (targetIndex !== -1) {
      updatedTasks.splice(targetIndex + (isDraggingDown ? 1 : 0), 0, updatedActiveTask);
    } else {
      updatedTasks.push(updatedActiveTask);
    }

    return updatedTasks;
  });

  try {
    const { error } = await supabase
      .from('tasks')
      .update({
        parent_task_id: newParentId,
        section_id: newSectionId,
        order: overId ? (processedTasks.find(t => t.id === overId)?.order ?? 0) + (isDraggingDown ? 1 : -1) : 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeId)
      .eq('user_id', userId);

    if (error) throw error;
    showSuccess('Task reordered!');
  } catch (error: any) {
    console.error('Error updating task parent and order:', error.message);
    showError('Failed to reorder task.');
    // Revert optimistic update on error (re-fetch to be safe)
    invalidateTasksQueries();
  } finally {
    inFlightUpdatesRef.current.delete(activeId);
    invalidateTasksQueries();
  }
};

export const createSectionMutation = async (
  name: string,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateSectionsQueries, sections } = context;

  const tempId = uuidv4();
  inFlightUpdatesRef.current.add(tempId);

  // Optimistic update
  queryClient.setQueryData(['task_sections', userId], (oldData: TaskSection[] | undefined) => {
    const optimisticSection: TaskSection = {
      id: tempId,
      name,
      user_id: userId,
      order: sections.length,
      include_in_focus_mode: true,
    };
    return oldData ? [...oldData, optimisticSection] : [optimisticSection];
  });

  try {
    const { error } = await supabase
      .from('task_sections')
      .insert({ name, user_id: userId, order: sections.length, include_in_focus_mode: true });

    if (error) throw error;
    showSuccess('Section created successfully!');
  } catch (error: any) {
    console.error('Error creating section:', error.message);
    showError('Failed to create section.');
    // Revert optimistic update on error
    queryClient.setQueryData(['task_sections', userId], (oldData: TaskSection[] | undefined) =>
      oldData?.filter(section => section.id !== tempId)
    );
  } finally {
    inFlightUpdatesRef.current.delete(tempId);
    invalidateSectionsQueries();
  }
};

export const updateSectionMutation = async (
  sectionId: string,
  newName: string,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateSectionsQueries } = context;

  inFlightUpdatesRef.current.add(sectionId);
  // Optimistic update
  queryClient.setQueryData(['task_sections', userId], (oldData: TaskSection[] | undefined) => {
    if (!oldData) return oldData;
    return oldData.map(section => section.id === sectionId ? { ...section, name: newName } : section);
  });

  try {
    const { error } = await supabase
      .from('task_sections')
      .update({ name: newName })
      .eq('id', sectionId)
      .eq('user_id', userId);

    if (error) throw error;
    showSuccess('Section updated successfully!');
  } catch (error: any) {
    console.error('Error updating section:', error.message);
    showError('Failed to update section.');
    // Revert optimistic update on error (re-fetch to be safe)
    invalidateSectionsQueries();
  } finally {
    inFlightUpdatesRef.current.delete(sectionId);
    invalidateSectionsQueries();
  }
};

export const deleteSectionMutation = async (
  sectionId: string,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateSectionsQueries, invalidateTasksQueries } = context;

  inFlightUpdatesRef.current.add(sectionId);
  // Optimistic update
  queryClient.setQueryData(['task_sections', userId], (oldData: TaskSection[] | undefined) =>
    oldData?.filter(section => section.id !== sectionId)
  );
  // Optimistically update tasks to remove section_id
  queryClient.setQueryData(['tasks', userId], (oldData: Omit<Task, 'category_color'>[] | undefined) => {
    if (!oldData) return oldData;
    return oldData.map(task => task.section_id === sectionId ? { ...task, section_id: null } : task);
  });

  try {
    // First, update tasks that belong to this section to have no section
    const { error: updateTasksError } = await supabase
      .from('tasks')
      .update({ section_id: null })
      .eq('section_id', sectionId)
      .eq('user_id', userId);

    if (updateTasksError) throw updateTasksError;

    // Then delete the section
    const { error } = await supabase
      .from('task_sections')
      .delete()
      .eq('id', sectionId)
      .eq('user_id', userId);

    if (error) throw error;
    showSuccess('Section deleted successfully!');
  } catch (error: any) {
    console.error('Error deleting section:', error.message);
    showError('Failed to delete section.');
    // Revert optimistic update on error (re-fetch to be safe)
    invalidateSectionsQueries();
    invalidateTasksQueries();
  } finally {
    inFlightUpdatesRef.current.delete(sectionId);
    invalidateSectionsQueries();
    invalidateTasksQueries();
  }
};

export const updateSectionIncludeInFocusModeMutation = async (
  sectionId: string,
  include: boolean,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateSectionsQueries } = context;

  inFlightUpdatesRef.current.add(sectionId);
  // Optimistic update
  queryClient.setQueryData(['task_sections', userId], (oldData: TaskSection[] | undefined) => {
    if (!oldData) return oldData;
    return oldData.map(section => section.id === sectionId ? { ...section, include_in_focus_mode: include } : section);
  });

  try {
    const { error } = await supabase
      .from('task_sections')
      .update({ include_in_focus_mode: include })
      .eq('id', sectionId)
      .eq('user_id', userId);

    if (error) throw error;
    showSuccess('Section focus mode setting updated!');
  } catch (error: any) {
    console.error('Error updating section focus mode:', error.message);
    showError('Failed to update section focus mode setting.');
    // Revert optimistic update on error (re-fetch to be safe)
    invalidateSectionsQueries();
  } finally {
    inFlightUpdatesRef.current.delete(sectionId);
    invalidateSectionsQueries();
  }
};

export const reorderSectionsMutation = async (
  activeId: string,
  overId: string,
  newOrderedSections: TaskSection[],
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateSectionsQueries } = context;

  inFlightUpdatesRef.current.add(activeId);
  inFlightUpdatesRef.current.add(overId);

  // Optimistic update
  queryClient.setQueryData(['task_sections', userId], newOrderedSections);

  try {
    const updates = newOrderedSections.map((section, index) => ({
      id: section.id,
      order: index,
      user_id: userId,
    }));

    const { error } = await supabase
      .from('task_sections')
      .upsert(updates, { onConflict: 'id' });

    if (error) throw error;
    showSuccess('Sections reordered!');
  } catch (error: any) {
    console.error('Error reordering sections:', error.message);
    showError('Failed to reorder sections.');
    // Revert optimistic update on error (re-fetch to be safe)
    invalidateSectionsQueries();
  } finally {
    inFlightUpdatesRef.current.delete(activeId);
    inFlightUpdatesRef.current.delete(overId);
    invalidateSectionsQueries();
  }
};

export const toggleDoTodayMutation = async (
  task: Task,
  currentDate: Date,
  doTodayOffIds: Set<string>,
  context: MutationContext
): Promise<void> => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const taskId = task.original_task_id || task.id;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');

  inFlightUpdatesRef.current.add(taskId);

  const isCurrentlyOff = doTodayOffIds.has(taskId);

  // Optimistic update
  queryClient.setQueryData(['do_today_off_log', userId, formattedDate], (oldData: Set<string> | undefined) => {
    const newData = new Set(oldData);
    if (isCurrentlyOff) {
      newData.delete(taskId);
    } else {
      newData.add(taskId);
    }
    return newData;
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
    console.error('Error toggling "Do Today" status:', error.message);
    showError('Failed to update "Do Today" status.');
    // Revert optimistic update on error
    queryClient.setQueryData(['do_today_off_log', userId, formattedDate], (oldData: Set<string> | undefined) => {
      const newData = new Set(oldData);
      if (isCurrentlyOff) { // If it was off, and failed to turn on, it should remain off
        newData.add(taskId);
      } else { // If it was on, and failed to turn off, it should remain on
        newData.delete(taskId);
      }
      return newData;
    });
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
    invalidateTasksQueries(); // Invalidate tasks to re-filter
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

  const tasksToToggle = filteredTasks.filter(task => task.parent_task_id === null && task.recurring_type === 'none');
  if (tasksToToggle.length === 0) {
    showError('No non-recurring tasks to toggle.');
    return;
  }

  const allAreOn = tasksToToggle.every(task => !doTodayOffIds.has(task.original_task_id || task.id));
  const targetState = !allAreOn; // If all are on, target is off. If some are off, target is on.

  const idsToUpdate = tasksToToggle.map(task => task.original_task_id || task.id);
  idsToUpdate.forEach(id => inFlightUpdatesRef.current.add(id));

  // Optimistic update
  queryClient.setQueryData(['do_today_off_log', userId, formattedDate], (oldData: Set<string> | undefined) => {
    const newData = new Set(oldData);
    idsToUpdate.forEach(id => {
      if (targetState) { // If target is 'on' (meaning remove from off_log)
        newData.delete(id);
      } else { // If target is 'off' (meaning add to off_log)
        newData.add(id);
      }
    });
    return newData;
  });

  try {
    if (targetState) { // Turn all 'on' (remove from off_log)
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .in('task_id', idsToUpdate)
        .eq('off_date', formattedDate)
        .eq('user_id', userId);
      if (error) throw error;
      showSuccess('All non-recurring tasks added to "Do Today"!');
    } else { // Turn all 'off' (add to off_log)
      const recordsToInsert = idsToUpdate.map(id => ({
        task_id: id,
        off_date: formattedDate,
        user_id: userId,
      }));
      const { error } => await supabase
        .from('do_today_off_log')
        .insert(recordsToInsert);
      if (error) throw error;
      showSuccess('All non-recurring tasks removed from "Do Today"!');
    }
  } catch (error: any) {
    console.error('Error toggling all "Do Today" statuses:', error.message);
    showError('Failed to update all "Do Today" statuses.');
    // Revert optimistic update on error (re-fetch to be safe)
    queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] });
  } finally {
    idsToUpdate.forEach(id => inFlightUpdatesRef.current.delete(id));
    invalidateTasksQueries();
  }
};