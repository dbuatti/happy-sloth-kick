import { showSuccess, showError } from '@/utils/toast';
import { format, parseISO, startOfDay, addDays, addMonths, setHours, setMinutes, isValid } from 'date-fns';
import { QueryClient } from '@tanstack/react-query';
import { Task, NewTaskData, TaskSection } from '@/hooks/useTasks';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client'; // Import supabase

// Define MutationContext
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

// Regex to validate UUID format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const calculateNextRecurrenceDate = (
  currentDate: Date,
  recurringType: 'daily' | 'weekly' | 'monthly',
  originalCreatedAt: string // Use original created_at for weekly/monthly alignment
): Date => {
  let nextDate = startOfDay(currentDate); // Start from the current date of completion

  switch (recurringType) {
    case 'daily':
      nextDate = addDays(nextDate, 1);
      break;
    case 'weekly':
      // Find the next occurrence of the original day of the week
      const originalDayOfWeek = parseISO(originalCreatedAt).getUTCDay();
      let daysToAdd = (originalDayOfWeek - nextDate.getUTCDay() + 7) % 7;
      if (daysToAdd === 0) daysToAdd = 7; // If today is the day, next is in 7 days
      nextDate = addDays(nextDate, daysToAdd);
      break;
    case 'monthly':
      // Find the next occurrence of the original day of the month
      const originalDayOfMonth = parseISO(originalCreatedAt).getUTCDate();
      nextDate = addMonths(nextDate, 1);
      // Adjust to the original day of the month, handling month-end overflows
      nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), Math.min(originalDayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
      break;
  }
  return nextDate;
};

export const addTaskMutation = async (
  newTaskData: NewTaskData,
  context: MutationContext
): Promise<string | null> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, addReminder } = context;
  const tempId = uuidv4(); // Generate a temporary ID for optimistic update
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

