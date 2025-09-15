import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { parseISO, isValid, format, setHours, setMinutes, getHours, getMinutes } from 'date-fns';
import { QueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/utils/toast';
import { addReminder, dismissReminder } from '@/context/ReminderContext';
import { cleanTaskForDb } from '@/utils/taskUtils';
import { Task } from '@/hooks/useTasks';

type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>;

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
  created_at?: string;
  link?: string | null;
  image_url?: string | null;
}

interface MutationContext {
  userId: string;
  queryClient: QueryClient;
  inFlightUpdatesRef: React.MutableRefObject<Set<string>>;
  categoriesMap: Map<string, string>;
  invalidateTasksQueries: () => void;
  processedTasks: Task[];
}

export const addTaskMutation = async (
  newTaskData: NewTaskData,
  { userId, queryClient, inFlightUpdatesRef, categoriesMap, invalidateTasksQueries }: MutationContext
) => {
  const newTaskClientSideId = uuidv4();
  inFlightUpdatesRef.current.add(newTaskClientSideId);
  try {
    const categoryColor = categoriesMap.get(newTaskData.category || '') || 'gray';
    const tempTask: Task = {
      id: newTaskClientSideId,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
      status: newTaskData.status || 'to-do',
      recurring_type: newTaskData.recurring_type || 'none',
      category: newTaskData.category || null,
      category_color: categoryColor,
      priority: (newTaskData.priority || 'medium') as Task['priority'],
      due_date: newTaskData.due_date || null,
      notes: newTaskData.notes || null,
      remind_at: newTaskData.remind_at || null,
      section_id: newTaskData.section_id || null,
      order: 0,
      original_task_id: null,
      parent_task_id: newTaskData.parent_task_id || null,
      description: newTaskData.description,
      link: newTaskData.link || null,
      image_url: newTaskData.image_url || null,
    };
    queryClient.setQueryData(['tasks', userId], (oldTasks: Task[] | undefined) => {
      return oldTasks ? [...oldTasks, tempTask] : [tempTask];
    });

    const { data, error } = await supabase
      .from('tasks')
      .insert(cleanTaskForDb(tempTask))
      .select('id, description, status, recurring_type, created_at, updated_at, completed_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link, image_url')
      .single();

    if (error) throw error;
    showSuccess('Task added successfully!');
    invalidateTasksQueries();
    if (data.remind_at && data.status === 'to-do') {
      const d = parseISO(data.remind_at);
      if (isValid(d)) addReminder(data.id, `Reminder: ${data.description}`, d);
    }
    return true;
  } catch (e: any) {
    showError('Failed to add task.');
    console.error('Error adding task to DB:', e.message);
    invalidateTasksQueries();
    return false;
  } finally {
    setTimeout(() => {
      inFlightUpdatesRef.current.delete(newTaskClientSideId);
    }, 1500);
  }
};

