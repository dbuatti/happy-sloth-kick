"use client";

import { useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError } from '@/utils/toast';
import { format, startOfDay } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

// Import types from the new types file
import { Task, TaskSection, Category, UseTasksOptions, TaskFilteringState, TaskFilteringSetters, DailyProgress, TaskMutationFunctions } from './tasks/types';

// Import the new modular hooks and utilities
import { useSections, useCategories, useDoTodayOffLog, useRawTasks } from './tasks/useTaskQueries';
import { useProcessedTasks } from './tasks/useTaskProcessing';
import { useTaskFiltering } from './tasks/useTaskFiltering';
import { useNextAvailableTask, useDailyProgress } from './tasks/useTaskSelectors';
import { useTaskMutations } from './tasks/useTaskMutations';
import { useSettings } from '@/context/SettingsContext';


export const useTasks = ({ currentDate, viewMode = 'daily', userId: propUserId }: UseTasksOptions) => {
  const { user, loading: authLoading } = useAuth();
  const userId = propUserId || user?.id;
  const { settings: userSettings } = useSettings();
  const queryClient = useQueryClient();

  const effectiveCurrentDate = currentDate;
  const todayStart = startOfDay(effectiveCurrentDate);

  // --- Data Fetching (using useTaskQueries) ---
  const { data: sections = [], isLoading: sectionsLoading, error: sectionsError } = useSections(userId, !authLoading);
  const { data: allCategories = [], isLoading: categoriesLoading, error: categoriesError } = useCategories(userId, !authLoading);
  const { data: doTodayOffIds = new Set(), isLoading: doTodayOffLoading, error: doTodayOffError } = useDoTodayOffLog(userId, effectiveCurrentDate, !authLoading);
  const { data: rawTasks = [], isLoading: rawTasksLoading, error: rawTasksError } = useRawTasks(userId, !authLoading);

  // Combine loading states
  const loading = authLoading || sectionsLoading || categoriesLoading || doTodayOffLoading || rawTasksLoading;

  // Handle errors from queries
  useEffect(() => {
    if (sectionsError || categoriesError || doTodayOffError || rawTasksError) {
      console.error('Error fetching task data:', sectionsError || categoriesError || doTodayOffError || rawTasksError);
      showError('Failed to load task data.');
    }
  }, [sectionsError, categoriesError, doTodayOffError, rawTasksError]);

  // Memoize categoriesMap for efficient lookup
  const categoriesMap = useMemo(() => {
    const map = new Map<string, string>();
    allCategories.forEach((c: Category) => map.set(c.id, c.color));
    return map;
  }, [allCategories]);

  // --- Data Processing (using useTaskProcessing) ---
  const processedTasks = useProcessedTasks({ rawTasks, categoriesMap, todayStart });

  // --- Filtering (using useTaskFiltering) ---
  const { filteredTasks, filteringState, filteringSetters } = useTaskFiltering({
    processedTasks,
    userSettings,
    options: { currentDate, viewMode, userId },
    doTodayOffIds,
  });

  // --- Selectors (using useTaskSelectors) ---
  const nextAvailableTask = useNextAvailableTask({ processedTasks, sections, userSettings, doTodayOffIds });
  const dailyProgress = useDailyProgress({ processedTasks, viewMode, sections, doTodayOffIds, todayStart });

  // --- Invalidation Callbacks for Mutations ---
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

  // --- Mutations (using useTaskMutations) ---
  const {
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
  }: TaskMutationFunctions = useTaskMutations({
    userId,
    processedTasks,
    sections,
    allCategories,
    categoriesMap,
    invalidateTasksQueries,
    invalidateSectionsQueries,
    invalidateCategoriesQueries,
    effectiveCurrentDate,
    doTodayOffIds, // Pass doTodayOffIds to mutations
  });

  // --- Real-time Subscriptions ---
  useEffect(() => {
    if (!userId) return;

    const tasksChannel = supabase
      .channel('tasks_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        (payload) => {
          // Only invalidate if the change wasn't initiated by this client's optimistic update
          // We don't need to check inFlightUpdatesRef here because useTaskMutations already handles it
          // and react-query's invalidateQueries will correctly refetch and reconcile.
          invalidateTasksQueries();
        }
      )
      .subscribe();

    const sectionsChannel = supabase
      .channel('sections_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_sections', filter: `user_id=eq.${userId}` },
        (payload) => {
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
  }, [userId, invalidateTasksQueries, invalidateSectionsQueries, invalidateCategoriesQueries, queryClient, effectiveCurrentDate]);


  return {
    tasks: rawTasks, // Raw tasks from DB
    processedTasks, // Tasks after client-side processing (e.g., virtual recurring tasks)
    filteredTasks, // Tasks after applying all filters
    nextAvailableTask,
    loading,
    currentDate: effectiveCurrentDate,
    userId,
    sections,
    allCategories,
    doTodayOffIds,
    dailyProgress,
    
    // Exposed filter state and setters
    searchFilter: filteringState.searchFilter,
    setSearchFilter: filteringSetters.setSearchFilter,
    statusFilter: filteringState.statusFilter,
    setStatusFilter: filteringSetters.setStatusFilter,
    categoryFilter: filteringState.categoryFilter,
    setCategoryFilter: filteringSetters.setCategoryFilter,
    priorityFilter: filteringState.priorityFilter,
    setPriorityFilter: filteringSetters.setPriorityFilter,
    sectionFilter: filteringState.sectionFilter,
    setSectionFilter: filteringSetters.setSectionFilter,

    // Exposed mutation functions
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