export const updateTaskMutation = async (
  taskId: string,
  updates: Partial<Task>,
  context: MutationContext
): Promise<string | null> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, addReminder, dismissReminder } = context;
  inFlightUpdatesRef.current.add(taskId);

  try {
    if (taskId.startsWith('virtual-')) {
      const parts = taskId.split('-');
      const originalTaskId = parts[1]; // Assuming format 'virtual-{originalId}-{date}'
      const virtualDateString = parts.slice(2).join('-'); // 'yyyy-MM-dd'

      // Fetch the original recurring task (template)
      const { data: originalTask, error: originalTaskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', originalTaskId)
        .eq('user_id', userId)
        .single();

      if (originalTaskError) throw originalTaskError;
      if (!originalTask) throw new Error('Original recurring task not found for virtual task.');

      // 1. Create a new REAL task instance for the current virtual task's date
      // This task will represent the completed/updated instance for that specific day.
      const materializedTaskData: NewTaskData = {
          ...originalTask, // Copy properties from the original template
          ...updates,      // Apply the updates (e.g., status: 'completed')
          original_task_id: originalTaskId, // Link back to the original recurring task
          created_at: new Date().toISOString(), // Use current timestamp for creation of this specific instance
          // Ensure date-specific fields are correct for this materialized instance
          due_date: updates.due_date || originalTask.due_date, // Keep original due date or update
          remind_at: updates.remind_at || originalTask.remind_at, // Keep original remind_at or update
          // If status is being set to 'completed', set completed_at
          completed_at: updates.status === 'completed' ? new Date().toISOString() : null,
      };

      // Remove properties that should not be inserted or are handled differently
      delete (materializedTaskData as any).user_id; // user_id is added by insert
      delete (materializedTaskData as any).category_color; // client-side only
      delete (materializedTaskData as any).id; // ID will be generated by Supabase

      const { data: insertedTask, error: insertError } = await supabase
          .from('tasks')
          .insert({ ...materializedTaskData, user_id: userId })
          .select()
          .single();

      if (insertError) throw insertError;

      // 2. If the materialized task was completed and is recurring, create the NEXT recurring instance
      if (updates.status === 'completed' && originalTask.recurring_type !== 'none') {
          const nextRecurrenceDate = calculateNextRecurrenceDate(
              parseISO(virtualDateString), // Base next recurrence on the virtual task's date
              originalTask.recurring_type,
              originalTask.created_at
          );

          let nextRemindAt: string | null = null;
          if (originalTask.remind_at) {
              const remindTime = parseISO(originalTask.remind_at);
              nextRemindAt = setMinutes(setHours(nextRecurrenceDate, remindTime.getHours()), remindTime.getMinutes()).toISOString();
          }

          const nextRecurringTask: NewTaskData = {
              description: originalTask.description,
              status: 'to-do',
              recurring_type: originalTask.recurring_type,
              original_task_id: originalTaskId,
              created_at: nextRecurrenceDate.toISOString(),
              category: originalTask.category,
              priority: originalTask.priority,
              due_date: originalTask.due_date ? format(nextRecurrenceDate, 'yyyy-MM-dd') : null,
              notes: originalTask.notes,
              remind_at: nextRemindAt,
              section_id: originalTask.section_id,
              parent_task_id: null,
              link: originalTask.link,
              image_url: originalTask.image_url,
              order: originalTask.order,
          };

          const { error: nextInsertError } = await supabase
              .from('tasks')
              .insert({ ...nextRecurringTask, user_id: userId });

          if (nextInsertError) throw nextInsertError;
      }

      showSuccess('Task updated successfully!');
      invalidateTasksQueries();

      // Update reminders for the newly materialized task
      if (insertedTask.remind_at && insertedTask.status === 'to-do') {
          const d = parseISO(insertedTask.remind_at);
          if (isValid(d)) addReminder(insertedTask.id, `Reminder: ${insertedTask.description}`, d);
      } else {
          dismissReminder(insertedTask.id);
      }

      return insertedTask.id; // Return the ID of the newly created real task
    } else {
      // Existing logic for non-virtual tasks
      // Validate taskId format for non-virtual tasks
      if (!UUID_REGEX.test(taskId)) {
        console.error(`Invalid taskId format for non-virtual task: "${taskId}". Skipping update.`);
        showError('Invalid task ID format. Cannot update task.');
        return null;
      }

      const { data: currentTask, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;
      if (!currentTask) throw new Error('Task not found.');

      const finalUpdates: Partial<Task> = { ...updates };

      // Handle status change to 'completed' for recurring tasks
      if (updates.status === 'completed' && currentTask.recurring_type !== 'none') {
        finalUpdates.completed_at = new Date().toISOString(); // Set completion timestamp

        // Create a new instance for the next recurrence
        const originalTaskId = currentTask.original_task_id || currentTask.id;
        const nextRecurrenceDate = calculateNextRecurrenceDate(
          new Date(), // Use current date for calculation
          currentTask.recurring_type,
          currentTask.created_at // Use original created_at for alignment
        );

        let nextRemindAt: string | null = null;
        if (currentTask.remind_at) {
          const remindTime = parseISO(currentTask.remind_at);
          nextRemindAt = setMinutes(setHours(nextRecurrenceDate, remindTime.getHours()), remindTime.getMinutes()).toISOString();
        }

        const newRecurringTask: NewTaskData = {
          description: currentTask.description,
          status: 'to-do',
          recurring_type: currentTask.recurring_type,
          original_task_id: originalTaskId,
          created_at: nextRecurrenceDate.toISOString(), // Set created_at to the next recurrence date
          category: currentTask.category,
          priority: currentTask.priority,
          due_date: currentTask.due_date ? format(nextRecurrenceDate, 'yyyy-MM-dd') : null, // Update due_date to next recurrence date if it exists
          notes: currentTask.notes,
          remind_at: nextRemindAt,
          section_id: currentTask.section_id,
          parent_task_id: null, // Recurring tasks are always top-level
          link: currentTask.link,
          image_url: currentTask.image_url,
          order: currentTask.order,
        };

        const { error: insertError } = await supabase
          .from('tasks')
          .insert({ ...newRecurringTask, user_id: userId });

        if (insertError) throw insertError;
      } else if (updates.status !== 'completed') {
        finalUpdates.completed_at = null; // Clear completed_at if status is not completed
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(finalUpdates)
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      showSuccess('Task updated successfully!');
      invalidateTasksQueries();

      // Update reminders
      if (data.remind_at && data.status === 'to-do') {
        const d = parseISO(data.remind_at);
        if (isValid(d)) addReminder(data.id, `Reminder: ${data.description}`, d);
      } else {
        dismissReminder(data.id);
      }

      return data.id;
    }
  } catch (error: any) {
    showError('Failed to update task.');
    console.error('Error updating task:', error.message);
    return null;
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
  }
};

export const deleteTaskMutation = async (
  taskId: string,
  context: MutationContext
): Promise<boolean> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;
  inFlightUpdatesRef.current.add(taskId);

  try {
    // Validate taskId format for non-virtual tasks
    if (!taskId.startsWith('virtual-') && !UUID_REGEX.test(taskId)) {
      console.error(`Invalid taskId format for non-virtual task: "${taskId}". Skipping delete.`);
      showError('Invalid task ID format. Cannot delete task.');
      return false;
    }

    // Delete the task and any sub-tasks associated with it
    const { error } = await supabase
      .from('tasks')
      .delete()
      .or(`id.eq.${taskId},parent_task_id.eq.${taskId}`) // Delete the task itself OR any tasks where this is the parent
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('Task deleted successfully!');
    invalidateTasksQueries();
    dismissReminder(taskId); // Dismiss reminder for the deleted task

    return true;
  } catch (error: any) {
    showError('Failed to delete task.');
    console.error('Error deleting task:', error.message);
    return false;
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
  }
};

export const bulkUpdateTasksMutation = async (
  updates: Partial<Task>,
  ids: string[],
  context: MutationContext
): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, addReminder, dismissReminder } = context;
  
  // Filter out any invalid UUIDs before processing
  const validIds = ids.filter(id => UUID_REGEX.test(id));
  const invalidIds = ids.filter(id => !UUID_REGEX.test(id));

  if (invalidIds.length > 0) {
    console.warn(`Skipping bulk update for invalid task IDs: ${invalidIds.join(', ')}`);
    showError(`Skipped updating ${invalidIds.length} tasks due to invalid ID format.`);
  }

  if (validIds.length === 0) {
    return; // No valid IDs to process
  }

  validIds.forEach(id => inFlightUpdatesRef.current.add(id));

  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .in('id', validIds)
      .eq('user_id', userId)
      .select();

    if (error) throw error;

    showSuccess('Tasks updated successfully!');
    invalidateTasksQueries();

    data.forEach((task: Task) => {
      if (task.remind_at && task.status === 'to-do') {
        const d = parseISO(task.remind_at);
        if (isValid(d)) addReminder(task.id, `Reminder: ${task.description}`, d);
      } else {
        dismissReminder(task.id);
      }
    });
  } catch (error: any) {
    showError('Failed to bulk update tasks.');
    console.error('Error bulk updating tasks:', error.message);
  } finally {
    validIds.forEach((id: string) => inFlightUpdatesRef.current.delete(id));
  }
};