export const updateTaskMutation = async (
  taskId: string,
  updates: TaskUpdate,
  { userId, queryClient, inFlightUpdatesRef, categoriesMap, invalidateTasksQueries, processedTasks }: MutationContext
): Promise<string | null> => {
  let idToTrack: string = taskId;
  let originalTaskState: Task | undefined;
  
  try {
    let categoryColor: string | undefined;
    if (updates.category) categoryColor = categoriesMap.get(updates.category || '') || 'gray';

    originalTaskState = processedTasks.find(t => t.id === taskId);

    if (originalTaskState && originalTaskState.id.startsWith('virtual-')) {
      const virtualTask = originalTaskState;
      
      const newInstanceId = uuidv4();
      idToTrack = newInstanceId;
      inFlightUpdatesRef.current.add(newInstanceId);

      const newInstanceData: Omit<Task, 'category_color'> = {
          id: newInstanceId,
          user_id: userId,
          description: updates.description !== undefined ? updates.description : virtualTask.description,
          status: updates.status ?? virtualTask.status,
          recurring_type: 'none' as const,
          created_at: virtualTask.created_at,
          updated_at: new Date().toISOString(),
          completed_at: (updates.status === 'completed' || updates.status === 'archived') ? new Date().toISOString() : null,
          category: updates.category !== undefined ? updates.category : virtualTask.category,
          priority: updates.priority !== undefined ? updates.priority : virtualTask.priority,
          due_date: updates.due_date !== undefined ? updates.due_date : virtualTask.due_date,
          notes: updates.notes !== undefined ? updates.notes : virtualTask.notes,
          remind_at: updates.remind_at !== undefined ? updates.remind_at : virtualTask.remind_at,
          section_id: updates.section_id !== undefined ? updates.section_id : virtualTask.section_id,
          order: virtualTask.order,
          original_task_id: virtualTask.original_task_id || virtualTask.id.replace(/^virtual-/, '').split(/-\d{4}-\d{2}-\d{2}$/)[0],
          parent_task_id: virtualTask.parent_task_id,
          link: updates.link !== undefined ? updates.link : virtualTask.link,
          image_url: updates.image_url !== undefined ? updates.image_url : virtualTask.image_url,
      };

      queryClient.setQueryData(['tasks', userId], (oldTasks: Task[] | undefined) => {
          return oldTasks ? [...oldTasks, { ...newInstanceData, category_color: virtualTask.category_color }] : [{ ...newInstanceData, category_color: virtualTask.category_color }];
      });

      const { data: dbTask, error: insertError } = await supabase
          .from('tasks')
          .insert(cleanTaskForDb(newInstanceData))
          .select('*')
          .single();

      if (insertError) {
          console.error('Failed to insert new task instance:', insertError);
          showError('Failed to create an instance of the recurring task.');
          invalidateTasksQueries();
          return null;
      }
      showSuccess('Task created from recurring template!');
      invalidateTasksQueries();
      if (dbTask.remind_at && dbTask.status === 'to-do') {
          const d = parseISO(dbTask.remind_at);
          if (isValid(d)) addReminder(dbTask.id, `Reminder: ${dbTask.description}`, d);
      }
      return dbTask.id;
    } else if (!originalTaskState) {
      showError('Task not found for update.');
      return null;
    }

    const currentStatus = originalTaskState.status;
    const newStatus = updates.status;
    const now = new Date().toISOString();
    
    let completedAtUpdate: string | null | undefined = originalTaskState.completed_at;

    if (newStatus && (newStatus === 'completed' || newStatus === 'archived') && !(currentStatus === 'completed' || currentStatus === 'archived')) {
      completedAtUpdate = now;
    } else if (newStatus && (newStatus === 'to-do' || newStatus === 'skipped') && (currentStatus === 'completed' || currentStatus === 'archived')) {
      completedAtUpdate = null;
    }

    const finalUpdates = { ...updates, completed_at: completedAtUpdate };

    queryClient.setQueryData(['tasks', userId], (oldTasks: Task[] | undefined) => {
      return oldTasks?.map(t => t.id === taskId ? { ...t, ...finalUpdates, ...(categoryColor && { category_color: categoryColor }) } : t) || [];
    });

    const { data, error } = await supabase
      .from('tasks')
      .update(cleanTaskForDb(finalUpdates))
      .eq('id', taskId)
      .eq('user_id', userId)
      .select('id, description, status, recurring_type, created_at, updated_at, completed_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link, image_url')
      .single();

    if (error) throw error;

    showSuccess('Task updated!');
    invalidateTasksQueries();

    if (updates.remind_at) {
      const d = parseISO(updates.remind_at as string);
      if (isValid(d) && (updates.status === undefined || updates.status === 'to-do')) addReminder(taskId, `Reminder: ${originalTaskState.description}`, d);
    }
    if (updates.status === 'completed' || updates.status === 'archived' || updates.remind_at === null) {
      dismissReminder(taskId);
    }
    return data.id;
  } catch (e: any) {
    showError('Failed to update task.');
    console.error('Error updating task:', e.message);
    invalidateTasksQueries();
    return null;
  } finally {
    setTimeout(() => {
      inFlightUpdatesRef.current.delete(idToTrack);
    }, 1500);
  }
};

