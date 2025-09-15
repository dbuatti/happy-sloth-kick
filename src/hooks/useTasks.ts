"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useReminders } from '@/context/ReminderContext';
import { parseISO, isValid, format, startOfDay, isAfter, isBefore } from 'date-fns';
import { arrayMove } from '@dnd-kit/sortable';
import { useSettings } from '@/context/SettingsContext';
import { useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import { fetchSections, fetchCategories, fetchDoTodayOffLog, fetchTasks } from '@/integrations/supabase/queries';
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
import { useTaskProcessing } from './useTaskProcessing'; // Import the new hook
import { useAuth } from '@/context/AuthContext'; // Import useAuth

export interface Task {
  id: string;
  description: string | null;
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
  order?: number | null; // Added order as optional
}

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
  bulkUpdateTasksMutation: (updates: Partial<Task>, ids: string[], context: Omit<MutationContext, 'bulkUpdateTasksMutation'>) => Promise<void>;
}

interface UseTasksProps {
  currentDate: Date;
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

  const { data: rawTasks = [], isLoading: tasksLoading } = useQuery<Omit<Task, 'category_color'>[], Error>({
    queryKey: ['tasks', userId],
    queryFn: () => fetchTasks(userId!),
    enabled: !!userId && !authLoading,
    staleTime: 60 * 1000,
  });

  const loading = authLoading || sectionsLoading || categoriesLoading || doTodayOffLoading || tasksLoading;

  const categoriesMap = useMemo(() => {
    const map = new Map<string, string>();
    allCategories.forEach(c => map.set(c.id, c.color));
    return map;
  }, [allCategories]);

  const invalidateTasksQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
    queryClient.invalidateQueries({ queryKey: ['do_today_off_log', userId] });
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

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(sectionsChannel);
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(doTodayOffLogChannel);
    };
  }, [userId, addReminder, dismissReminder, invalidateTasksQueries, invalidateSectionsQueries, invalidateCategoriesQueries, queryClient, effectiveCurrentDate]);

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
    addReminder,
    dismissReminder,
    bulkUpdateTasksMutation, // Pass the mutation function itself
  }), [userId, queryClient, inFlightUpdatesRef, categoriesMap, invalidateTasksQueries, invalidateSectionsQueries, invalidateCategoriesQueries, processedTasks, sections, addReminder, dismissReminder]);

  const handleAddTask = useCallback(async (newTaskData: NewTaskData) => {
    if (!userId) { showError('User not authenticated.'); return false; }
    // Ensure status and recurring_type are explicitly set for addTaskMutation
    const dataWithDefaults: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'category_color'> & { order?: number | null } = {
      ...newTaskData,
      status: newTaskData.status || 'to-do',
      recurring_type: newTaskData.recurring_type || 'none',
      category: newTaskData.category || 'general', // Ensure category is not null
    };
    return addTaskMutation(dataWithDefaults, mutationContext);
  }, [userId, mutationContext]);

  const updateTask = useCallback(async (taskId: string, updates: TaskUpdate): Promise<string | null> => {
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
    return reorderSectionsMutation(activeId, overId, newOrderedSections, mutationContext);
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

  const toggleAllDoToday = useCallback(async () => {
    if (!userId) { showError('User not authenticated.'); return; }
    return toggleAllDoTodayMutation(finalFilteredTasks, effectiveCurrentDate, doTodayOffIds, mutationContext);
  }, [userId, finalFilteredTasks, effectiveCurrentDate, doTodayOffIds, mutationContext]);

  const dailyProgress = useMemo(() => {
    if (viewMode !== 'daily') {
      return { totalPendingCount: 0, completedCount: 0, overdueCount: 0 };
    }

    const tasksForToday = processedTasks.filter(task => {
        if ((task.status === 'completed' || task.status === 'archived') && task.completed_at) {
            const completedAtDate = new Date(task.completed_at);
            
            const isCompletedOnCurrentDate = (
                isValid(completedAtDate) &&
                completedAtDate.getFullYear() === effectiveCurrentDate.getFullYear() &&
                completedAtDate.getMonth() === effectiveCurrentDate.getMonth() &&
                completedAtDate.getDate() === effectiveCurrentDate.getDate()
            );
            
            if (isCompletedOnCurrentDate) {
                return true;
            }
        }

        if (task.status === 'to-do') {
            const createdAt = startOfDay(parseISO(task.created_at));
            const dueDate = task.due_date ? startOfDay(parseISO(task.due_date)) : null;

            if (dueDate && !isAfter(dueDate, todayStart)) {
                return true;
            }
            
            if (!dueDate && !isAfter(createdAt, todayStart)) {
                return true;
            }
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
      const completedAtDate = t.completed_at ? new Date(t.completed_at) : null;
      
      const isCompletedOnCurrentDate = (
          completedAtDate && isValid(completedAtDate) &&
          completedAtDate.getFullYear() === effectiveCurrentDate.getFullYear() &&
          completedAtDate.getMonth() === effectiveCurrentDate.getMonth() &&
          completedAtDate.getDate() === effectiveCurrentDate.getDate()
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