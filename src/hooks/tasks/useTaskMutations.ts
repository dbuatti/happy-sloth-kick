import { useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { parseISO, isValid, format, setHours, setMinutes, getHours, getMinutes } from 'date-fns';
import { arrayMove } from '@dnd-kit/sortable';

import { showError, showSuccess } from '@/utils/toast';
import { useReminders } from '@/context/ReminderContext';
import { useSettings } from '@/context/SettingsContext';

import { Task, TaskUpdate, NewTaskData, TaskSection, Category } from './types';
import { cleanTaskForDb } from './utils';

interface UseTaskMutationsProps {
  userId: string | undefined;
  processedTasks: Task[];
  sections: TaskSection[];
  allCategories: Category[];
  categoriesMap: Map<string, string>;
  invalidateTasksQueries: () => void;
  invalidateSectionsQueries: () => void;
  invalidateCategoriesQueries: () => void;
  effectiveCurrentDate: Date;
  doTodayOffIds: Set<string>; // Added doTodayOffIds
}

export const useTaskMutations = ({
  userId,
  processedTasks,
  sections,
  allCategories,
  categoriesMap,
  invalidateTasksQueries,
  invalidateSectionsQueries,
  invalidateCategoriesQueries,
  effectiveCurrentDate,
  doTodayOffIds, // Destructure doTodayOffIds
}: UseTaskMutationsProps) => {
  const { addReminder, dismissReminder } = useReminders();
  const { updateSettings } = useSettings();
  const queryClient = useQueryClient();
  const inFlightUpdatesRef = useRef<Set<string>>(new Set());

  const handleAddTask = useCallback(async (newTaskData: NewTaskData): Promise<boolean> => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    const newTaskClientSideId = uuidv4();
    inFlightUpdatesRef.current.add(newTaskClientSideId);
    try {
      const categoryColor = categoriesMap.get(newTaskData.category) || 'gray';
      const tempTask: Task = {
        id: newTaskClientSideId,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: newTaskData.status || 'to-do',
        recurring_type: newTaskData.recurring_type || 'none',
        category: newTaskData.category,
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
        .select('id, description, status, recurring_type, created_at, updated_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link, image_url')
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
      console.error('useTasks: Error adding task to DB:', e.message);
      invalidateTasksQueries();
      return false;
    } finally {
      setTimeout(() => {
        inFlightUpdatesRef.current.delete(newTaskClientSideId);
      }, 1500);
    }
  }, [userId, addReminder, queryClient, invalidateTasksQueries, categoriesMap]);

  const updateTask = useCallback(async (taskId: string, updates: TaskUpdate): Promise<string | null> => {
    if (!userId) {
      showError('User not authenticated.');
      return null;
    }
    let idToTrack: string = taskId;
    let originalTaskState: Task | undefined;
    
    try {
      let categoryColor: string | undefined;
      if (updates.category) categoryColor = categoriesMap.get(updates.category) || 'gray';

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
            console.error('[DnD Error] Failed to insert new task instance:', insertError);
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

      queryClient.setQueryData(['tasks', userId], (oldTasks: Task[] | undefined) => {
        return oldTasks?.map(t => t.id === taskId ? { ...t, ...updates, ...(categoryColor && { category_color: categoryColor }) } : t) || [];
      });

      const { data, error } = await supabase
        .from('tasks')
        .update(cleanTaskForDb(updates))
        .eq('id', taskId)
        .eq('user_id', userId)
        .select('id, description, status, recurring_type, created_at, updated_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link, image_url')
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
      console.error('useTasks: Error updating task:', e.message);
      invalidateTasksQueries();
      return null;
    } finally {
      setTimeout(() => {
        inFlightUpdatesRef.current.delete(idToTrack);
      }, 1500);
    }
  }, [userId, processedTasks, addReminder, dismissReminder, queryClient, invalidateTasksQueries, categoriesMap]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
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
          console.error("Failed to delete task image, but proceeding with task deletion:", imgErr);
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
      console.error(`useTasks: Error deleting task(s) from DB:`, e.message);
      invalidateTasksQueries();
    } finally {
      setTimeout(() => {
        idsToDelete.forEach(id => inFlightUpdatesRef.current.delete(id));
      }, 1500);
    }
  }, [userId, processedTasks, dismissReminder, queryClient, invalidateTasksQueries]);

  const bulkUpdateTasks = useCallback(async (updates: TaskUpdate, ids: string[]) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    if (ids.length === 0) {
      return;
    }
    ids.forEach(id => inFlightUpdatesRef.current.add(id));
    queryClient.setQueryData(['tasks', userId], (oldTasks: Task[] | undefined) => {
      return oldTasks?.map(t => (ids.includes(t.id) ? { ...t, ...updates } : t)) || [];
    });

    try {
      const { error } = await supabase
        .from('tasks')
        .update(cleanTaskForDb(updates))
        .in('id', ids)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Tasks updated!');
      invalidateTasksQueries();
    } catch (e: any) {
      showError('Failed to update tasks.');
      console.error(`useTasks: Error during bulk update for tasks ${ids.join(', ')}:`, e.message);
      invalidateTasksQueries();
    } finally {
      setTimeout(() => {
        ids.forEach(id => inFlightUpdatesRef.current.delete(id));
      }, 1500);
    }
  }, [userId, queryClient, invalidateTasksQueries]);

  const bulkDeleteTasks = useCallback(async (ids: string[]): Promise<boolean> => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    if (ids.length === 0) {
      return true;
    }
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
      console.error(`useTasks: Error during bulk delete for tasks ${ids.join(', ')}:`, e.message);
      invalidateTasksQueries();
      return false;
    } finally {
      setTimeout(() => {
        ids.forEach(id => inFlightUpdatesRef.current.delete(id));
      }, 1500);
    }
  }, [userId, processedTasks, dismissReminder, queryClient, invalidateTasksQueries]);

  const archiveAllCompletedTasks = useCallback(async () => {
    if (!userId) {
        showError('User not authenticated.');
        return;
    }
    const completedTaskIds = processedTasks
        .filter(task => task.status === 'completed')
        .map(task => task.id);

    if (completedTaskIds.length === 0) {
        showSuccess('No completed tasks to archive!');
        return;
    }
    await bulkUpdateTasks({ status: 'archived' }, completedTaskIds);
  }, [userId, processedTasks, bulkUpdateTasks]);

  const markAllTasksInSectionCompleted = useCallback(async (sectionId: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const tasksToComplete = processedTasks.filter(t =>
      t.status === 'to-do' &&
      t.parent_task_id === null &&
      (sectionId === null ? t.section_id === null : t.section_id === sectionId)
    ).map(t => t.id);

    if (tasksToComplete.length === 0) {
      showSuccess('No pending tasks in this section to complete!');
      return;
    }

    await bulkUpdateTasks({ status: 'completed' }, tasksToComplete);
  }, [processedTasks, userId, bulkUpdateTasks]);

  const createSection = useCallback(async (name: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const newOrder = sections.length;
    const tempSectionId = uuidv4();
    inFlightUpdatesRef.current.add(tempSectionId);
    try {
      queryClient.setQueryData(['task_sections', userId], (oldSections: TaskSection[] | undefined) => {
        return oldSections ? [...oldSections, { id: tempSectionId, name, user_id: userId, order: newOrder, include_in_focus_mode: true }] : [{ id: tempSectionId, name, user_id: userId, order: newOrder, include_in_focus_mode: true }];
      });

      const { error } = await supabase
        .from('task_sections')
        .insert({ name, user_id: userId, order: newOrder, include_in_focus_mode: true })
        .select()
        .single();
      if (error) throw error;
      showSuccess('Section created!');
      invalidateSectionsQueries();
    } catch (e: any) {
      showError('Failed to create section.');
      console.error('useTasks: Error creating section:', e.message);
      invalidateSectionsQueries();
    } finally {
      setTimeout(() => {
        inFlightUpdatesRef.current.delete(tempSectionId);
      }, 1500);
    }
  }, [userId, sections.length, queryClient, invalidateSectionsQueries]);

  const updateSection = useCallback(async (sectionId: string, newName: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    inFlightUpdatesRef.current.add(sectionId);
    queryClient.setQueryData(['task_sections', userId], (oldSections: TaskSection[] | undefined) => {
      return oldSections?.map(s => s.id === sectionId ? { ...s, name: newName } : s) || [];
    });

    try {
      const { error } = await supabase
        .from('task_sections')
        .update({ name: newName })
        .eq('id', sectionId)
        .eq('user_id', userId);
      if (error) throw error;
      showSuccess('Section updated!');
      invalidateSectionsQueries();
    } catch (e: any) {
      showError('Failed to update section.');
      console.error(`useTasks: Error updating section ${sectionId}:`, e.message);
      invalidateSectionsQueries();
    } finally {
      setTimeout(() => {
        inFlightUpdatesRef.current.delete(sectionId);
      }, 1500);
    }
  }, [userId, queryClient, invalidateSectionsQueries]);

  const deleteSection = useCallback(async (sectionId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    inFlightUpdatesRef.current.add(sectionId);
    queryClient.setQueryData(['task_sections', userId], (oldSections: TaskSection[] | undefined) => {
      return oldSections?.filter(s => s.id !== sectionId) || [];
    });
    queryClient.setQueryData(['tasks', userId], (oldTasks: Task[] | undefined) => {
      return oldTasks?.map(t => t.section_id === sectionId ? { ...t, section_id: null } : t) || [];
    });

    try {
      await supabase
        .from('tasks')
        .update({ section_id: null })
        .eq('section_id', sectionId)
        .eq('user_id', userId);

      const { error } = await supabase
        .from('task_sections')
        .delete()
        .eq('id', sectionId)
        .eq('user_id', userId);
      if (error) throw error;
      showSuccess('Section deleted!');
      invalidateSectionsQueries();
      invalidateTasksQueries();
    }
    catch (e: any) {
      showError('Failed to delete section.');
      console.error(`useTasks: Error deleting section ${sectionId}:`, e.message);
      invalidateSectionsQueries();
      invalidateTasksQueries();
    } finally {
      setTimeout(() => {
        inFlightUpdatesRef.current.delete(sectionId);
      }, 1500);
    }
  }, [userId, queryClient, invalidateSectionsQueries, invalidateTasksQueries]);

  const updateSectionIncludeInFocusMode = useCallback(async (sectionId: string, include: boolean) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    inFlightUpdatesRef.current.add(sectionId);
    queryClient.setQueryData(['task_sections', userId], (oldSections: TaskSection[] | undefined) => {
      return oldSections?.map(s => s.id === sectionId ? { ...s, include_in_focus_mode: include } : s) || [];
    });

    try {
      const { error } = await supabase
        .from('task_sections')
        .update({ include_in_focus_mode: include })
        .eq('id', sectionId)
        .eq('user_id', userId);
      if (error) throw error;
      showSuccess('Focus mode setting updated!');
      invalidateSectionsQueries();
    } catch (e: any) {
      showError('Failed to update focus mode setting.');
      console.error(`useTasks: Error updating focus mode for section ${sectionId}:`, e.message);
      invalidateSectionsQueries();
    } finally {
      setTimeout(() => {
        inFlightUpdatesRef.current.delete(sectionId);
      }, 1500);
    }
  }, [userId, queryClient, invalidateSectionsQueries]);

  const reorderSections = useCallback(async (activeId: string, overId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const oldIndex = sections.findIndex(s => s.id === activeId);
    const newIndex = sections.findIndex(s => s.id === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedSections = arrayMove(sections, oldIndex, newIndex);
    const updates = newOrderedSections.map((s, i) => ({
      id: s.id,
      name: s.name,
      order: i,
      user_id: userId,
      include_in_focus_mode: s.include_in_focus_mode,
    }));

    const updatedIds = updates.map(s => s.id);
    updatedIds.forEach(id => inFlightUpdatesRef.current.add(id));

    queryClient.setQueryData(['task_sections', userId], newOrderedSections);

    try {
      const { error } = await supabase.from('task_sections').upsert(updates, { onConflict: 'id' });
      if (error) throw error;
      showSuccess('Sections reordered!');
      invalidateSectionsQueries();
    } catch (e: any) {
      showError('Failed to reorder sections.');
      console.error('useTasks: Error reordering sections:', e.message);
      invalidateSectionsQueries();
    } finally {
      setTimeout(() => {
        updatedIds.forEach(id => inFlightUpdatesRef.current.delete(id));
      }, 1500);
    }
  }, [userId, sections, queryClient, invalidateSectionsQueries]);

  const updateTaskParentAndOrder = useCallback(async (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null, isDraggingDown: boolean) => {
    if (!userId) {
        showError('User not authenticated.');
        return;
    }

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
            console.error('[DnD Error] Failed to insert new task instance:', insertError);
            showError('Failed to create an instance of the recurring task.');
            invalidateTasksQueries();
            return;
        }
        showSuccess('Task moved!');
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
        console.error('[DnD Error] Active task could not be found or created:', finalActiveId);
        return;
    }

    const updatesForDb: { id: string; order: number; parent_task_id: string | null; section_id: string | null; }[] = [];

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
        console.error('useTasks: Error moving task:', e.message);
        invalidateTasksQueries();
    } finally {
      setTimeout(() => {
        updatedIds.forEach(id => inFlightUpdatesRef.current.delete(id));
      }, 1500);
    }
  }, [userId, processedTasks, addReminder, queryClient, invalidateTasksQueries]);

  const setFocusTask = useCallback(async (taskId: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    
    let finalTaskId = taskId;
    if (taskId && taskId.startsWith('virtual-')) {
      const newRealTaskId = await updateTask(taskId, {});
      if (!newRealTaskId) {
        showError('Failed to create a real task instance to focus on.');
        return;
      }
      finalTaskId = newRealTaskId;
    }

    const success = await updateSettings({ focused_task_id: finalTaskId });
    if (success) {
      showSuccess(finalTaskId ? 'Task set as focus!' : 'Focus cleared.');
    } else {
      showError('Failed to set focus task.');
    }
  }, [userId, updateSettings, updateTask]);

  const toggleDoToday = useCallback(async (task: Task) => {
    if (!userId) return;
    const taskIdToLog = task.original_task_id || task.id;
    const formattedDate = format(effectiveCurrentDate, 'yyyy-MM-dd');
    const isCurrentlyOff = doTodayOffIds.has(taskIdToLog);

    queryClient.setQueryData(['do_today_off_log', userId, format(effectiveCurrentDate, 'yyyy-MM-dd')], (oldSet: Set<string> | undefined) => {
        const newSet = new Set(oldSet || []);
        if (isCurrentlyOff) {
            newSet.delete(taskIdToLog);
        } else {
            newSet.add(taskIdToLog);
        }
        return newSet;
    });

    try {
        if (isCurrentlyOff) {
            const { error } = await supabase
                .from('do_today_off_log')
                .delete()
                .eq('user_id', userId)
                .eq('task_id', taskIdToLog)
                .eq('off_date', formattedDate);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('do_today_off_log')
                .insert({ user_id: userId, task_id: taskIdToLog, off_date: formattedDate });
            if (error) throw error;
        }
        invalidateTasksQueries();
        queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, format(effectiveCurrentDate, 'yyyy-MM-dd')] });
    } catch (e: any) {
        showError("Failed to sync 'Do Today' setting.");
        console.error("Error toggling Do Today:", e);
        invalidateTasksQueries();
        queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, format(effectiveCurrentDate, 'yyyy-MM-dd')] });
    }
  }, [userId, effectiveCurrentDate, doTodayOffIds, queryClient, invalidateTasksQueries]);

  const toggleAllDoToday = useCallback(async () => {
    if (!userId) return;

    const nonRecurringTasks = processedTasks.filter(t => t.recurring_type === 'none');
    if (nonRecurringTasks.length === 0) {
      showSuccess("No non-recurring tasks to toggle.");
      return;
    }

    const nonRecurringTaskIds = nonRecurringTasks.map(t => t.original_task_id || t.id);
    const currentlyOnCount = nonRecurringTasks.filter(t => !doTodayOffIds.has(t.original_task_id || t.id)).length;
    const turnAllOff = currentlyOnCount > nonRecurringTasks.length / 2;

    const formattedDate = format(effectiveCurrentDate, 'yyyy-MM-dd');
    
    queryClient.setQueryData(['do_today_off_log', userId, formattedDate], (oldSet: Set<string> | undefined) => {
        const newSet = new Set(oldSet || []);
        if (turnAllOff) {
            nonRecurringTaskIds.forEach(id => newSet.add(id));
        } else {
            nonRecurringTaskIds.forEach(id => newSet.delete(id));
        }
        return newSet;
    });

    try {
        await supabase.from('do_today_off_log').delete().eq('user_id', userId).eq('off_date', formattedDate);

        if (turnAllOff) {
            const recordsToInsert = nonRecurringTaskIds.map(taskId => ({ user_id: userId, task_id: taskId, off_date: formattedDate }));
            if (recordsToInsert.length > 0) {
                const { error } = await supabase.from('do_today_off_log').insert(recordsToInsert);
                if (error) throw error;
            }
            showSuccess("All tasks toggled off for today.");
        } else {
            showSuccess("All tasks toggled on for today.");
        }
        invalidateTasksQueries();
        queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] });
    } catch (e: any) {
        showError("Failed to sync 'Do Today' settings.");
        console.error("Error toggling all Do Today:", e);
        invalidateTasksQueries();
        queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] });
    }
  }, [userId, processedTasks, doTodayOffIds, effectiveCurrentDate, queryClient, invalidateTasksQueries]);

  return {
    handleAddTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    archiveAllCompletedTasks,
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    reorderSections,
    updateTaskParentAndOrder,
    setFocusTask,
    toggleDoToday,
    toggleAllDoToday,
  };
};