export const deleteTaskMutation = async (
  taskId: string,
  { userId, queryClient, inFlightUpdatesRef, processedTasks, invalidateTasksQueries }: MutationContext
) => {
  let idsToDelete: string[] = [];
  try {
    const taskToDelete: Task | undefined = processedTasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    if (taskToDelete.image_url) {
      try {
        const imagePath = taskToDelete.image_url.split('/taskimages/')[1];
        if (imagePath) {
          await supabase.storage.from('taskimages').remove([imagePath]);
        }
      } catch (imgErr) {
        console.error("Failed to delete old image, but proceeding with task deletion:", imgErr);
      }
    }

    idsToDelete = [taskId];
    const subIds = processedTasks.filter(t => t.parent_task_id === taskId).map(t => t.id);
    idsToDelete = [...idsToDelete, ...subIds];
    if (taskToDelete.recurring_type !== 'none' && taskToDelete.original_task_id === null) {
      const inst = processedTasks.filter(t => t.original_task_id === taskId).map(t => t.id);
      idsToDelete = [...idsToDelete, ...inst];
    }
    
    idsToDelete.forEach(id => inFlightUpdatesRef.current.add(id));
    queryClient.setQueryData(['tasks', userId], (oldTasks: Task[] | undefined) => {
      return oldTasks?.filter(t => !idsToDelete.includes(t.id)) || [];
    });

    const { error } = await supabase.from('tasks').delete().in('id', idsToDelete).eq('user_id', userId).select('id');
    if (error) throw error;
    showSuccess('Task(s) deleted!');
    idsToDelete.forEach(dismissReminder);
    invalidateTasksQueries();
  } catch (e: any) {
    showError('Failed to delete task.');
    console.error(`Error deleting task(s) from DB:`, e.message);
    invalidateTasksQueries();
  } finally {
    setTimeout(() => {
      idsToDelete.forEach(id => inFlightUpdatesRef.current.delete(id));
    }, 1500);
  }
};

export const bulkUpdateTasksMutation = async (
  updates: Partial<Task>,
  ids: string[],
  { userId, queryClient, inFlightUpdatesRef, invalidateTasksQueries }: MutationContext
) => {
  if (ids.length === 0) return;

  const now = new Date().toISOString();
  
  const updatesWithCompletedAt = { ...updates };
  if (updates.status && (updates.status === 'completed' || updates.status === 'archived')) {
    updatesWithCompletedAt.completed_at = now;
  } else if (updates.status && (updates.status === 'to-do' || updates.status === 'skipped')) {
    updatesWithCompletedAt.completed_at = null;
  }

  ids.forEach(id => inFlightUpdatesRef.current.add(id));
  queryClient.setQueryData(['tasks', userId], (oldTasks: Task[] | undefined) => {
    return oldTasks?.map(t => (ids.includes(t.id) ? { ...t, ...updatesWithCompletedAt } : t)) || [];
  });

  try {
    const { error } = await supabase
      .from('tasks')
      .update(cleanTaskForDb(updatesWithCompletedAt))
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throw error;
    showSuccess('Tasks updated!');
    invalidateTasksQueries();
  } catch (e: any) {
    showError('Failed to update tasks.');
    console.error(`Error during bulk update for tasks ${ids.join(', ')}:`, e.message);
    invalidateTasksQueries();
  } finally {
    setTimeout(() => {
      ids.forEach(id => inFlightUpdatesRef.current.delete(id));
    }, 1500);
  }
};

