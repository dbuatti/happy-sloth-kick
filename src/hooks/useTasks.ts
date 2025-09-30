"use client";

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { parseISO, isValid, format, startOfDay, isBefore, isSameDay } from 'date-fns';
import { arrayMove } from '@dnd-kit/sortable';
import { useSettings } from '@/context/SettingsContext';
import { useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import { fetchSections, fetchCategories, fetchDoTodayOffLog, fetchTasks, fetchRecurringTaskCompletionLog } from '@/integrations/supabase/queries';
import {
  addTaskMutation,
  updateTaskMutation,
  deleteTaskMutation,
  bulkUpdateTasksMutation,
  bulkDeleteTasksMutation,
  archiveAllCompletedTasksMutation,
  markAllTasksInSectionCompletedMutation,
  updateTaskParentAndOrderMutation,
  toggleDoTodayMutation,
  toggleAllDoTodayMutation,
} from '@/integrations/supabase/taskMutations';
import {
  createSectionMutation,
  updateSectionMutation,
  deleteSectionMutation,
  updateSectionIncludeInFocusModeMutation,
  reorderSectionsMutation,
} from '@/integrations/supabase/sectionMutations';
import { useTaskProcessing } from './useTaskProcessing';
import { useAuth } from '@/context/AuthContext';
import { useReminders } from '@/context/ReminderContext'; // Ensure this is imported

export interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  user_id: string;
  category: string | null;
  category_color: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | string;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number | null;
  original_task_id: string | null;
  parent_task_id: string | null;
  link: string | null;
  image_url: string | null; // Added image_url
  isDoTodayOff?: boolean; // Added for UI styling
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

export type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'category_color' | 'isDoTodayOff'>>;

export interface NewTaskData {
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
  image_url?: string | null; // Added image_url
  order?: number | null;
}

export interface MutationContext {
  userId: string;
  queryClient: QueryClient;
  inFlightUpdatesRef: React.MutableRefObject<Set<string>>;
  categoriesMap: Map<string, string>;
  invalidateTasksQueries: () => void;
  invalidateSectionsQueries: () => void;
  invalidateCategoriesQueries: () => void;
  processedTasks: Task[];
  sections: TaskSection[];
  scheduleReminder: (id: string, message: string, date: Date) => void;
  cancelReminder: (id: string) => void;
  currentDate: Date; // Added currentDate to MutationContext
}

interface UseTasksProps {
  currentDate: Date;
  viewMode?: 'daily' | 'archive' | 'focus';
  userId?: string;
  searchFilter?: string;
  statusFilter?: string;
  categoryFilter?: string;
  priorityFilter?: string;
  sectionFilter?: string;
}

export const useTasks = ({ currentDate, viewMode = 'daily', userId: propUserId, searchFilter = '', statusFilter = 'all', categoryFilter = 'all', priorityFilter = 'all', sectionFilter = 'all' }: UseTasksProps) => {
  const { user, loading: authLoading } = useAuth();
  const userId = propUserId ?? user?.id ?? undefined;
  const { settings: userSettings, updateSettings } = useSettings();
  const { scheduleReminder, cancelReminder } = useReminders();
  const queryClient = useQueryClient();

  const inFlightUpdatesRef = useRef<Set<string>>(new Set());

  const effectiveCurrentDate = currentDate;
  const todayStart = startOfDay(effectiveCurrentDate);

  const { data: sections = [], isLoading: sectionsLoading } = useQuery<TaskSection[], Error>({
    queryKey: ['task_sections', userId],
    queryFn: () => fetchSections(userId!),
    enabled: !!userId && !authLoading,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allCategories = [], isLoading: categoriesLoading } = useQuery<Category[], Error>({
    queryKey: ['task_categories', userId],
    queryFn: () => fetchCategories(userId!),
    enabled: !!userId && !authLoading,
    staleTime: 5 * 60 * 1000,
  });

  const { data: doTodayOffIds = new Set(), isLoading: doTodayOffLoading } = useQuery<Set<string>, Error>({
    queryKey: ['do_today_off_log', userId, format(effectiveCurrentDate, 'yyyy-MM-dd')],
    queryFn: () => fetchDoTodayOffLog(userId!, effectiveCurrentDate),
    enabled: !!userId && !authLoading,
    staleTime: 60 * 1000,
  });

  const { data: recurringTaskCompletions = new Set(), isLoading: recurringCompletionsLoading } = useQuery<Set<string>, Error>({
    queryKey: ['recurring_task_completion_log', userId, format(effectiveCurrentDate, 'yyyy-MM-dd')],
    queryFn: () => fetchRecurringTaskCompletionLog(userId!, effectiveCurrentDate),
    enabled: !!userId && !authLoading,
    staleTime: 60 * 1000,
  });

  const { data: rawTasks = [], isLoading: tasksLoading } = useQuery<Omit<Task, 'category_color'>[], Error>({
    queryKey: ['tasks', userId],
    queryFn: () => fetchTasks(userId!),
    enabled: !!userId && !authLoading,
    staleTime: 60 * 1000,
  });

  // --- NEW LOGGING ADDED HERE ---
  useEffect(() => {
    const targetTaskId = '6cd9980b-8151-4699-a789-1ed0443a552c'; // ID of "Sit in the sun"
    const targetOriginalTaskId = 'ce692f51-a1d7-4b00-bb26-2b30b0042f19'; // Original ID if it's an instance

    console.log("[useTasks] Query userId:", userId);
    console.log("[useTasks] Raw tasks fetched (count):", rawTasks.length);
    console.log("[useTasks] Raw tasks contains target task (Sit in the sun) ID:", rawTasks.some(t => t.id === targetTaskId));
    console.log("[useTasks] Raw tasks contains target task (Sit in the sun) original_task_id:", rawTasks.some(t => t.original_task_id === targetOriginalTaskId));
    // console.log("[useTasks] Full raw tasks array:", rawTasks); // Uncomment this if you need to inspect the full array
  }, [userId, rawTasks]);
  // --- END NEW LOGGING ---

  const loading = authLoading || sectionsLoading || categoriesLoading || doTodayOffLoading || recurringCompletionsLoading || tasksLoading;

  const categoriesMap = useMemo(() => {
    const map = new Map<string, string>();
    allCategories.forEach(c => map.set(c.id, c.color));
    return map;
  }, [allCategories]);

  const invalidateTasksQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
    queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId] });
    queryClient.invalidateQueries({ queryKey: ['recurring_task_completion_log', userId] }); // Invalidate this too
    queryClient.invalidateQueries({ queryKey: ['dailyTaskCount', userId] });
  }, [queryClient, userId]);

  const invalidateSectionsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['task_sections', userId] });
    queryClient.invalidateQueries({ queryKey: ['dailyTaskCount', userId] });
  }, [queryClient, userId]);

  const invalidateCategoriesQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['task_categories', userId] });
  }, [queryClient, userId]);

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
          
          invalidateTasksQueries();
          if (payload.eventType === 'UPDATE') {
            if (newOrOldTask.remind_at && newOrOldTask.status === 'to-do') {
              const d = parseISO(newOrOldTask.remind_at);
              if (isValid(d)) scheduleReminder(newOrOldTask.id, `Reminder: ${newOrOldTask.description}`, d);
            } else if (newOrOldTask.status === 'completed' || newOrOldTask.status === 'archived' || newOrOldTask.remind_at === null) {
              cancelReminder(newOrOldTask.id);
            }
          } else if (payload.eventType === 'DELETE') {
            cancelReminder(newOrOldTask.id);
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
            invalidateTasksQueries();
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
            invalidateTasksQueries();
          }
        }
      )
      .subscribe();

    const doTodayOffLogChannel = supabase
      .channel('do_today_off_log_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'do_today_off_log', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId, format(effectiveCurrentDate, 'yyyy-MM-dd')] });
          invalidateTasksQueries();
        }
      )
      .subscribe();

    const recurringCompletionChannel = supabase
      .channel('recurring_completion_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recurring_task_completion_log', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['recurring_task_completion_log', userId, format(effectiveCurrentDate, 'yyyy-MM-dd')] });
          invalidateTasksQueries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(sectionsChannel);
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(doTodayOffLogChannel);
      supabase.removeChannel(recurringCompletionChannel);
    };
  }, [userId, scheduleReminder, cancelReminder, invalidateTasksQueries, invalidateSectionsQueries, invalidateCategoriesQueries, queryClient, effectiveCurrentDate]);

  const { processedTasks, filteredTasks: finalFilteredTasks } = useTaskProcessing({
    rawTasks,
    categoriesMap,
    effectiveCurrentDate,
    viewMode,
    searchFilter,
    statusFilter,
    categoryFilter,
    priorityFilter,
    sectionFilter,
    userSettings,
    sections,
    doTodayOffIds,
    recurringTaskCompletions, // Pass recurringTaskCompletions here
  });

  const mutationContext: MutationContext = useMemo(() => ({
    userId: userId!,
    queryClient,
    inFlightUpdatesRef,
    categoriesMap,
    invalidateTasksQueries,
    invalidateSectionsQueries,
    invalidateCategoriesQueries,
    processedTasks,
    sections,
    scheduleReminder,
    cancelReminder,
    currentDate: effectiveCurrentDate, // Pass currentDate here
  }), [userId, queryClient, inFlightUpdatesRef, categoriesMap, invalidateTasksQueries, invalidateSectionsQueries, invalidateCategoriesQueries, processedTasks, sections, scheduleReminder, cancelReminder, effectiveCurrentDate]);

  const handleAddTask = useCallback(async (newTaskData: NewTaskData) => {
    if (!userId) { showError('User not authenticated.'); return false; }
    const dataWithDefaults: NewTaskData = { // Corrected type here
      ...newTaskData,
      description: newTaskData.description || '',
      status: newTaskData.status || 'to-do',
      recurring_type: newTaskData.recurring_type || 'none',
      category: newTaskData.category || 'general',
      priority: newTaskData.priority ?? 'medium',
      due_date: newTaskData.due_date ?? null,
      notes: newTaskData.notes ?? null,
      remind_at: newTaskData.remind_at ?? null,
      section_id: newTaskData.section_id ?? null,
      parent_task_id: newTaskData.parent_task_id ?? null,
      original_task_id: newTaskData.original_task_id ?? null,
      created_at: newTaskData.created_at ?? new Date().toISOString(),
      link: newTaskData.link ?? null,
      image_url: newTaskData.image_url ?? null,
      order: newTaskData.order ?? null,
    };
    return addTaskMutation(dataWithDefaults, mutationContext);
  }, [userId, mutationContext]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>): Promise<string | null> => {
    if (!userId) { showError('User not authenticated.'); return null; }
    return updateTaskMutation(taskId, updates, mutationContext);
  }, [userId, mutationContext]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!userId) { showError('User not authenticated.'); return; }
    return deleteTaskMutation(taskId, mutationContext);
  }, [userId, mutationContext]);

  const bulkUpdateTasks = useCallback(async (updates: Partial<Task>, ids: string[]) => {
    if (!userId) { showError('User not authenticated.'); return; }
    return bulkUpdateTasksMutation(updates, ids, mutationContext);
  }, [userId, mutationContext]);

  const bulkDeleteTasks = useCallback(async (ids: string[]) => {
    if (!userId) { showError('User not authenticated.'); return false; }
    return bulkDeleteTasksMutation(ids, mutationContext);
  }, [userId, mutationContext]);

  const archiveAllCompletedTasks = useCallback(async () => {
    if (!userId) { showError('User not authenticated.'); return; }
    return archiveAllCompletedTasksMutation(mutationContext);
  }, [userId, mutationContext]);

  const markAllTasksInSectionCompleted = useCallback(async (sectionId: string | null) => {
    if (!userId) { showError('User not authenticated.'); return; }
    return markAllTasksInSectionCompletedMutation(sectionId, mutationContext);
  }, [userId, mutationContext]);

  const createSection = useCallback(async (name: string) => {
    if (!userId) { showError('User not authenticated.'); return; }
    return createSectionMutation(name, mutationContext);
  }, [userId, mutationContext]);

  const updateSection = useCallback(async (sectionId: string, newName: string) => {
    if (!userId) { showError('User not authenticated.'); return; }
    return updateSectionMutation(sectionId, newName, mutationContext);
  }, [userId, mutationContext]);

  const deleteSection = useCallback(async (sectionId: string) => {
    if (!userId) { showError('User not authenticated.'); return; }
    return deleteSectionMutation(sectionId, mutationContext);
  }, [userId, mutationContext]);

  const updateSectionIncludeInFocusMode = useCallback(async (sectionId: string, include: boolean) => {
    if (!userId) { showError('User not authenticated.'); return; }
    return updateSectionIncludeInFocusModeMutation(sectionId, include, mutationContext);
  }, [userId, mutationContext]);

  const reorderSections = useCallback(async (activeId: string, overId: string) => {
    if (!userId) { showError('User not authenticated.'); return; }
    const oldIndex = sections.findIndex(s => s.id === activeId);
    const newIndex = sections.findIndex(s => s.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrderedSections = arrayMove(sections, oldIndex, newIndex);
    return reorderSectionsMutation(activeId, newOrderedSections, mutationContext);
  }, [userId, sections, mutationContext]);

  const updateTaskParentAndOrder = useCallback(async (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null, isDraggingDown: boolean) => {
    if (!userId) { showError('User not authenticated.'); return; }
    return updateTaskParentAndOrderMutation(activeId, newParentId, newSectionId, overId, isDraggingDown, mutationContext);
  }, [userId, mutationContext]);

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
    if (!userId) { showError('User not authenticated.'); return; }
    return toggleDoTodayMutation(task, effectiveCurrentDate, doTodayOffIds, mutationContext);
  }, [userId, effectiveCurrentDate, doTodayOffIds, mutationContext]);

  const toggleAllDoToday = useCallback(async (filteredTasks: Task[]) => { // Added filteredTasks as argument
    if (!userId) { showError('User not authenticated.'); return; }
    return toggleAllDoTodayMutation(filteredTasks, effectiveCurrentDate, doTodayOffIds, mutationContext);
  }, [userId, effectiveCurrentDate, doTodayOffIds, mutationContext]);

  const dailyProgress = useMemo(() => {
    if (viewMode !== 'daily') {
      return { totalPendingCount: 0, completedCount: 0, overdueCount: 0 };
    }

    const tasksForToday = processedTasks.filter(task => {
        if ((task.status === 'completed' || task.status === 'archived') && task.completed_at) {
            const completedAtDate = parseISO(task.completed_at);
            
            const isCompletedOnCurrentDate = (
                completedAtDate && isValid(completedAtDate) &&
                isSameDay(completedAtDate, effectiveCurrentDate)
            );
            
            if (isCompletedOnCurrentDate) {
                return true;
            }
        }

        if (task.status === 'to-do') {
            return true; 
        }
        return false;
    });

    const focusModeSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));

    const focusTasks = tasksForToday.filter(t => {
      if (t.parent_task_id !== null) return false;

      const isInFocusArea = t.section_id === null || focusModeSectionIds.has(t.section_id);
      const isDoToday = t.recurring_type !== 'none' || !doTodayOffIds.has(t.original_task_id || t.id);

      return isInFocusArea && isDoToday;
    });

    const completedCount = focusTasks.filter(t => {
      const completedAtDate = t.completed_at ? parseISO(t.completed_at) : null;
      
      const isCompletedOnCurrentDate = (
          completedAtDate && isValid(completedAtDate) &&
          isSameDay(completedAtDate, effectiveCurrentDate)
      );

      const isCompletedOrArchivedToday = (t.status === 'completed' || t.status === 'archived') && isCompletedOnCurrentDate;
      return isCompletedOrArchivedToday;
    }).length;
    
    const totalPendingCount = focusTasks.filter(t => t.status === 'to-do').length;

    const overdueCount = focusTasks.filter(t => {
      if (!t.due_date || t.status !== 'to-do') return false;
      const due = parseISO(t.due_date);
      return isValid(due) && isBefore(startOfDay(due), startOfDay(todayStart));
    }).length;

    return { totalPendingCount, completedCount, overdueCount };
  }, [processedTasks, viewMode, sections, doTodayOffIds, todayStart, effectiveCurrentDate]);

  return {
    tasks: rawTasks,
    processedTasks,
    filteredTasks: finalFilteredTasks,
    nextAvailableTask,
    loading,
    currentDate: effectiveCurrentDate,
    userId,
    handleAddTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    searchFilter,
    statusFilter,
    categoryFilter,
    priorityFilter,
    sectionFilter,
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