export const bulkDeleteTasksMutation = async (
  ids: string[],
  context: MutationContext
): Promise<boolean> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;
  
  // Filter out any invalid UUIDs before processing
  const validIds = ids.filter(id => UUID_REGEX.test(id));
  const invalidIds = ids.filter(id => !UUID_REGEX.test(id));

  if (invalidIds.length > 0) {
    console.warn(`Skipping bulk delete for invalid task IDs: ${invalidIds.join(', ')}`);
    showError(`Skipped deleting ${invalidIds.length} tasks due to invalid ID format.`);
  }

  if (validIds.length === 0) {
    return false; // No valid IDs to process
  }

  validIds.forEach(id => inFlightUpdatesRef.current.add(id));

  try {
    // Fetch all tasks that are either in `validIds` or are sub-tasks of tasks in `validIds`
    const { data: tasksToDelete, error: fetchError } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .or(`id.in.(${validIds.join(',')}),parent_task_id.in.(${validIds.join(',')})`);

    if (fetchError) throw fetchError;

    const allIdsToDelete = tasksToDelete.map((t: { id: string }) => t.id);

    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', allIdsToDelete)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('Tasks deleted successfully!');
    invalidateTasksQueries();
    allIdsToDelete.forEach((id: string) => dismissReminder(id));

    return true;
  } catch (error: any) {
    showError('Failed to bulk delete tasks.');
    console.error('Error bulk deleting tasks:', error.message);
    return false;
  } finally {
    validIds.forEach((id: string) => inFlightUpdatesRef.current.delete(id));
  }
};