export const bulkDeleteTasksMutation = async (
  ids: string[],
  { userId, queryClient, inFlightUpdatesRef, processedTasks, invalidateTasksQueries }: MutationContext
) => {
  if (ids.length === 0) return true;
  try {
    const tasksToDelete = processedTasks.filter(t => ids.includes(t.id));
    const imageKeysToDelete = tasksToDelete
      .map(t => t.image_url)
      .filter((url): url is string => !!url)
      .map(url => url.split('/taskimages/')[1])
      .filter(Boolean);

    if (imageKeysToDelete.length > 0) {
      await supabase.storage.from('taskimages').remove(imageKeysToDelete);
    }

    ids.forEach(id => inFlightUpdatesRef.current.add(id));
    queryClient.setQueryData(['tasks', userId], (oldTasks: Task[] | undefined) => {
      return oldTasks?.filter(t => !ids.includes(t.id)) || [];
    });

    const { error } = await supabase.from('tasks').delete().in('id', ids).eq('user_id', userId);
    if (error) throw error;

    showSuccess(`${ids.length} task(s) deleted!`);
    ids.forEach(dismissReminder);
    invalidateTasksQueries();
    return true;
  } catch (e: any) {
    showError('Failed to delete tasks.');
    console.error(`Error during bulk delete for tasks ${ids.join(', ')}:`, e.message);
    invalidateTasksQueries();
    return false;
  } finally {
    setTimeout(() => {
      ids.forEach(id => inFlightUpdatesRef.current.delete(id));
    }, 1500);
  }
};

export const archiveAllCompletedTasksMutation = async (
  { userId, processedTasks, bulkUpdateTasks }: MutationContext
) => {
  const completedTaskIds = processedTasks
      .filter(task => task.status === 'completed')
      .map(task => task.id);

  if (completedTaskIds.length === 0) {
      showSuccess('No completed tasks to archive!');
      return;
  }
  // Pass a partial context to bulkUpdateTasks as it only needs a subset of MutationContext
  await bulkUpdateTasks({ status: 'archived' }, completedTaskIds, { userId, processedTasks, queryClient: {} as QueryClient, inFlightUpdatesRef: {} as React.MutableRefObject<Set<string>>, categoriesMap: {} as Map<string, string>, invalidateTasksQueries: () => {} });
};

export const markAllTasksInSectionCompletedMutation = async (
  sectionId: string | null,
  { userId, processedTasks, bulkUpdateTasks }: MutationContext
) => {
  const tasksToComplete = processedTasks.filter(t =>
    t.status === 'to-do' &&
    t.parent_task_id === null &&
    (sectionId === null ? t.section_id === null : t.section_id === sectionId)
  ).map(t => t.id);

  if (tasksToComplete.length === 0) {
    showSuccess('No pending tasks in this section to complete!');
    return;
  }

  // Pass a partial context to bulkUpdateTasks as it only needs a subset of MutationContext
  await bulkUpdateTasks({ status: 'completed' }, tasksToComplete, { userId, processedTasks, queryClient: {} as QueryClient, inFlightUpdatesRef: {} as React.MutableRefObject<Set<string>>, categoriesMap: {} as Map<string, string>, invalidateTasksQueries: () => {} });
};

