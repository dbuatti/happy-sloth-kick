import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import {
  Task,
  TaskCategory,
  TaskSection,
  NewTaskData,
  UpdateTaskData,
  NewTaskCategoryData,
  UpdateTaskCategoryData,
  NewTaskSectionData,
  UpdateTaskSectionData,
  UseTasksProps,
} from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { arrayMove } from '@dnd-kit/sortable';
import { format, isSameDay, isPast, startOfDay } from 'date-fns';

// Helper to clean task data for DB insertion/update
const cleanTaskForDb = (task: Partial<Task>): Omit<Partial<Task>, 'category_color' | 'is_daily_recurring'> => {
  const cleaned: Omit<Partial<Task>, 'category_color' | 'is_daily_recurring'> = { ...task };
  // Remove client-side only properties
  delete (cleaned as any).category_color;
  delete (cleaned as any).is_daily_recurring;
  return cleaned;
};

// --- Task Categories ---
const fetchCategories = async (userId: string): Promise<TaskCategory[]> => {
  const { data, error } = await supabase
    .from('task_categories')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data as TaskCategory[];
};

const addCategory = async (newCategory: NewTaskCategoryData & { user_id: string }): Promise<TaskCategory> => {
  const { data, error } = await supabase
    .from('task_categories')
    .insert(newCategory)
    .select('*')
    .single();
  if (error) throw error;
  return data as TaskCategory;
};

const updateCategory = async (id: string, updates: UpdateTaskCategoryData): Promise<TaskCategory> => {
  const { data, error } = await supabase
    .from('task_categories')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as TaskCategory;
};

const deleteCategory = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('task_categories')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// --- Task Sections ---
const fetchSections = async (userId: string): Promise<TaskSection[]> => {
  const { data, error } = await supabase
    .from('task_sections')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });
  if (error) throw error;
  return data as TaskSection[];
};

const addSection = async (newSection: NewTaskSectionData & { user_id: string }): Promise<TaskSection> => {
  const { data, error } = await supabase
    .from('task_sections')
    .insert(newSection)
    .select('*')
    .single();
  if (error) throw error;
  return data as TaskSection;
};

const updateSection = async (id: string, updates: UpdateTaskSectionData): Promise<TaskSection> => {
  const { data, error } = await supabase
    .from('task_sections')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as TaskSection;
};

const deleteSection = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('task_sections')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

const updateSectionsOrder = async (updates: { id: string; order: number; name: string; include_in_focus_mode: boolean | null; user_id: string }[]): Promise<void> => {
  const { error } = await supabase.rpc('update_tasks_order', { updates });
  if (error) throw error;
};

// --- Tasks ---
const fetchTasks = async (userId: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, category(color, name)') // Select category details
    .eq('user_id', userId)
    .order('order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(task => ({
    ...task,
    category_color: (task.category as unknown as TaskCategory)?.color || undefined,
    category: (task.category as unknown as TaskCategory)?.id || task.category, // Ensure category is ID
    is_daily_recurring: task.recurring_type === 'daily',
  })) as Task[];
};

const addTask = async (newTask: NewTaskData & { user_id: string }): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .insert(cleanTaskForDb(newTask as Partial<Task> & { user_id: string }))
    .select('*, category(color, name)')
    .single();
  if (error) throw error;
  return {
    ...data,
    category_color: (data.category as unknown as TaskCategory)?.color || undefined,
    category: (data.category as unknown as TaskCategory)?.id || data.category,
    is_daily_recurring: data.recurring_type === 'daily',
  } as Task;
};

const updateTask = async (id: string, updates: UpdateTaskData): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .update(cleanTaskForDb(updates as Partial<Task>))
    .eq('id', id)
    .select('*, category(color, name)')
    .single();
  if (error) throw error;
  return {
    ...data,
    category_color: (data.category as unknown as TaskCategory)?.color || undefined,
    category: (data.category as unknown as TaskCategory)?.id || data.category,
    is_daily_recurring: data.recurring_type === 'daily',
  } as Task;
};

const deleteTask = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

const updateTasksOrder = async (updates: { id: string; order: number | null; parent_task_id: string | null; section_id: string | null }[]): Promise<void> => {
  const { error } = await supabase.rpc('update_tasks_order', { updates });
  if (error) throw error;
};