export const archiveAllCompletedTasksMutation = async (
  context: MutationContext
): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;
  let idsToArchive: string[] = []; // Declare outside try block

  try {
    const { data: completedTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, remind_at')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (fetchError) throw fetchError;

    idsToArchive = completedTasks.map((task: { id: string }) => task.id); // Assign to the outer-scoped variable
    if (idsToArchive.length === 0) {
      showSuccess('No completed tasks to archive.');
      return;
    }

    idsToArchive.forEach(id => inFlightUpdatesRef.current.add(id));

    const { error } = await supabase
      .from('tasks')
      .update({ status: 'archived', completed_at: null }) // Clear completed_at when archiving
      .in('id', idsToArchive)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('All completed tasks archived!');
    invalidateTasksQueries();
    completedTasks.forEach((task: { id: string }) => dismissReminder(task.id));
  } catch (error: any) {
    showError('Failed to archive completed tasks.');
    console.error('Error archiving completed tasks:', error.message);
  } finally {
    context.queryClient.invalidateQueries({ queryKey: ['tasks', userId] }); // Ensure full refresh
    context.queryClient.invalidateQueries({ queryKey: ['dailyTaskCount', userId] });
    context.queryClient.invalidateQueries({ queryKey: ['dashboardStats', userId] });
    idsToArchive.forEach((id: string) => inFlightUpdatesRef.current.delete(id)); // Use outer-scoped variable
  }
};

export const markAllTasksInSectionCompletedMutation = async (
  sectionId: string | null,
  context: MutationContext
): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, dismissReminder } = context;
  let idsToComplete: string[] = []; // Declare outside try block

  try {
    let query = supabase
      .from('tasks')
      .select('id, remind_at')
      .eq('user_id', userId)
      .eq('status', 'to-do');

    if (sectionId === null) {
      query = query.is('section_id', null);
    } else {
      query = query.eq('section_id', sectionId);
    }

    const { data: tasksToComplete, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    idsToComplete = tasksToComplete.map((task: { id: string }) => task.id); // Assign to the outer-scoped variable
    if (idsToComplete.length === 0) {
      showSuccess('No pending tasks in this section to mark as completed.');
      return;
    }

    idsToComplete.forEach(id => inFlightUpdatesRef.current.add(id));

    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .in('id', idsToComplete)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('All tasks in section marked as completed!');
    invalidateTasksQueries();
    tasksToComplete.forEach((task: { id: string }) => dismissReminder(task.id));
  } catch (error: any) {
    showError('Failed to mark all tasks in section as completed.');
    console.error('Error marking all tasks in section as completed:', error.message);
  } finally {
    context.queryClient.invalidateQueries({ queryKey: ['tasks', userId] }); // Ensure full refresh
    context.queryClient.invalidateQueries({ queryKey: ['dailyTaskCount', userId] });
    context.queryClient.invalidateQueries({ queryKey: ['dashboardStats', userId] });
    idsToComplete.forEach((id: string) => inFlightUpdatesRef.current.delete(id)); // Use outer-scoped variable
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
  const { userId, inFlightUpdatesRef, invalidateTasksQueries, processedTasks } = context;
  inFlightUpdatesRef.current.add(activeId);

  try {
    // Validate activeId format for non-virtual tasks
    if (!activeId.startsWith('virtual-') && !UUID_REGEX.test(activeId)) {
      console.error(`Invalid activeId format for non-virtual task: "${activeId}". Skipping reorder.`);
      showError('Invalid task ID format. Cannot reorder task.');
      return;
    }

    const activeTask = processedTasks.find(t => t.id === activeId);
    if (!activeTask) throw new Error('Active task not found.');

    const updates: Partial<Task> = {
      parent_task_id: newParentId,
      section_id: newSectionId,
    };

    let newOrder: number | null = null;

    if (overId) {
      const overTask = processedTasks.find(t => t.id === overId);
      if (overTask) {
        const siblings = processedTasks.filter(t =>
          t.parent_task_id === newParentId && t.section_id === newSectionId && t.id !== activeId
        ).sort((a, b) => (a.order || 0) - (b.order || 0));

        const overIndex = siblings.findIndex(s => s.id === overId);

        if (overIndex !== -1) {
          if (isDraggingDown) {
            newOrder = (siblings[overIndex]?.order || 0) + 1;
          } else {
            newOrder = (siblings[overIndex]?.order || 0) - 1;
          }
        } else {
          // If overId is not a sibling, place at the end or beginning
          newOrder = isDraggingDown ? (siblings[siblings.length - 1]?.order || 0) + 1 : (siblings[0]?.order || 0) - 1;
        }
      }
    } else {
      // No overId, place at the end of the section/parent
      const siblings = processedTasks.filter(t =>
        t.parent_task_id === newParentId && t.section_id === newSectionId && t.id !== activeId
      ).sort((a, b) => (a.order || 0) - (b.order || 0));
      newOrder = (siblings[siblings.length - 1]?.order || 0) + 1;
    }

    updates.order = newOrder;

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
    console.error('Error reordering task:', error.message);
  } finally {
    inFlightUpdatesRef.current.delete(activeId);
  }
};

export const toggleDoTodayMutation = async (
  task: Task,
  currentDate: Date,
  doTodayOffIds: Set<string>,
  context: MutationContext
): Promise<boolean> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const taskId = task.original_task_id || task.id;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');
  inFlightUpdatesRef.current.add(taskId);

  try {
    // Validate taskId format for non-virtual tasks
    if (!taskId.startsWith('virtual-') && !UUID_REGEX.test(taskId)) {
      console.error(`Invalid taskId format for non-virtual task: "${taskId}". Skipping toggle Do Today.`);
      showError('Invalid task ID format. Cannot toggle "Do Today" status.');
      return false;
    }

    const isCurrentlyOff = doTodayOffIds.has(taskId);

    if (isCurrentlyOff) {
      // Remove from do_today_off_log
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('user_id', userId)
        .eq('task_id', taskId)
        .eq('off_date', formattedDate);
      if (error) throw error;
      showSuccess('Task added to "Do Today"!');
    } else {
      // Add to do_today_off_log
      const { error } = await supabase
        .from('do_today_off_log')
        .insert({ user_id: userId, task_id: taskId, off_date: formattedDate });
      if (error) throw error;
      showSuccess('Task removed from "Do Today"!');
    }
    invalidateTasksQueries();
    return true;
  } catch (error: any) {
    showError('Failed to update "Do Today" status.');
    console.error('Error toggling Do Today:', error.message);
    return false;
  } finally {
    inFlightUpdatesRef.current.delete(taskId);
  }
};