export const updateTaskParentAndOrderMutation = async (
  activeId: string,
  newParentId: string | null,
  newSectionId: string | null,
  overId: string | null,
  isDraggingDown: boolean,
  { userId, queryClient, inFlightUpdatesRef, processedTasks, invalidateTasksQueries, categoriesMap }: MutationContext
) => {
  let finalActiveId = activeId;
  const isVirtual = activeId.toString().startsWith('virtual-');
  let activeTask: Task | undefined;

  if (isVirtual) {
      const virtualTask = processedTasks.find(t => t.id === activeId);
      if (!virtualTask) {
          console.error('[DnD Error] Virtual task not found');
          return;
      }

      const newInstanceId = uuidv4();
      finalActiveId = newInstanceId;
      inFlightUpdatesRef.current.add(newInstanceId);

      const newInstanceData: Omit<Task, 'category_color'> = {
          id: newInstanceId,
          user_id: userId,
          description: virtualTask.description,
          status: virtualTask.status,
          recurring_type: 'none' as const,
          created_at: virtualTask.created_at,
          updated_at: new Date().toISOString(),
          completed_at: null,
          category: virtualTask.category,
          priority: virtualTask.priority,
          due_date: virtualTask.due_date,
          notes: virtualTask.notes,
          remind_at: virtualTask.remind_at,
          section_id: newSectionId,
          order: virtualTask.order,
          original_task_id: virtualTask.original_task_id || virtualTask.id.replace(/^virtual-/, '').split(/-\d{4}-\d{2}-\d{2}$/)[0],
          parent_task_id: virtualTask.parent_task_id,
          link: virtualTask.link,
          image_url: virtualTask.image_url,
      };

      queryClient.setQueryData(['tasks', userId], (oldTasks: Task[] | undefined) => {
          return oldTasks ? [...oldTasks, { ...newInstanceData, category_color: virtualTask.category_color }] : [{ ...newInstanceData, category_color: virtualTask.category_color }];
      });

      const { data: dbTask, error: insertError } = await supabase
          .from('tasks')
          .insert(cleanTaskForDb(newInstanceData))
          .select('*')
          .single();

      if (insertError) {
          console.error('Failed to insert new task instance:', insertError);
          showError('Failed to create an instance of the recurring task.');
          invalidateTasksQueries();
          return;
      }
      showSuccess('Task created from recurring template!');
      invalidateTasksQueries();
      if (dbTask.remind_at && dbTask.status === 'to-do') {
          const d = parseISO(dbTask.remind_at);
          if (isValid(d)) addReminder(dbTask.id, `Reminder: ${dbTask.description}`, d);
      }
      return;
  } else {
      activeTask = processedTasks.find(t => t.id === finalActiveId);
  }

  if (!activeTask) {
      console.error('Active task could not be found or created:', finalActiveId);
      return;
  }

  const updatesForDb: { id: string; order: number | null; parent_task_id: string | null; section_id: string | null; }[] = [];

  const sourceSiblings = processedTasks.filter(t => 
      t.parent_task_id === activeTask!.parent_task_id && 
      t.section_id === activeTask!.section_id && 
      t.id !== finalActiveId
  ).sort((a, b) => (a.order || 0) - (b.order || 0));

  let destinationSiblings = processedTasks.filter(t => 
      t.parent_task_id === newParentId && 
      t.section_id === newSectionId &&
      t.id !== finalActiveId
  ).sort((a, b) => (a.order || 0) - (b.order || 0));

  let overIndex = overId ? destinationSiblings.findIndex(t => t.id === overId) : -1;
  
  if (overIndex !== -1 && isDraggingDown) {
      overIndex += 1;
  }

  const newIndex = overIndex !== -1 ? overIndex : destinationSiblings.length;
  
  const newDestinationSiblings = [...destinationSiblings];
  newDestinationSiblings.splice(newIndex, 0, { ...activeTask, parent_task_id: newParentId, section_id: newSectionId });

  newDestinationSiblings.forEach((task, index) => {
      updatesForDb.push({
          id: task.id,
          order: index,
          parent_task_id: newParentId,
          section_id: newSectionId,
      });
  });

  if (activeTask.parent_task_id !== newParentId || activeTask.section_id !== newSectionId) {
      sourceSiblings.forEach((task, index) => {
          updatesForDb.push({
              id: task.id,
              order: index,
              parent_task_id: activeTask!.parent_task_id,
              section_id: activeTask!.section_id,
          });
      });
  }

  const updatedTasksMap = new Map(processedTasks.map(t => [t.id, t]));
  updatesForDb.forEach(update => {
      const taskToUpdate = updatedTasksMap.get(update.id);
      if (taskToUpdate) {
          updatedTasksMap.set(update.id, { ...taskToUpdate, ...update });
      }
  });
  queryClient.setQueryData(['tasks', userId], Array.from(updatedTasksMap.values()));

  const updatedIds = updatesForDb.map(t => t.id!);
  updatedIds.forEach(id => inFlightUpdatesRef.current.add(id));

  try {
      if (updatesForDb.length > 0) {
          const { error } = await supabase.rpc('update_tasks_order', { updates: updatesForDb });
          if (error) {
              throw error;
          }
      }
      showSuccess('Task moved!');
      invalidateTasksQueries();
  } catch (e: any) {
      showError(`Failed to move task: ${e.message}`);
      console.error('Error moving task:', e.message);
      invalidateTasksQueries();
  } finally {
    setTimeout(() => {
      updatedIds.forEach(id => inFlightUpdatesRef.current.delete(id));
    }, 1500);
  }
};