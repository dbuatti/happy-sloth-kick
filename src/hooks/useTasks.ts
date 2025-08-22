import { useState, useCallback, useMemo } from 'react';
import {
  Task,
  TaskSection,
  TaskCategory,
  DoTodayOffLog,
  TaskStatus,
  RecurringType,
  TaskPriority,
  DailyTaskCount,
} from '@/types/task';
import { useAuth } from '@/context/AuthContext';
import {
  fetchTasks,
  addTask,
  updateTask,
  deleteTask,
  bulkUpdateTasks,
  reorderTasks,
  fetchSections,
  createSection,
  updateSection,
  deleteSection,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchDoTodayOffLog,
  addDoTodayOffLog,
  deleteDoTodayOffLog,
} from '@/integrations/supabase/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isSameDay, startOfDay, parseISO } from 'date-fns';
import { showError, showSuccess } from '@/utils/toast';
import { useDailyTaskCount } from './useDailyTaskCount';

interface UseTasksOptions {
  viewMode?: 'all' | 'focus' | 'archive' | 'today';
  userId?: string | null;
  currentDate?: Date;
}

export const useTasks = ({
  viewMode = 'all',
  userId: propUserId,
  currentDate = new Date(),
}: UseTasksOptions = {}) => {
  const { user } = useAuth();
  const activeUserId = propUserId || user?.id;
  const queryClient = useQueryClient();

  // State for filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all' | null>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [sectionFilter, setSectionFilter] = useState<string | 'all' | null>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');


  const tasksQueryKey = ['tasks', activeUserId, viewMode, currentDate.toISOString().split('T')[0]];
  const sectionsQueryKey = ['sections', activeUserId];
  const categoriesQueryKey = ['categories', activeUserId];
  const doTodayOffLogQueryKey = ['doTodayOffLog', activeUserId, currentDate.toISOString().split('T')[0]];

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksError,
  } = useQuery<Task[], Error>({
    queryKey: tasksQueryKey,
    queryFn: () => fetchTasks(activeUserId!, viewMode, currentDate),
    enabled: !!activeUserId,
  });

  const {
    data: sections = [],
    isLoading: sectionsLoading,
    error: sectionsError,
  } = useQuery<TaskSection[], Error>({
    queryKey: sectionsQueryKey,
    queryFn: () => fetchSections(activeUserId!),
    enabled: !!activeUserId,
  });

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery<TaskCategory[], Error>({
    queryKey: categoriesQueryKey,
    queryFn: () => fetchCategories(activeUserId!),
    enabled: !!activeUserId,
  });

  const {
    data: doTodayOffLog = [],
    isLoading: doTodayOffLogLoading,
    error: doTodayOffLogError,
  } = useQuery<DoTodayOffLog[], Error>({
    queryKey: doTodayOffLogQueryKey,
    queryFn: () => fetchDoTodayOffLog(activeUserId!, currentDate),
    enabled: !!activeUserId && viewMode === 'today',
  });

  const doTodayOffIds = useMemo(
    () => new Set(doTodayOffLog.map((log) => log.task_id)),
    [doTodayOffLog]
  );

  const processedTasks = useMemo(() => {
    return tasks.map((task) => {
      const category = categories.find((cat) => cat.id === task.category);
      return {
        ...task,
        category_color: category?.color || null,
      };
    });
  }, [tasks, categories]);

  const allCategories = useMemo(() => categories, [categories]);

  const handleAddTask = useCallback(
    async (taskData: Partial<Task>): Promise<Task | null> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return null;
      }
      try {
        const newTask = await addTask({ ...taskData, user_id: activeUserId });
        if (newTask) {
          queryClient.invalidateQueries({ queryKey: tasksQueryKey });
          showSuccess('Task added successfully!');
          return newTask;
        }
        return null;
      } catch (error) {
        showError('Failed to add task.');
        return null;
      }
    },
    [activeUserId, queryClient, tasksQueryKey]
  );

  const handleUpdateTask = useCallback(
    async (taskId: string, updates: Partial<Task>): Promise<Task | null> => {
      try {
        const updatedTask = await updateTask(taskId, updates);
        if (updatedTask) {
          queryClient.invalidateQueries({ queryKey: tasksQueryKey });
          showSuccess('Task updated successfully!');
          return updatedTask;
        }
        return null;
      } catch (error) {
        showError('Failed to update task.');
        return null;
      }
    },
    [queryClient, tasksQueryKey]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string): Promise<void> => {
      try {
        await deleteTask(taskId);
        queryClient.invalidateQueries({ queryKey: tasksQueryKey });
        showSuccess('Task deleted successfully!');
      } catch (error) {
        showError('Failed to delete task.');
      }
    },
    [queryClient, tasksQueryKey]
  );

  const handleBulkUpdateTasks = useCallback(
    async (taskIds: string[], updates: Partial<Task>): Promise<void> => {
      try {
        await bulkUpdateTasks(taskIds, updates);
        queryClient.invalidateQueries({ queryKey: tasksQueryKey });
        showSuccess('Tasks updated successfully!');
      } catch (error) {
        showError('Failed to bulk update tasks.');
      }
    },
    [queryClient, tasksQueryKey]
  );

  const handleReorderTasks = useCallback(
    async (
      updates: {
        id: string;
        order: number | null;
        section_id: string | null;
        parent_task_id: string | null;
      }[]
    ): Promise<void> => {
      try {
        await reorderTasks(updates);
        queryClient.invalidateQueries({ queryKey: tasksQueryKey });
      } catch (error) {
        showError('Failed to reorder tasks.');
      }
    },
    [queryClient, tasksQueryKey]
  );

  const handleCreateSection = useCallback(
    async (name: string): Promise<TaskSection | null> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return null;
      }
      try {
        const newSection = await createSection(activeUserId, name);
        if (newSection) {
          queryClient.invalidateQueries({ queryKey: sectionsQueryKey });
          showSuccess('Section created successfully!');
          return newSection;
        }
        return null;
      } catch (error) {
        showError('Failed to create section.');
        return null;
      }
    },
    [activeUserId, queryClient, sectionsQueryKey]
  );

  const handleUpdateSection = useCallback(
    async (sectionId: string, newName: string): Promise<TaskSection | null> => {
      try {
        const updatedSection = await updateSection(sectionId, { name: newName });
        if (updatedSection) {
          queryClient.invalidateQueries({ queryKey: sectionsQueryKey });
          showSuccess('Section updated successfully!');
          return updatedSection;
        }
        return null;
      } catch (error) {
        showError('Failed to update section.');
        return null;
      }
    },
    [queryClient, sectionsQueryKey]
  );

  const handleDeleteSection = useCallback(
    async (sectionId: string): Promise<void> => {
      try {
        await deleteSection(sectionId);
        queryClient.invalidateQueries({ queryKey: sectionsQueryKey });
        showSuccess('Section deleted successfully!');
      } catch (error) {
        showError('Failed to delete section.');
      }
    },
    [queryClient, sectionsQueryKey]
  );

  const handleUpdateSectionIncludeInFocusMode = useCallback(
    async (sectionId: string, include: boolean): Promise<TaskSection | null> => {
      try {
        const updatedSection = await updateSection(sectionId, { include_in_focus_mode: include });
        if (updatedSection) {
          queryClient.invalidateQueries({ queryKey: sectionsQueryKey });
          showSuccess('Section updated successfully!');
          return updatedSection;
        }
        return null;
      } catch (error) {
        showError('Failed to update section focus mode.');
        return null;
      }
    },
    [queryClient, sectionsQueryKey]
  );

  const handleCreateCategory = useCallback(
    async (name: string, color: string): Promise<TaskCategory | null> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return null;
      }
      try {
        const newCategory = await createCategory(activeUserId, name, color);
        if (newCategory) {
          queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
          showSuccess('Category created successfully!');
          return newCategory;
        }
        return null;
      } catch (error) {
        showError('Failed to create category.');
        return null;
      }
    },
    [activeUserId, queryClient, categoriesQueryKey]
  );

  const handleUpdateCategory = useCallback(
    async (categoryId: string, newName: string, newColor: string): Promise<TaskCategory | null> => {
      try {
        const updatedCategory = await updateCategory(categoryId, { name: newName, color: newColor });
        if (updatedCategory) {
          queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
          showSuccess('Category updated successfully!');
          return updatedCategory;
        }
        return null;
      } catch (error) {
        showError('Failed to update category.');
        return null;
      }
    },
    [queryClient, categoriesQueryKey]
  );

  const handleDeleteCategory = useCallback(
    async (categoryId: string): Promise<void> => {
      try {
        await deleteCategory(categoryId);
        queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
        showSuccess('Category deleted successfully!');
      } catch (error) {
        showError('Failed to delete category.');
      }
    },
    [queryClient, categoriesQueryKey]
  );

  const toggleDoToday = useCallback(
    async (taskId: string, isOff: boolean): Promise<void> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return;
      }
      try {
        if (isOff) {
          await addDoTodayOffLog(activeUserId, taskId, currentDate);
        } else {
          await deleteDoTodayOffLog(activeUserId, taskId, currentDate);
        }
        queryClient.invalidateQueries({ queryKey: doTodayOffLogQueryKey });
        queryClient.invalidateQueries({ queryKey: tasksQueryKey }); // Invalidate tasks to reflect changes
      } catch (error) {
        showError('Failed to update "Do Today" status.');
      }
    },
    [activeUserId, currentDate, queryClient, doTodayOffLogQueryKey, tasksQueryKey]
  );

  const toggleAllDoToday = useCallback(
    async (turnOff: boolean): Promise<void> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return;
      }
      try {
        const todayTasks = processedTasks.filter(
          (task) =>
            task.status === 'to-do' &&
            (task.due_date === null || isSameDay(parseISO(task.due_date), currentDate)) &&
            !task.parent_task_id
        );

        if (turnOff) {
          // Add all today's tasks to doTodayOffLog
          for (const task of todayTasks) {
            if (!doTodayOffIds.has(task.id)) {
              await addDoTodayOffLog(activeUserId, task.id, currentDate);
            }
          }
          showSuccess('All "Do Today" tasks turned off.');
        } else {
          // Remove all today's tasks from doTodayOffLog
          for (const task of todayTasks) {
            if (doTodayOffIds.has(task.id)) {
              await deleteDoTodayOffLog(activeUserId, task.id, currentDate);
            }
          }
          showSuccess('All "Do Today" tasks turned on.');
        }
        queryClient.invalidateQueries({ queryKey: doTodayOffLogQueryKey });
        queryClient.invalidateQueries({ queryKey: tasksQueryKey });
      } catch (error) {
        showError('Failed to update all "Do Today" tasks.');
      }
    },
    [activeUserId, currentDate, processedTasks, doTodayOffIds, queryClient, doTodayOffLogQueryKey, tasksQueryKey]
  );

  const archiveAllCompletedTasks = useCallback(async (): Promise<void> => {
    if (!activeUserId) {
      showError('User not authenticated.');
      return;
    }
    try {
      const completedTaskIds = tasks
        .filter((task) => task.status === 'completed')
        .map((task) => task.id);

      if (completedTaskIds.length > 0) {
        await bulkUpdateTasks(completedTaskIds, { status: 'archived' });
        queryClient.invalidateQueries({ queryKey: tasksQueryKey });
        showSuccess('All completed tasks archived!');
      } else {
        showSuccess('No completed tasks to archive.');
      }
    } catch (error) {
      showError('Failed to archive completed tasks.');
    }
  }, [activeUserId, tasks, queryClient, tasksQueryKey]);

  const setFocusTask = useCallback(
    async (taskId: string | null): Promise<void> => {
      // This function would typically update user settings in the database
      // For now, it's a placeholder.
      console.log(`Setting focus task to: ${taskId}`);
      showSuccess(`Focus task set to ${taskId || 'none'}`);
    },
    []
  );

  const todayStart = startOfDay(currentDate);

  const filteredAndSearchedTasks = useMemo(() => {
    return processedTasks.filter((task) => {
      // Apply viewMode specific filters first
      const isViewModeMatch =
        viewMode !== 'today' ||
        (!doTodayOffIds.has(task.id) &&
          (task.due_date === null || new Date(task.due_date) >= todayStart));

      if (!isViewModeMatch) return false;

      // Apply status filter
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;

      // Apply category filter
      if (categoryFilter !== 'all' && categoryFilter !== null && task.category !== categoryFilter) return false;

      // Apply priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

      // Apply section filter
      if (sectionFilter !== 'all' && sectionFilter !== null && task.section_id !== sectionFilter) return false;

      // Apply search filter
      if (searchFilter && task.description && !task.description.toLowerCase().includes(searchFilter.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [processedTasks, viewMode, doTodayOffIds, todayStart, statusFilter, categoryFilter, priorityFilter, sectionFilter, searchFilter]);


  const activeTasks = useMemo(() => {
    return filteredAndSearchedTasks
      .filter(
        (task: Task) =>
          task.status !== 'archived'
      )
      .sort((a, b) => {
        const priorityOrder: { [key: string]: number } = {
          urgent: 0,
          high: 1,
          medium: 2,
          low: 3,
          null: 4, // Explicitly handle null
        };
        const pA = priorityOrder[a.priority || 'null']; // Use 'null' string as key
        const pB = priorityOrder[b.priority || 'null']; // Use 'null' string as key
        if (pA !== pB) return pA - pB;

        // Sort by due date if priorities are the same
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date) return -1; // Tasks with due dates come first
        if (b.due_date) return 1;
        return 0;
      });
  }, [filteredAndSearchedTasks]);

  const nextAvailableTask = useMemo(() => {
    return activeTasks.find(
      (task) =>
        task.status === 'to-do' &&
        !task.parent_task_id &&
        (task.section_id === null ||
          sections.find((s) => s.id === task.section_id)?.include_in_focus_mode)
    );
  }, [activeTasks, sections]);

  const dailyProgress: DailyTaskCount = useDailyTaskCount(currentDate, activeUserId);

  return {
    tasks,
    processedTasks,
    activeTasks,
    filteredTasks: filteredAndSearchedTasks, // Expose filtered tasks
    nextAvailableTask,
    sections,
    allCategories,
    doTodayOffIds,
    handleAddTask,
    updateTask: handleUpdateTask,
    deleteTask: handleDeleteTask,
    bulkUpdateTasks: handleBulkUpdateTasks,
    reorderTasks: handleReorderTasks,
    createSection: handleCreateSection,
    updateSection: handleUpdateSection,
    deleteSection: handleDeleteSection,
    updateSectionIncludeInFocusMode: handleUpdateSectionIncludeInFocusMode,
    createCategory: handleCreateCategory,
    updateCategory: handleUpdateCategory,
    deleteCategory: handleDeleteCategory,
    toggleDoToday,
    toggleAllDoToday,
    archiveAllCompletedTasks,
    setFocusTask,
    isLoading: tasksLoading || sectionsLoading || categoriesLoading || doTodayOffLogLoading,
    error: tasksError || sectionsError || categoriesError || doTodayOffLogError,
    currentDate,
    dailyProgress, // Expose dailyProgress
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    sectionFilter,
    setSectionFilter,
    searchFilter,
    setSearchFilter,
  };
};