export const toggleAllDoTodayMutation = async (
  filteredTasks: Task[],
  currentDate: Date,
  doTodayOffIds: Set<string>,
  context: MutationContext
): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateTasksQueries } = context;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');

  const tasksToToggle = filteredTasks.filter(task => task.recurring_type === 'none' && task.parent_task_id === null); // Declare outside try block
  
  // Filter out any invalid UUIDs before processing
  const validTasksToToggle = tasksToToggle.filter(task => UUID_REGEX.test(task.original_task_id || task.id));
  const invalidTasksToToggle = tasksToToggle.filter(task => !UUID_REGEX.test(task.original_task_id || task.id));

  if (invalidTasksToToggle.length > 0) {
    console.warn(`Skipping toggle all Do Today for invalid task IDs: ${invalidTasksToToggle.map(t => t.original_task_id || t.id).join(', ')}`);
    showError(`Skipped toggling ${invalidTasksToToggle.length} tasks due to invalid ID format.`);
  }

  if (validTasksToToggle.length === 0) {
    showSuccess('No non-recurring tasks to toggle "Do Today" status.');
    return;
  }

  validTasksToToggle.forEach(task => inFlightUpdatesRef.current.add(task.original_task_id || task.id));

  try {
    const allAreOff = validTasksToToggle.every(task => doTodayOffIds.has(task.original_task_id || task.id));

    if (allAreOff) {
      // All are off, so turn them all ON (delete from log)
      const idsToRemove = validTasksToToggle.map((task: Task) => task.original_task_id || task.id);
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('user_id', userId)
        .eq('off_date', formattedDate)
        .in('task_id', idsToRemove);
      if (error) throw error;
      showSuccess('All tasks added to "Do Today"!');
    } else {
      // Some are on, some are off, or all are on. Turn them all OFF (insert into log)
      const idsToAdd = validTasksToToggle
        .filter(task => !doTodayOffIds.has(task.original_task_id || task.id))
        .map((task: Task) => task.original_task_id || task.id);

      if (idsToAdd.length > 0) {
        const { error } = await supabase
          .from('do_today_off_log')
          .insert(idsToAdd.map(id => ({ user_id: userId, task_id: id, off_date: formattedDate })));
        if (error) throw error;
        showSuccess('All tasks removed from "Do Today"!');
      } else {
        showSuccess('All tasks already removed from "Do Today".');
      }
    }
    invalidateTasksQueries();
  } catch (error: any) {
    showError('Failed to toggle all "Do Today" statuses.');
    console.error('Error toggling all Do Today:', error.message);
  } finally {
    validTasksToToggle.forEach((task: Task) => inFlightUpdatesRef.current.delete(task.original_task_id || task.id));
  }
};