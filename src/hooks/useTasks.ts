import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  fetchTasks,
  addTask,
  updateTask,
  deleteTask,
  fetchSections,
  addSection,
  updateSection,
  deleteSection,
  fetchCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  fetchDoTodayOffLog,
  addDoTodayOffLog,
  deleteDoTodayOffLog,
  updateTasksOrder,
  archiveAllCompletedTasks as apiArchiveAllCompletedTasks,
} from '@/integrations/supabase/api';
import { Task, TaskSection, TaskCategory, TaskStatus, TaskPriority } from '@/types/task';
import { showError, showSuccess } from '@/utils/toast';
import { isToday, isPast, parseISO, format } from 'date-fns';

interface UseTasksProps {
  userId?: string | null;
  currentDate: Date;
  viewMode: 'today' | 'all' | 'focus' | 'archive';
}

export const useTasks = ({ userId, currentDate, viewMode }: UseTasksProps) => {
  const { user } = useAuth();
  const activeUserId = userId || user?.id;
  const queryClient = useQueryClient();

  const tasksQueryKey = ['tasks', activeUserId, viewMode, format(currentDate, 'yyyy-MM-dd')];
  const sectionsQueryKey = ['taskSections', activeUserId];
  const categoriesQueryKey = ['taskCategories', activeUserId];
  const doTodayOffLogQueryKey = ['doTodayOffLog', activeUserId, format(currentDate, 'yyyy-MM-dd')];

  // Fetch tasks
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksError,
  } = useQuery<Task[], Error>({
    queryKey: tasksQueryKey,
    queryFn: () => fetchTasks(activeUserId!, viewMode, currentDate),
    enabled: !!activeUserId,
  });

  // Fetch sections
  const {
    data: sections = [],
    isLoading: sectionsLoading,
    error: sectionsError,
  } = useQuery<TaskSection[], Error>({
    queryKey: sectionsQueryKey,
    queryFn: () => fetchSections(activeUserId!),
    enabled: !!activeUserId,
  });

  // Fetch categories
  const {
    data: allCategories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery<TaskCategory[], Error>({
    queryKey: categoriesQueryKey,
    queryFn: () => fetchCategories(activeUserId!),
    enabled: !!activeUserId,
  });

  // Fetch "Do Today" off log
  const {
    data: doTodayOffLog = [],
    isLoading: doTodayOffLoading,
    error: doTodayOffError,
  } = useQuery<{ task_id: string }[], Error>({
    queryKey: doTodayOffLogQueryKey,
    queryFn: () => fetchDoTodayOffLog(activeUserId!, format(currentDate, 'yyyy-MM-dd')),
    enabled: !!activeUserId && viewMode === 'today',
  });

  const doTodayOffIds = useMemo(() => new Set(doTodayOffLog.map(log => log.task_id)), [doTodayOffLog]);

  const processedTasks = useMemo(() => {
    return tasks.map(task => {
      const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
      const isDueToday = task.due_date && isToday(parseISO(task.due_date));
      return { ...task, isOverdue, isDueToday };
    });
  }, [tasks]);

  const activeTasks = useMemo(() => {
    return processedTasks.filter(task => task.status !== 'completed' && task.status !== 'archived');
  }, [processedTasks]);

  const nextAvailableTask = useMemo(() => {
    const focusTasks = activeTasks.filter(task => {
      const section = sections.find(s => s.id === task.section_id);
      return section?.include_in_focus_mode !== false && !doTodayOffIds.has(task.id);
    });

    // Sort by priority (urgent > high > medium > low > null), then due date (earliest first), then order
    return focusTasks.sort((a, b) => {
      const priorityOrder: Record<NonNullable<TaskPriority> | 'null', number> = { // Fixed type here
        'urgent': 0, 'high': 1, 'medium': 2, 'low': 3, 'null': 4
      };
      if (priorityOrder[a.priority || 'null'] !== priorityOrder[b.priority || 'null']) {
        return priorityOrder[a.priority || 'null'] - priorityOrder[b.priority || 'null'];
      }

      const dateA = a.due_date ? parseISO(a.due_date) : null;
      const dateB = b.due_date ? parseISO(b.due_date) : null;

      if (dateA && dateB) {
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }
      } else if (dateA) {
        return -1;
      } else if (dateB) {
        return 1;
      }

      return (a.order || 0) - (b.order || 0);
    })[0] || null;
  }, [activeTasks, sections, doTodayOffIds]);

  const isLoading = tasksLoading || sectionsLoading || categoriesLoading || doTodayOffLoading;
  const error = tasksError || sectionsError || categoriesError || doTodayOffError;

  // Mutations for tasks
  const addTaskMutation = useMutation<Task | null, Error, Partial<Task>>({
    mutationFn: (newTask) => addTask({ ...newTask, user_id: activeUserId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
    onError: (err) => {
      showError(`Failed to add task: ${(err as Error).message}`);
    },
  });

  const updateTaskMutation = useMutation<Task | null, Error, { id: string; updates: Partial<Task> }>({
    mutationFn: ({ id, updates }) => updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
    onError: (err) => {
      showError(`Failed to update task: ${(err as Error).message}`);
    },
  });

  const deleteTaskMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
    onError: (err) => {
      showError(`Failed to delete task: ${(err as Error).message}`);
    },
  });

  const reorderTasksMutation = useMutation<void, Error, { id: string; order: number | null; section_id: string | null; parent_task_id: string | null; }[]>({
    mutationFn: (updates) => updateTasksOrder(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
    onError: (err) => {
      showError(`Failed to reorder tasks: ${(err as Error).message}`);
    },
  });

  const archiveAllCompletedTasksMutation = useMutation<void, Error, void>({
    mutationFn: () => apiArchiveAllCompletedTasks(activeUserId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
      showSuccess('All completed tasks archived!');
    },
    onError: (err) => {
      showError(`Failed to archive tasks: ${(err as Error).message}`);
    },
  });

  // Mutations for sections
  const addSectionMutation = useMutation<TaskSection | null, Error, string>({
    mutationFn: (name) => addSection({ user_id: activeUserId!, name, order: sections.length, include_in_focus_mode: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionsQueryKey });
    },
    onError: (err) => {
      showError(`Failed to add section: ${(err as Error).message}`);
    },
  });

  const updateSectionMutation = useMutation<TaskSection | null, Error, { id: string; name?: string; include_in_focus_mode?: boolean }>({
    mutationFn: ({ id, name, include_in_focus_mode }) => updateSection(id, { name, include_in_focus_mode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionsQueryKey });
    },
    onError: (err) => {
      showError(`Failed to update section: ${(err as Error).message}`);
    },
  });

  const deleteSectionMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionsQueryKey });
      queryClient.invalidateQueries({ queryKey: tasksQueryKey }); // Tasks might have been in this section
    },
    onError: (err) => {
      showError(`Failed to delete section: ${(err as Error).message}`);
    },
  });

  // Mutations for categories
  const addCategoryMutation = useMutation<TaskCategory | null, Error, { name: string; color: string }>({
    mutationFn: ({ name, color }) => addCategory({ user_id: activeUserId!, name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
    },
    onError: (err) => {
      showError(`Failed to add category: ${(err as Error).message}`);
    },
  });

  const updateCategoryMutation = useMutation<TaskCategory | null, Error, { id: string; name?: string; color?: string }>({
    mutationFn: ({ id, name, color }) => updateCategory(id, { name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
    },
    onError: (err) => {
      showError(`Failed to update category: ${(err as Error).message}`);
    },
  });

  const deleteCategoryMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
      queryClient.invalidateQueries({ queryKey: tasksQueryKey }); // Tasks might have used this category
    },
    onError: (err) => {
      showError(`Failed to delete category: ${(err as Error).message}`);
    },
  });

  // Mutations for "Do Today" log
  const addDoTodayOffLogMutation = useMutation<void, Error, { task_id: string; date: string; user_id: string }>({
    mutationFn: (log) => addDoTodayOffLog(log),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: doTodayOffLogQueryKey });
    },
    onError: (err) => {
      showError(`Failed to add to "Do Today" off log: ${(err as Error).message}`);
    },
  });

  const deleteDoTodayOffLogMutation = useMutation<void, Error, { task_id: string; date: string; user_id: string }>({
    mutationFn: (log) => deleteDoTodayOffLog(log),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: doTodayOffLogQueryKey });
    },
    onError: (err) => {
      showError(`Failed to remove from "Do Today" off log: ${(err as Error).message}`);
    },
  });

  const handleAddTask = useCallback(
    async (taskData: Partial<Task>): Promise<Task | null> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return null;
      }
      try {
        const result = await addTaskMutation.mutateAsync(taskData);
        showSuccess('Task added successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [activeUserId, addTaskMutation]
  );

  const updateTaskCallback = useCallback(
    async (taskId: string, updates: Partial<Task>): Promise<Task | null> => {
      try {
        const result = await updateTaskMutation.mutateAsync({ id: taskId, updates });
        showSuccess('Task updated successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [updateTaskMutation]
  );

  const deleteTaskCallback = useCallback(
    async (taskId: string): Promise<void> => {
      try {
        await deleteTaskMutation.mutateAsync(taskId);
        showSuccess('Task deleted successfully!');
      } catch (err) {
        // Error handled by mutation's onError
      }
    },
    [deleteTaskMutation]
  );

  const reorderTasksCallback = useCallback(
    async (updates: { id: string; order: number | null; section_id: string | null; parent_task_id: string | null; }[]): Promise<void> => {
      try {
        await reorderTasksMutation.mutateAsync(updates);
        showSuccess('Tasks reordered successfully!');
      } catch (err) {
        // Error handled by mutation's onError
      }
    },
    [reorderTasksMutation]
  );

  const createSectionCallback = useCallback(
    async (name: string): Promise<TaskSection | null> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return null;
      }
      try {
        const result = await addSectionMutation.mutateAsync(name);
        showSuccess('Section added successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [activeUserId, addSectionMutation]
  );

  const updateSectionCallback = useCallback(
    async (sectionId: string, newName: string): Promise<TaskSection | null> => {
      try {
        const result = await updateSectionMutation.mutateAsync({ id: sectionId, name: newName });
        showSuccess('Section updated successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [updateSectionMutation]
  );

  const updateSectionIncludeInFocusMode = useCallback(
    async (sectionId: string, include: boolean): Promise<TaskSection | null> => {
      try {
        const result = await updateSectionMutation.mutateAsync({ id: sectionId, include_in_focus_mode: include });
        showSuccess('Section focus mode updated successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [updateSectionMutation]
  );

  const deleteSectionCallback = useCallback(
    async (sectionId: string): Promise<void> => {
      try {
        await deleteSectionMutation.mutateAsync(sectionId);
        showSuccess('Section deleted successfully!');
      } catch (err) {
        // Error handled by mutation's onError
      }
    },
    [deleteSectionMutation]
  );

  const createCategoryCallback = useCallback(
    async (name: string, color: string): Promise<TaskCategory | null> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return null;
      }
      try {
        const result = await addCategoryMutation.mutateAsync({ name, color });
        showSuccess('Category added successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [activeUserId, addCategoryMutation]
  );

  const updateCategoryCallback = useCallback(
    async (categoryId: string, newName: string, newColor: string): Promise<TaskCategory | null> => {
      try {
        const result = await updateCategoryMutation.mutateAsync({ id: categoryId, name: newName, color: newColor });
        showSuccess('Category updated successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [updateCategoryMutation]
  );

  const deleteCategoryCallback = useCallback(
    async (categoryId: string): Promise<void> => {
      try {
        await deleteCategoryMutation.mutateAsync(categoryId);
        showSuccess('Category deleted successfully!');
      } catch (err) {
        // Error handled by mutation's onError
      }
    },
    [deleteCategoryMutation]
  );

  const toggleDoToday = useCallback(
    async (taskId: string, isOff: boolean): Promise<void> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return;
      }
      const logData = { task_id: taskId, date: format(currentDate, 'yyyy-MM-dd'), user_id: activeUserId };
      try {
        if (isOff) {
          await addDoTodayOffLogMutation.mutateAsync(logData);
          showSuccess('Task removed from "Do Today"!');
        } else {
          await deleteDoTodayOffLogMutation.mutateAsync(logData);
          showSuccess('Task added to "Do Today"!');
        }
      } catch (err) {
        showError(`Failed to update "Do Today" status: ${(err as Error).message}`);
      }
    },
    [activeUserId, currentDate, addDoTodayOffLogMutation, deleteDoTodayOffLogMutation]
  );

  const toggleAllDoToday = useCallback(
    async (turnOff: boolean): Promise<void> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return;
      }
      const todayTasks = tasks.filter(task => task.status === 'to-do' && task.section_id && sections.find(s => s.id === task.section_id)?.include_in_focus_mode);
      const currentFormattedDate = format(currentDate, 'yyyy-MM-dd');

      try {
        if (turnOff) {
          // Add all eligible tasks to doTodayOffLog
          for (const task of todayTasks) {
            if (!doTodayOffIds.has(task.id)) {
              await addDoTodayOffLogMutation.mutateAsync({ task_id: task.id, date: currentFormattedDate, user_id: activeUserId });
            }
          }
          showSuccess('All "Do Today" tasks turned off!');
        } else {
          // Remove all eligible tasks from doTodayOffLog
          for (const task of todayTasks) {
            if (doTodayOffIds.has(task.id)) {
              await deleteDoTodayOffLogMutation.mutateAsync({ task_id: task.id, date: currentFormattedDate, user_id: activeUserId });
            }
          }
          showSuccess('All "Do Today" tasks turned on!');
        }
      } catch (err) {
        showError(`Failed to update all "Do Today" tasks: ${(err as Error).message}`);
      }
    },
    [activeUserId, tasks, sections, currentDate, doTodayOffIds, addDoTodayOffLogMutation, deleteDoTodayOffLogMutation]
  );

  const archiveAllCompletedTasks = useCallback(
    async (): Promise<void> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return;
      }
      try {
        await archiveAllCompletedTasksMutation.mutateAsync();
      } catch (err) {
        // Error handled by mutation's onError
      }
    },
    [activeUserId, archiveAllCompletedTasksMutation]
  );

  // State for filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('to-do');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all' | null>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all' | null>('all');
  const [sectionFilter, setSectionFilter] = useState<string | 'all' | null>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  return {
    tasks,
    processedTasks,
    activeTasks,
    nextAvailableTask,
    sections,
    allCategories,
    doTodayOffIds,
    handleAddTask,
    updateTask: updateTaskCallback,
    deleteTask: deleteTaskCallback,
    reorderTasks: reorderTasksCallback,
    createSection: createSectionCallback,
    updateSection: updateSectionCallback,
    deleteSection: deleteSectionCallback,
    updateSectionIncludeInFocusMode,
    createCategory: createCategoryCallback,
    updateCategory: updateCategoryCallback,
    deleteCategory: deleteCategoryCallback,
    toggleDoToday,
    toggleAllDoToday,
    archiveAllCompletedTasks,
    isLoading,
    error,
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
    currentDate,
  };
};