"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { useReminders } from '@/context/ReminderContext';
import { v4 as uuidv4 } from 'uuid';
import { isSameDay, parseISO, isValid, isBefore, format, setHours, setMinutes, getHours, getMinutes, isAfter, startOfDay, addDays } from 'date-fns';
import { arrayMove } from '@dnd-kit/sortable';
import { useSettings } from '@/context/SettingsContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface Task {
  id: string;
  description: string | null; // Changed to allow null
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  created_at: string;
  updated_at: string;
  completed_at: string | null; // Added new field
  user_id: string;
  category: string | null; // Changed to allow null
  category_color: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | string;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number | null; // Changed to allow null
  original_task_id: string | null;
  parent_task_id: string | null;
  link: string | null;
  image_url: string | null;
}

export interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
  include_in_focus_mode: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>;

interface NewTaskData {
  description: string;
  status?: Task['status'];
  recurring_type?: Task['recurring_type'];
  category: string | null; // Changed to allow null
  priority?: Task['priority'];
  due_date?: string | null;
  notes?: string | null;
  remind_at?: string | null;
  section_id?: string | null;
  parent_task_id?: string | null;
  original_task_id?: string | null; // Added for new instance creation
  created_at?: string; // Added for new instance creation
  link?: string | null;
  image_url?: string | null;
}

// Helper function to clean task data for database insertion/update
const cleanTaskForDb = (task: Partial<Task> | NewTaskData): Omit<Partial<Task>, 'category_color'> => {
  const cleaned: Omit<Partial<Task>, 'category_color'> = { ...task };
  // Remove client-side only fields
  if ('category_color' in cleaned) {
    delete (cleaned as any).category_color;
  }
  // Ensure optional fields are explicitly null if empty string or undefined
  if (cleaned.description === '') cleaned.description = null;
  if (cleaned.notes === '') cleaned.notes = null;
  if (cleaned.link === '') cleaned.link = null;
  if (cleaned.image_url === '') cleaned.image_url = null;
  if (cleaned.due_date === '') cleaned.due_date = null;
  if (cleaned.remind_at === '') cleaned.remind_at = null;
  if (cleaned.section_id === '') cleaned.section_id = null;
  if (cleaned.parent_task_id === '') cleaned.parent_task_id = null;
  if (cleaned.original_task_id === '') cleaned.original_task_id = null;
  if (cleaned.completed_at === '') cleaned.completed_at = null; // Handle new field
  
  return cleaned;
};

// --- Query Functions (moved outside the hook) ---