export const useTasks = ({ userId, isDemo = false, demoUserId }: UseTasksProps) => {
  const { isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const currentUserId = isDemo ? demoUserId : userId;

  // --- Categories Query ---
  const { data: categories, isLoading: isLoadingCategories, error: errorCategories } = useQuery<TaskCategory[], Error>({
    queryKey: ['task_categories', currentUserId],
    queryFn: () => fetchCategories(currentUserId!),
    enabled: !!currentUserId && !authLoading,
  });

  const invalidateCategoriesQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['task_categories', currentUserId] });
  }, [queryClient, currentUserId]);

  const createCategory = useMutation<TaskCategory, Error, NewTaskCategoryData>({
    mutationFn: async (newCategory) => {
      if (!currentUserId) throw new Error('User not authenticated.');
      return addCategory({ ...newCategory, user_id: currentUserId });
    },
    onSuccess: invalidateCategoriesQueries,
  });

  const updateCategoryMutation = useMutation<TaskCategory, Error, { id: string; updates: UpdateTaskCategoryData }>({
    mutationFn: ({ id, updates }) => updateCategory(id, updates),
    onSuccess: invalidateCategoriesQueries,
  });

  const deleteCategoryMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteCategory(id),
    onSuccess: invalidateCategoriesQueries,
  });

  // --- Sections Query ---
  const { data: sections, isLoading: isLoadingSections, error: errorSections } = useQuery<TaskSection[], Error>({
    queryKey: ['task_sections', currentUserId],
    queryFn: () => fetchSections(currentUserId!),
    enabled: !!currentUserId && !authLoading,
  });

  const invalidateSectionsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['task_sections', currentUserId] });
  }, [queryClient, currentUserId]);

  const createSection = useMutation<TaskSection, Error, { name: string; include_in_focus_mode?: boolean }>({
    mutationFn: async ({ name, include_in_focus_mode = true }) => {
      if (!currentUserId) throw new Error('User not authenticated.');
      const currentSections = queryClient.getQueryData<TaskSection[]>(['task_sections', currentUserId]) || [];
      const newOrder = currentSections.length;
      const newSectionData: NewTaskSectionData & { user_id: string } = {
        user_id: currentUserId,
        name,
        order: newOrder,
        include_in_focus_mode,
      };
      return addSection(newSectionData);
    },
    onSuccess: invalidateSectionsQueries,
  });

  const updateSectionMutation = useMutation<TaskSection, Error, { id: string; updates: UpdateTaskSectionData }>({
    mutationFn: ({ id, updates }) => updateSection(id, updates),
    onSuccess: invalidateSectionsQueries,
  });

  const deleteSectionMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteSection(id),
    onSuccess: invalidateSectionsQueries,
  });

  const updateSectionIncludeInFocusMode = useCallback(async (sectionId: string, include: boolean) => {
    await updateSectionMutation.mutateAsync({ id: sectionId, updates: { include_in_focus_mode: include } });
  }, [updateSectionMutation]);

  const reorderSections = useCallback(async (newOrderedSections: TaskSection[]) => {
    if (!currentUserId) throw new Error('User not authenticated.');
    const updates = newOrderedSections.map((s, i) => ({
      id: s.id,
      name: s.name,
      order: i,
      user_id: currentUserId,
      include_in_focus_mode: s.include_in_focus_mode,
    }));
    await updateSectionsOrder(updates);
    invalidateSectionsQueries();
  }, [currentUserId, invalidateSectionsQueries]);

  // --- Tasks Query ---
  const { data: tasks, isLoading: isLoadingTasks, error: errorTasks } = useQuery<Task[], Error>({
    queryKey: ['tasks', currentUserId],
    queryFn: () => fetchTasks(currentUserId!),
    enabled: !!currentUserId && !authLoading,
  });

  const invalidateTasksQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] });
  }, [queryClient, currentUserId]);

  const createTaskMutation = useMutation<Task, Error, NewTaskData>({
    mutationFn: async (newTask) => {
      if (!currentUserId) throw new Error('User not authenticated.');
      return addTask({ ...newTask, user_id: currentUserId });
    },
    onSuccess: invalidateTasksQueries,
  });

  const updateTaskMutation = useMutation<Task, Error, { id: string; updates: UpdateTaskData }>({
    mutationFn: ({ id, updates }) => updateTask(id, updates),
    onSuccess: invalidateTasksQueries,
  });

  const deleteTaskMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteTask(id),
    onSuccess: invalidateTasksQueries,
  });

  const reorderTasks = useCallback(async (newOrderedTasks: Task[]) => {
    if (!currentUserId) throw new Error('User not authenticated.');
    const updates = newOrderedTasks.map(task => ({
      id: task.id,
      order: task.order,
      parent_task_id: task.parent_task_id,
      section_id: task.section_id,
    }));
    await updateTasksOrder(updates);
    invalidateTasksQueries();
  }, [currentUserId, invalidateTasksQueries]);

  // --- Processed Tasks (for display) ---
  const processedTasks = useMemo(() => {
    if (!tasks || !categories) return [];

    const categoriesMap = new Map(categories.map(cat => [cat.id, cat]));
    const tasksWithCategoryColor = tasks.map(task => ({
      ...task,
      category_color: categoriesMap.get(task.category || '')?.color || undefined,
    }));

    // Group tasks by section
    const tasksBySection = new Map<string, Task[]>();
    tasksWithCategoryColor.forEach(task => {
      const sectionId = task.section_id || 'no-section';
      if (!tasksBySection.has(sectionId)) {
        tasksBySection.set(sectionId, []);
      }
      tasksBySection.get(sectionId)?.push(task);
    });

    // Sort tasks within each section by order, then by created_at
    tasksBySection.forEach((taskList, sectionId) => {
      tasksBySection.set(sectionId, taskList.sort((a, b) => {
        if (a.order !== null && b.order !== null) {
          return a.order - b.order;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }));
    });

    return tasksWithCategoryColor;
  }, [tasks, categories]);

  // --- Filtering and Sorting Logic for TaskList ---
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDueDate, setFilterDueDate] = useState<Date | undefined>(undefined);
  const [showCompleted, setShowCompleted] = useState<boolean>(false);

  const filteredTasks = useMemo(() => {
    let filtered = processedTasks;

    if (!showCompleted) {
      filtered = filtered.filter(task => task.status !== 'completed');
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(task => task.category === filterCategory);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterDueDate) {
      filtered = filtered.filter(task => task.due_date && isSameDay(new Date(task.due_date), filterDueDate));
    }

    return filtered;
  }, [processedTasks, filterStatus, filterCategory, filterPriority, searchQuery, filterDueDate, showCompleted]);

  const nextAvailableTask = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);

    const focusModeSectionIds = new Set((sections || [] as TaskSection[]).filter(s => s.include_in_focus_mode).map(s => s.id));

    const availableTasks = processedTasks.filter(task => {
      const isFocusModeTask = task.section_id && focusModeSectionIds.has(task.section_id);
      const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isSameDay(new Date(task.due_date), today);
      const isDueToday = task.due_date && isSameDay(new Date(task.due_date), today);
      const isRecurringDaily = task.recurring_type === 'daily';

      return (
        task.status !== 'completed' &&
        task.parent_task_id === null && // Only consider top-level tasks
        (isFocusModeTask || isOverdue || isDueToday || isRecurringDaily)
      );
    });

    // Sort by priority (urgent > high > medium > low > none), then due date (earliest first), then created_at
    return availableTasks.sort((a, b) => {
      const priorityOrder: { [key: string]: number } = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3, 'none': 4 };
      const aPriority = priorityOrder[a.priority || 'none'];
      const bPriority = priorityOrder[b.priority || 'none'];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    })[0] || null;
  }, [processedTasks, sections]);

  const dailyProgress = useMemo(() => {
    const today = startOfDay(new Date());
    const totalTasksToday = processedTasks.filter(task =>
      task.parent_task_id === null &&
      (isSameDay(new Date(task.created_at), today) || (task.due_date && isSameDay(new Date(task.due_date), today)))
    ).length;

    const completedTasksToday = processedTasks.filter(task =>
      task.status === 'completed' &&
      isSameDay(new Date(task.updated_at || task.created_at), today) &&
      task.parent_task_id === null
    ).length;

    return {
      total: totalTasksToday,
      completed: completedTasksToday,
      percentage: totalTasksToday > 0 ? (completedTasksToday / totalTasksToday) * 100 : 0,
    };
  }, [processedTasks]);

  return {
    tasks: processedTasks,
    sections: sections || [],
    categories: categories || [],
    loading: isLoadingTasks || isLoadingCategories || isLoadingSections || authLoading,
    error: errorTasks || errorCategories || errorSections,
    addTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    reorderTasks,
    createCategory: createCategory.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    createSection: createSection.mutateAsync,
    updateSection: updateSectionMutation.mutateAsync,
    deleteSection: deleteSectionMutation.mutateAsync,
    reorderSections,
    updateSectionIncludeInFocusMode,
    filterStatus,
    setFilterStatus,
    filterCategory,
    setFilterCategory,
    filterPriority,
    setFilterPriority,
    searchQuery,
    setSearchQuery,
    filterDueDate,
    setFilterDueDate,
    showCompleted,
    setShowCompleted,
    filteredTasks,
    nextAvailableTask,
    dailyProgress,
  };
};