// Query function for sections
export const fetchSections = async (userId: string) => {
  const { data, error } = await supabase
    .from('task_sections')
    .select('id, name, user_id, order, include_in_focus_mode')
    .eq('user_id', userId)
    .order('order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

// Query function for categories
export const fetchCategories = async (userId: string) => {
  const { data, error } = await supabase
    .from('task_categories')
    .select('id, name, color, user_id, created_at')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
};

// Query function for doTodayOffLog
export const fetchDoTodayOffLog = async (userId: string, date: Date) => {
  const formattedDate = format(date, 'yyyy-MM-dd');
  const { data: offLogData, error: offLogError } = await supabase
    .from('do_today_off_log')
    .select('task_id')
    .eq('user_id', userId)
    .eq('off_date', formattedDate);
  if (offLogError) {
      console.error(offLogError);
      return new Set<string>();
  }
  return new Set(offLogData?.map(item => item.task_id) || new Set());
};

// Query function for tasks
export const fetchTasks = async (userId: string): Promise<Omit<Task, 'category_color'>[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, description, status, recurring_type, created_at, updated_at, completed_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link, image_url')
    .eq('user_id', userId)
    .order('section_id', { ascending: true, nullsFirst: true })
    .order('order', { ascending: true });
  if (error) throw error;
  return data || [];
};

// --- End Query Functions ---

interface UseTasksProps {
  currentDate: Date; // Now required and expected to be stable from parent
  viewMode?: 'daily' | 'archive' | 'focus';
  userId?: string;
}

export const useTasks = ({ currentDate, viewMode = 'daily', userId: propUserId }: UseTasksProps) => {
  const { user, loading: authLoading } = useAuth();
  const userId = propUserId || user?.id;
  const { settings: userSettings, updateSettings } = useSettings();
  const { addReminder, dismissReminder } = useReminders();
  const queryClient = useQueryClient();

  const inFlightUpdatesRef = useRef<Set<string>>(new Set());

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const effectiveCurrentDate = currentDate;
  const todayStart = startOfDay(effectiveCurrentDate); // This is the start of the local day for the selected date

  // Use useQuery for sections
  const { data: sections = [], isLoading: sectionsLoading } = useQuery<TaskSection[], Error>({
    queryKey: ['task_sections', userId],
    queryFn: () => fetchSections(userId!),
    enabled: !!userId && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use useQuery for categories
  const { data: allCategories = [], isLoading: categoriesLoading } = useQuery<Category[], Error>({
    queryKey: ['task_categories', userId],
    queryFn: () => fetchCategories(userId!),
    enabled: !!userId && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use useQuery for doTodayOffIds
  const { data: doTodayOffIds = new Set(), isLoading: doTodayOffLoading } = useQuery<Set<string>, Error>({
    queryKey: ['do_today_off_log', userId, format(effectiveCurrentDate, 'yyyy-MM-dd')],
    queryFn: () => fetchDoTodayOffLog(userId!, effectiveCurrentDate),
    enabled: !!userId && !authLoading,
    staleTime: 60 * 1000, // 1 minute
  });

  // Use useQuery for raw tasks
  const { data: rawTasks = [], isLoading: tasksLoading } = useQuery<Omit<Task, 'category_color'>[], Error>({
    queryKey: ['tasks', userId],
    queryFn: () => fetchTasks(userId!),
    enabled: !!userId && !authLoading,
    staleTime: 60 * 1000, // 1 minute
  });

  // Combine loading states
  const loading = authLoading || sectionsLoading || categoriesLoading || doTodayOffLoading || tasksLoading;

  // Memoize categoriesMap
  const categoriesMap = useMemo(() => {
    const map = new Map<string, string>();
    allCategories.forEach(c => map.set(c.id, c.color));
    return map;
  }, [allCategories]);

  // Refetch functions for mutations
  const invalidateTasksQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
    queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId] }); // Invalidate do_today_off_log as well
    queryClient.invalidateQueries({ queryKey: ['dailyTaskCount', userId] }); // Invalidate daily task count
  }, [queryClient, userId]);

  const invalidateSectionsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['task_sections', userId] });
    queryClient.invalidateQueries({ queryKey: ['dailyTaskCount', userId] }); // Invalidate daily task count
  }, [queryClient, userId]);

  const invalidateCategoriesQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['task_categories', userId] });
  }, [queryClient, userId]);

  // Real-time subscriptions to invalidate queries
  useEffect(() => {
    if (!userId) return;

    const tasksChannel = supabase
      .channel('tasks_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newOrOldTask = (payload.new || payload.old) as Task;
          if (inFlightUpdatesRef.current.has(newOrOldTask.id)) return;
          
          invalidateTasksQueries(); // Invalidate to refetch and get correct data/order
          if (payload.eventType === 'UPDATE') {
            if (newOrOldTask.remind_at && newOrOldTask.status === 'to-do') {
              const d = parseISO(newOrOldTask.remind_at);
              if (isValid(d)) addReminder(newOrOldTask.id, `Reminder: ${newOrOldTask.description}`, d);
            } else if (newOrOldTask.status === 'completed' || newOrOldTask.status === 'archived' || newOrOldTask.remind_at === null) {
              dismissReminder(newOrOldTask.id);
            }
          } else if (payload.eventType === 'DELETE') {
            dismissReminder(newOrOldTask.id);
          }
        }
      )
      .subscribe();

    const sectionsChannel = supabase
      .channel('sections_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_sections', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newOrOldSection = (payload.new || payload.old) as TaskSection;
          if (inFlightUpdatesRef.current.has(newOrOldSection.id)) return;
          invalidateSectionsQueries();
          if (payload.eventType === 'DELETE') {
            invalidateTasksQueries(); // Tasks might have their section_id set to null
          }
        }
      )
      .subscribe();

    const categoriesChannel = supabase
      .channel('categories_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_categories', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newOrOldCategory = (payload.new || payload.old) as Category;
          if (inFlightUpdatesRef.current.has(newOrOldCategory.id)) return;
          invalidateCategoriesQueries();
          if (payload.eventType === 'DELETE') {
            invalidateTasksQueries(); // Tasks might have their category changed
          }
        }
      )
      .subscribe();

    const doTodayOffLogChannel = supabase
      .channel('do_today_off_log_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'do_today_off_log', filter: `user_id=eq.${userId}` },
        () => { // Removed unused payload parameter
          queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, format(effectiveCurrentDate, 'yyyy-MM-dd')] });
          invalidateTasksQueries(); // Tasks might change visibility based on this
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(sectionsChannel);
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(doTodayOffLogChannel);
    };
  }, [userId, addReminder, dismissReminder, invalidateTasksQueries, invalidateSectionsQueries, invalidateCategoriesQueries, queryClient, effectiveCurrentDate]);

  const processedTasks = useMemo(() => {
    const allProcessedTasks: Task[] = [];
    const processedSeriesKeys = new Set<string>();
    const categoriesMapLocal = categoriesMap;

    const taskSeriesMap = new Map<string, Omit<Task, 'category_color'>[]>();
    rawTasks.forEach((task: Omit<Task, 'category_color'>) => {
      const seriesKey = task.original_task_id || task.id;
      if (!taskSeriesMap.has(seriesKey)) {
        taskSeriesMap.set(seriesKey, []);
      }
      taskSeriesMap.get(seriesKey)!.push(task);
    });

    taskSeriesMap.forEach((seriesInstances, seriesKey) => {
      if (processedSeriesKeys.has(seriesKey)) return;
      processedSeriesKeys.add(seriesKey);

      const templateTask: Omit<Task, 'category_color'> | undefined = rawTasks.find((t: Omit<Task, 'category_color'>) => t.id === seriesKey);

      if (!templateTask) {
        seriesInstances.forEach(orphanTask => {
            allProcessedTasks.push({ ...orphanTask, category_color: categoriesMapLocal.get(orphanTask.category || '') || 'gray' });
        });
        return;
      }

      if (templateTask.recurring_type === 'none') {
        allProcessedTasks.push({ ...templateTask, category_color: categoriesMapLocal.get(templateTask.category || '') || 'gray' });
      } else {
        const sortedInstances = [...seriesInstances].sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime());
        let relevantInstance: Omit<Task, 'category_color'> | null = sortedInstances.find(t => isSameDay(startOfDay(parseISO(t.created_at)), todayStart)) || null;

        if (!relevantInstance) {
          relevantInstance = sortedInstances.find(t => isBefore(startOfDay(parseISO(t.created_at)), todayStart) && t.status === 'to-do') || null;
        }

        if (!relevantInstance) {
          const mostRecentRealInstance = sortedInstances.find(t => isBefore(startOfDay(parseISO(t.created_at)), todayStart));
          const baseTaskForVirtual = mostRecentRealInstance || templateTask;

          const templateCreatedAt = parseISO(templateTask.created_at);
          const isDailyMatch = templateTask.recurring_type === 'daily';
          const isWeeklyMatch = templateTask.recurring_type === 'weekly' && todayStart.getUTCDay() === templateCreatedAt.getUTCDay();
          const isMonthlyMatch = templateTask.recurring_type === 'monthly' && todayStart.getUTCDate() === templateCreatedAt.getUTCDate();

          if ((isDailyMatch || isWeeklyMatch || isMonthlyMatch) && templateTask.status !== 'archived') {
            const virtualTask: Task = {
              ...baseTaskForVirtual,
              id: `virtual-${templateTask.id}-${format(todayStart, 'yyyy-MM-dd')}`,
              created_at: todayStart.toISOString(),
              status: 'to-do',
              original_task_id: templateTask.id,
              remind_at: baseTaskForVirtual.remind_at ? format(setHours(setMinutes(todayStart, getMinutes(parseISO(baseTaskForVirtual.remind_at))), getHours(parseISO(baseTaskForVirtual.remind_at))), 'yyyy-MM-ddTHH:mm:ssZ') : null,
              due_date: baseTaskForVirtual.due_date ? todayStart.toISOString() : null,
              category_color: categoriesMapLocal.get(baseTaskForVirtual.category || '') || 'gray',
              completed_at: null, // Virtual tasks are never completed
            };
            allProcessedTasks.push(virtualTask);
          }
        } else {
          allProcessedTasks.push({ ...relevantInstance, category_color: categoriesMapLocal.get(relevantInstance.category || '') || 'gray' });
        }
      }
    });
    return allProcessedTasks;
  }, [rawTasks, todayStart, categoriesMap]);

  const handleAddTask = useCallback(async (newTaskData: NewTaskData) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    const newTaskClientSideId = uuidv4();
    inFlightUpdatesRef.current.add(newTaskClientSideId);
    try {
      // Optimistic update
      const categoryColor = categoriesMap.get(newTaskData.category || '') || 'gray';
      const tempTask: Task = {
        id: newTaskClientSideId,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null, // New tasks are not completed
        status: newTaskData.status || 'to-do',
        recurring_type: newTaskData.recurring_type || 'none',
        category: newTaskData.category || null,
        category_color: categoryColor,
        priority: (newTaskData.priority || 'medium') as Task['priority'],
        due_date: newTaskData.due_date || null,
        notes: newTaskData.notes || null,
        remind_at: newTaskData.remind_at || null,
        section_id: newTaskData.section_id || null,
        order: 0, // Placeholder order
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
        .insert(cleanTaskForDb(tempTask)) // Use tempTask for insertion
        .select('id, description, status, recurring_type, created_at, updated_at, completed_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link, image_url')
        .single();

      if (error) throw error;
      showSuccess('Task added successfully!');
      invalidateTasksQueries(); // Invalidate to refetch and get correct data/order
      if (data.remind_at && data.status === 'to-do') {
        const d = parseISO(data.remind_at);
        if (isValid(d)) addReminder(data.id, `Reminder: ${data.description}`, d);
      }
      return true;
    } catch (e: any) {
      showError('Failed to add task.');
      console.error('useTasks: Error adding task to DB:', e.message);
      invalidateTasksQueries(); // Revert optimistic update on error
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
    let idToTrack: string = taskId; // Declare idToTrack here
    let originalTaskState: Task | undefined;
    
    try {
      let categoryColor: string | undefined;
      if (updates.category) categoryColor = categoriesMap.get(updates.category) || 'gray';

      originalTaskState = processedTasks.find(t => t.id === taskId);

      if (originalTaskState && originalTaskState.id.startsWith('virtual-')) {
        // This is a virtual task that needs to become a real one.
        const virtualTask = originalTaskState;
        
        const newInstanceId = uuidv4();
        idToTrack = newInstanceId;
        inFlightUpdatesRef.current.add(newInstanceId);

        const newInstanceData: Omit<Task, 'category_color'> = {
            id: newInstanceId,
            user_id: userId,
            description: updates.description !== undefined ? updates.description : virtualTask.description,
            status: updates.status ?? virtualTask.status,
            recurring_type: 'none' as const, // New instance is no longer recurring
            created_at: virtualTask.created_at, // Keep original creation date for consistency
            updated_at: new Date().toISOString(),
            completed_at: (updates.status === 'completed' || updates.status === 'archived') ? new Date().toISOString() : null, // Set completed_at for new instance
            category: updates.category !== undefined ? updates.category : virtualTask.category,
            priority: updates.priority !== undefined ? updates.priority : virtualTask.priority,
            due_date: updates.due_date !== undefined ? updates.due_date : virtualTask.due_date,
            notes: updates.notes !== undefined ? updates.notes : virtualTask.notes,
            remind_at: updates.remind_at !== undefined ? updates.remind_at : virtualTask.remind_at,
            section_id: updates.section_id !== undefined ? updates.section_id : virtualTask.section_id,
            order: virtualTask.order, // Placeholder order
            original_task_id: virtualTask.original_task_id || virtualTask.id.replace(/^virtual-/, '').split(/-\d{4}-\d{2}-\d{2}$/)[0],
            parent_task_id: virtualTask.parent_task_id,
            link: updates.link !== undefined ? updates.link : virtualTask.link,
            image_url: updates.image_url !== undefined ? updates.image_url : virtualTask.image_url,
        };

        // Optimistic update for new instance
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
            invalidateTasksQueries(); // Revert optimistic update
            return null;
        }
        showSuccess('Task created from recurring template!');
        invalidateTasksQueries();
        if (dbTask.remind_at && dbTask.status === 'to-do') {
            const d = parseISO(dbTask.remind_at);
            if (isValid(d)) addReminder(dbTask.id, `Reminder: ${dbTask.description}`, d);
        }
        return dbTask.id; // Return the new real ID
      } else if (!originalTaskState) {
        // Task not found (and not a virtual task that was found). This is an error.
        showError('Task not found for update.');
        return null;
      }

      // If we reach here, originalTaskState is a real task, proceed with update.
      const currentStatus = originalTaskState.status;
      const newStatus = updates.status;
      const now = new Date().toISOString();
      
      let completedAtUpdate: string | null | undefined = originalTaskState.completed_at;

      const wasCompletedOrArchived = currentStatus === 'completed' || currentStatus === 'archived';
      const willBeCompletedOrArchived = newStatus === 'completed' || newStatus === 'archived';

      if (willBeCompletedOrArchived && !wasCompletedOrArchived) {
        completedAtUpdate = now; // Task is becoming completed/archived
      } else if (!willBeCompletedOrArchived && wasCompletedOrArchived) {
        completedAtUpdate = null; // Task is no longer completed/archived
      }
      // If both are true or both are false, completedAtUpdate retains its original value.

      const finalUpdates = { ...updates, completed_at: completedAtUpdate };

      // Optimistic update for existing task
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
      invalidateTasksQueries(); // Invalidate to refetch and ensure consistency

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
      invalidateTasksQueries(); // Revert optimistic update on error
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
      // Optimistic update
      queryClient.setQueryData(['tasks', userId], (oldTasks: Task[] | undefined) => {
        return oldTasks?.filter(t => !idsToDelete.includes(t.id)) || [];
      });

      const { error } = await supabase.from('tasks').delete().in('id', idsToDelete).eq('user_id', userId).select('id');
      if (error) throw error;
      showSuccess('Task(s) deleted!');
      idsToDelete.forEach(dismissReminder);
      invalidateTasksQueries(); // Invalidate to ensure consistency
    } catch (e: any) {
      showError('Failed to delete task.');
      console.error(`useTasks: Error deleting task(s) from DB:`, e.message);
      invalidateTasksQueries(); // Revert optimistic update on error
    } finally {
      setTimeout(() => {
        idsToDelete.forEach(id => inFlightUpdatesRef.current.delete(id));
      }, 1500);
    }
  }, [userId, processedTasks, dismissReminder, queryClient, invalidateTasksQueries]);

  const bulkUpdateTasks = useCallback(async (updates: Partial<Task>, ids: string[]) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    if (ids.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    
    const updatesWithCompletedAt = { ...updates };
    if (updates.status && (updates.status === 'completed' || updates.status === 'archived')) {
      updatesWithCompletedAt.completed_at = now;
    } else if (updates.status && !['completed', 'archived'].includes(updates.status)) { // Corrected type comparison
      updatesWithCompletedAt.completed_at = null;
    }

    ids.forEach(id => inFlightUpdatesRef.current.add(id));
    // Optimistic update
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
      invalidateTasksQueries(); // Invalidate to ensure consistency
    } catch (e: any) {
      showError('Failed to update tasks.');
      console.error(`useTasks: Error during bulk update for tasks ${ids.join(', ')}:`, e.message);
      invalidateTasksQueries(); // Revert optimistic update on error
    } finally {
      setTimeout(() => {
        ids.forEach(id => inFlightUpdatesRef.current.delete(id));
      }, 1500);
    }
  }, [userId, queryClient, invalidateTasksQueries]);

  const bulkDeleteTasks = useCallback(async (ids: string[]) => {
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
      // Optimistic update
      queryClient.setQueryData(['tasks', userId], (oldTasks: Task[] | undefined) => {
        return oldTasks?.filter(t => !ids.includes(t.id)) || [];
      });

      const { error } = await supabase.from('tasks').delete().in('id', ids).eq('user_id', userId);
      if (error) throw error;

      showSuccess(`${ids.length} task(s) deleted!`);
      ids.forEach(dismissReminder);
      invalidateTasksQueries(); // Invalidate to ensure consistency
      return true;
    } catch (e: any) {
      showError('Failed to delete tasks.');
      console.error(`useTasks: Error during bulk delete for tasks ${ids.join(', ')}:`, e.message);
      invalidateTasksQueries(); // Revert optimistic update on error
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
    const tempSectionId = uuidv4(); // Declare tempSectionId here
    inFlightUpdatesRef.current.add(tempSectionId);
    try {
      // Optimistic update
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
      invalidateSectionsQueries(); // Invalidate to refetch and get correct ID/order
    } catch (e: any) {
      showError('Failed to create section.');
      console.error('useTasks: Error creating section:', e.message);
      invalidateSectionsQueries(); // Revert optimistic update on error
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
    // Optimistic update
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
      invalidateSectionsQueries(); // Invalidate to ensure consistency
    } catch (e: any) {
      showError('Failed to update section.');
      console.error(`useTasks: Error updating section ${sectionId}:`, e.message);
      invalidateSectionsQueries(); // Revert optimistic update on error
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
    // Optimistic update
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
      invalidateSectionsQueries(); // Invalidate sections
      invalidateTasksQueries(); // Invalidate tasks as well
    }
    catch (e: any) {
      showError('Failed to delete section.');
      console.error(`useTasks: Error deleting section ${sectionId}:`, e.message);
      invalidateSectionsQueries(); // Revert optimistic update on error
      invalidateTasksQueries(); // Revert optimistic update on error
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
    // Optimistic update
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
      invalidateSectionsQueries(); // Invalidate to ensure consistency
    } catch (e: any) {
      showError('Failed to update focus mode setting.');
      console.error(`useTasks: Error updating focus mode for section ${sectionId}:`, e.message);
      invalidateSectionsQueries(); // Revert optimistic update on error
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

    // Optimistic update
    queryClient.setQueryData(['task_sections', userId], newOrderedSections);

    try {
      const { error } = await supabase.rpc('update_sections_order', { updates: updates });
      if (error) throw error;
      showSuccess('Sections reordered!');
      invalidateSectionsQueries(); // Invalidate to ensure consistency
    } catch (e: any) {
      showError('Failed to reorder sections.');
      console.error('useTasks: Error reordering sections:', e.message);
      invalidateSectionsQueries(); // Revert optimistic update on error
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
            recurring_type: 'none' as const, // New instance is no longer recurring
            created_at: virtualTask.created_at, // Keep original creation date for consistency
            updated_at: new Date().toISOString(),
            completed_at: null, // New instance is not completed
            category: virtualTask.category,
            priority: virtualTask.priority,
            due_date: virtualTask.due_date,
            notes: virtualTask.notes,
            remind_at: virtualTask.remind_at,
            section_id: newSectionId,
            order: virtualTask.order, // Placeholder order
            original_task_id: virtualTask.original_task_id || virtualTask.id.replace(/^virtual-/, '').split(/-\d{4}-\d{2}-\d{2}$/)[0],
            parent_task_id: virtualTask.parent_task_id,
            link: virtualTask.link,
            image_url: virtualTask.image_url,
        };

        // Optimistic update for new instance
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
            invalidateTasksQueries(); // Revert optimistic update
            return;
        }
        showSuccess('Task created from recurring template!');
        invalidateTasksQueries();
        if (dbTask.remind_at && dbTask.status === 'to-do') {
            const d = parseISO(dbTask.remind_at);
            if (isValid(d)) addReminder(dbTask.id, `Reminder: ${dbTask.description}`, d);
        }
        return; // Exit early as new instance is handled
    } else {
        activeTask = processedTasks.find(t => t.id === finalActiveId);
    }

    if (!activeTask) {
        console.error('[DnD Error] Active task could not be found or created:', finalActiveId);
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
    
    let insertIndex = overIndex;
    if (overIndex === -1) { // Dropped into empty space or at the very end
        insertIndex = destinationSiblings.length;
    } else if (isDraggingDown) { // Dropped over an item, dragging down
        insertIndex = overIndex + 1;
    }
    // If dragging up, insertIndex remains overIndex

    const newDestinationSiblings = [...destinationSiblings];
    newDestinationSiblings.splice(insertIndex, 0, { ...activeTask, parent_task_id: newParentId, section_id: newSectionId });

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
    // Optimistic update
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
        invalidateTasksQueries(); // Invalidate to ensure consistency
    } catch (e: any) {
        showError(`Failed to move task: ${e.message}`);
        console.error('useTasks: Error moving task:', e.message);
        invalidateTasksQueries(); // Revert optimistic update on error
    } finally {
      setTimeout(() => {
        updatedIds.forEach(id => inFlightUpdatesRef.current.delete(id));
      }, 1500);
    }
  }, [userId, processedTasks, addReminder, queryClient, invalidateTasksQueries]);

  const finalFilteredTasks = useMemo(() => {
    let filtered = processedTasks;

    if (viewMode === 'daily') {
      filtered = filtered.filter(task => {
        // Condition 1: Was completed or archived today (based on local date part)
        if ((task.status === 'completed' || task.status === 'archived') && task.completed_at) { // Use completed_at
            const completedAtDate = new Date(task.completed_at); // Interprets UTC string in local timezone
            
            const isCompletedOnCurrentDate = (
                isValid(completedAtDate) &&
                completedAtDate.getFullYear() === effectiveCurrentDate.getFullYear() &&
                completedAtDate.getMonth() === effectiveCurrentDate.getMonth() &&
                completedAtDate.getDate() === effectiveCurrentDate.getDate()
            );
            
            console.log(`[TasksForToday Filter] Task: ${task.description}, Status: ${task.status}, Completed: ${task.completed_at}, CompletedAtLocal: ${completedAtDate.toLocaleString()}, CurrentDateLocal: ${effectiveCurrentDate.toLocaleString()}, IsCompletedOnCurrentDate: ${isCompletedOnCurrentDate}`);
            if (isCompletedOnCurrentDate) {
                return true;
            }
        }

        // Condition 2: Is a relevant 'to-do' task
        if (task.status === 'to-do') {
            const createdAt = startOfDay(parseISO(task.created_at));
            const dueDate = task.due_date ? startOfDay(parseISO(task.due_date)) : null;

            // Due on or before today
            if (dueDate && !isAfter(dueDate, todayStart)) {
                return true;
            }
            
            // No due date, created on or before today
            if (!dueDate && !isAfter(createdAt, todayStart)) {
                return true;
            }
        }

        return false;
      });
    }

    if (searchFilter) {
      filtered = filtered.filter(task =>
        task.description?.toLowerCase().includes(searchFilter.toLowerCase()) || // Added null check
        task.notes?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.link?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    if (viewMode === 'archive') {
      filtered = filtered.filter(task => task.status === 'archived');
    } else {
      if (statusFilter !== 'all') {
        filtered = filtered.filter(task => task.status === statusFilter);
      } else {
        filtered = filtered.filter(task => task.status !== 'archived');
      }
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(task => task.category === categoryFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    if (sectionFilter !== 'all') {
      if (sectionFilter === 'no-section') {
        filtered = filtered.filter(task => task.section_id === null);
      } else {
        filtered = filtered.filter(task => task.section_id === sectionFilter);
      }
    }

    if (userSettings && userSettings.future_tasks_days_visible !== -1 && viewMode === 'daily') {
      const visibilityDays = userSettings.future_tasks_days_visible;
      const today = startOfDay(effectiveCurrentDate);
      const futureLimit = addDays(today, visibilityDays);

      filtered = filtered.filter(task => {
        if (!task.due_date) {
          return true; // Always show tasks without a due date
        }
        const dueDate = startOfDay(parseISO(task.due_date));
        // Show if due date is today or in the past, or within the visibility window
        return !isAfter(dueDate, futureLimit);
      });
    }

    return filtered;
  }, [
    processedTasks,
    searchFilter,
    statusFilter,
    categoryFilter,
    priorityFilter,
    sectionFilter,
    viewMode,
    effectiveCurrentDate,
    userSettings,
    todayStart,
  ]);

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

  const nextAvailableTask = useMemo(() => {
    const focusedTaskId = userSettings?.focused_task_id;
    if (focusedTaskId) {
      const focusedTask = processedTasks.find(t => t.id === focusedTaskId);
      if (focusedTask && focusedTask.status === 'to-do' && (focusedTask.recurring_type !== 'none' || !doTodayOffIds.has(focusedTask.original_task_id || focusedTask.id))) {
        return focusedTask;
      }
    }

    const relevantTasks = processedTasks.filter(task =>
      task.status === 'to-do' &&
      task.parent_task_id === null &&
      (task.recurring_type !== 'none' || !doTodayOffIds.has(task.original_task_id || task.id))
    );

    const tasksBySection = new Map<string | null, Task[]>();
    relevantTasks.forEach(task => {
      const sectionId = task.section_id || null;
      if (!tasksBySection.has(sectionId)) {
        tasksBySection.set(sectionId, []);
      }
      tasksBySection.get(sectionId)!.push(task);
    });

    tasksBySection.forEach((tasksInSection) => {
      tasksInSection.sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    for (const section of sections) {
      const tasksInSection = tasksBySection.get(section.id);
      if (tasksInSection && tasksInSection.length > 0) {
        return tasksInSection[0];
      }
    }

    const tasksInNoSection = tasksBySection.get(null);
    if (tasksInNoSection && tasksInNoSection.length > 0) {
      return tasksInNoSection[0];
    }

    return null;
  }, [processedTasks, sections, userSettings?.focused_task_id, doTodayOffIds]);

  const toggleDoToday = useCallback(async (task: Task) => {
    if (!userId) {
      console.log("[Do Today Debug] User not authenticated.");
      showError('User not authenticated.');
      return;
    }
    const taskIdToLog = task.original_task_id || task.id;
    const formattedDate = format(effectiveCurrentDate, 'yyyy-MM-dd');
    const isCurrentlyOff = doTodayOffIds.has(taskIdToLog); // Corrected logic: `doTodayOffIds` stores tasks that are *off* for today

    console.log(`[Do Today Debug] Toggling task ${taskIdToLog}. Currently OFF: ${isCurrentlyOff}`);

    // Optimistic update
    queryClient.setQueryData(['do_today_off_log', userId, formattedDate], (oldSet: Set<string> | undefined) => {
        const newSet = new Set(oldSet || []);
        if (isCurrentlyOff) { // If it was OFF, we're turning it ON (remove from off_log)
            newSet.delete(taskIdToLog);
            console.log(`[Do Today Debug] Optimistically removing ${taskIdToLog} from off_log.`);
        } else { // If it was ON, we're turning it OFF (add to off_log)
            newSet.add(taskIdToLog);
            console.log(`[Do Today Debug] Optimistically adding ${taskIdToLog} to off_log.`);
        }
        return newSet;
    });

    try {
        if (isCurrentlyOff) { // If it was OFF, we're turning it ON (delete from off_log)
            const { error } = await supabase
                .from('do_today_off_log')
                .delete()
                .eq('user_id', userId)
                .eq('task_id', taskIdToLog)
                .eq('off_date', formattedDate);
            if (error) throw error;
            console.log(`[Do Today Debug] Supabase: Deleted ${taskIdToLog} from do_today_off_log.`);
        } else { // If it was ON, we're turning it OFF (insert into off_log)
            const { error } = await supabase
                .from('do_today_off_log')
                .insert({ user_id: userId, task_id: taskIdToLog, off_date: formattedDate });
            if (error) throw error;
            console.log(`[Do Today Debug] Supabase: Inserted ${taskIdToLog} into do_today_off_log.`);
        }
        // No success toast here, as it's a quick toggle
        invalidateTasksQueries(); // Invalidate tasks to re-evaluate `isDoToday` in filteredTasks
        queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] }); // Invalidate specific do_today_off_log query
        console.log(`[Do Today Debug] Queries invalidated.`);
    } catch (e: any) {
        showError("Failed to sync 'Do Today' setting.");
        console.error("[Do Today Debug] Error toggling Do Today:", e);
        invalidateTasksQueries(); // Revert optimistic update on error
        queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] }); // Revert optimistic update on error
    }
  }, [userId, effectiveCurrentDate, doTodayOffIds, queryClient, invalidateTasksQueries]);

  const toggleAllDoToday = useCallback(async () => {
    if (!userId) return;

    const nonRecurringTasks = finalFilteredTasks.filter(t => t.recurring_type === 'none');
    if (nonRecurringTasks.length === 0) {
      showSuccess("No non-recurring tasks to toggle.");
      return;
    }

    const nonRecurringTaskIds = nonRecurringTasks.map(t => t.original_task_id || t.id);
    const currentlyOnCount = nonRecurringTasks.filter(t => !doTodayOffIds.has(t.original_task_id || t.id)).length;
    const turnAllOff = currentlyOnCount > nonRecurringTasks.length / 2; // If more than half are ON, turn all OFF

    const formattedDate = format(effectiveCurrentDate, 'yyyy-MM-dd');
    
    // Optimistic update
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
        // Always delete all for the day first to simplify logic
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
        invalidateTasksQueries(); // Invalidate tasks to re-evaluate `isDoToday` in filteredTasks
        queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] }); // Invalidate specific do_today_off_log query
    } catch (e: any) {
        showError("Failed to sync 'Do Today' settings.");
        console.error("Error toggling all Do Today:", e);
        invalidateTasksQueries(); // Revert optimistic update on error
        queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, formattedDate] }); // Revert optimistic update on error
    }
  }, [userId, finalFilteredTasks, doTodayOffIds, effectiveCurrentDate, queryClient, invalidateTasksQueries]);

  const dailyProgress = useMemo(() => {
    if (viewMode !== 'daily') {
      return { totalPendingCount: 0, completedCount: 0, overdueCount: 0 };
    }

    console.log("Daily Progress Calculation for:", format(todayStart, 'yyyy-MM-dd'));
    console.log("Processed Tasks count:", processedTasks.length);

    const tasksForToday = processedTasks.filter(task => {
        // Condition 1: Was completed or archived today (based on local date part)
        if ((task.status === 'completed' || task.status === 'archived') && task.completed_at) { // Use completed_at
            const completedAtDate = new Date(task.completed_at); // Interprets UTC string in local timezone
            
            const isCompletedOnCurrentDate = (
                isValid(completedAtDate) &&
                completedAtDate.getFullYear() === effectiveCurrentDate.getFullYear() &&
                completedAtDate.getMonth() === effectiveCurrentDate.getMonth() &&
                completedAtDate.getDate() === effectiveCurrentDate.getDate()
            );
            
            console.log(`[TasksForToday Filter] Task: ${task.description}, Status: ${task.status}, Completed: ${task.completed_at}, CompletedAtLocal: ${completedAtDate.toLocaleString()}, CurrentDateLocal: ${effectiveCurrentDate.toLocaleString()}, IsCompletedOnCurrentDate: ${isCompletedOnCurrentDate}`);
            if (isCompletedOnCurrentDate) {
                return true;
            }
        }

        // Condition 2: Is a relevant 'to-do' task
        if (task.status === 'to-do') {
            const createdAt = startOfDay(parseISO(task.created_at));
            const dueDate = task.due_date ? startOfDay(parseISO(task.due_date)) : null;

            // Due on or before today
            if (dueDate && !isAfter(dueDate, todayStart)) {
                return true;
            }
            
            // No due date, created on or before today
            if (!dueDate && !isAfter(createdAt, todayStart)) {
                return true;
            }
        }

        return false;
    });

    console.log("Tasks relevant for today's progress (tasksForToday count):", tasksForToday.length);

    const focusModeSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));

    const focusTasks = tasksForToday.filter(t => {
      if (t.parent_task_id !== null) return false; // Only top-level tasks

      const isInFocusArea = t.section_id === null || focusModeSectionIds.has(t.section_id);
      const isDoToday = t.recurring_type !== 'none' || !doTodayOffIds.has(t.original_task_id || t.id);

      return isInFocusArea && isDoToday;
    });

    console.log("Focus tasks count:", focusTasks.length);

    const completedCount = focusTasks.filter(t => {
      const completedAtDate = t.completed_at ? new Date(t.completed_at) : null; // Use completed_at
      
      const isCompletedOnCurrentDate = (
          completedAtDate && isValid(completedAtDate) &&
          completedAtDate.getFullYear() === effectiveCurrentDate.getFullYear() &&
          completedAtDate.getMonth() === effectiveCurrentDate.getMonth() &&
          completedAtDate.getDate() === effectiveCurrentDate.getDate()
      );

      // Count tasks with status 'completed' OR 'archived' if completed today
      const isCompletedOrArchivedToday = (t.status === 'completed' || t.status === 'archived') && isCompletedOnCurrentDate;
      if (isCompletedOrArchivedToday) {
        console.log(`[Daily Progress Debug] Counting completed/archived task: ${t.description} (ID: ${t.id}, Status: ${t.status}, Completed: ${t.completed_at}), CompletedAtLocal: ${completedAtDate?.toLocaleString()}, CurrentDateLocal: ${effectiveCurrentDate.toLocaleString()}, IsCompletedOnCurrentDate: ${isCompletedOnCurrentDate}`);
      }
      return isCompletedOrArchivedToday;
    }).length;
    console.log("Completed count (from focusTasks):", completedCount);
    
    const totalPendingCount = focusTasks.filter(t => t.status === 'to-do').length;
    console.log("Pending count (from focusTasks):", totalPendingCount);

    const overdueCount = focusTasks.filter(t => {
      if (!t.due_date || t.status !== 'to-do') return false; // Only count 'to-do' tasks as overdue
      const due = parseISO(t.due_date);
      return isValid(due) && isBefore(startOfDay(due), startOfDay(todayStart));
    }).length;

    return { totalPendingCount, completedCount, overdueCount };
  }, [processedTasks, viewMode, sections, doTodayOffIds, todayStart, effectiveCurrentDate]);

  return {
    tasks: rawTasks, // Expose rawTasks for direct access if needed, but processedTasks is usually preferred
    processedTasks,
    filteredTasks: finalFilteredTasks,
    nextAvailableTask,
    loading,
    currentDate: effectiveCurrentDate, // Expose effectiveCurrentDate
    setCurrentDate: null, // No longer expose internal setter
    userId,
    handleAddTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    searchFilter,
    setSearchFilter,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    sectionFilter,
    setSectionFilter,
    sections,
    allCategories,
    updateTaskParentAndOrder,
    moveTask: () => Promise.resolve(),
    archiveAllCompletedTasks,
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    reorderSections,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
  };
};