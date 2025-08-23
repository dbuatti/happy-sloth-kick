import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext'; // Corrected import path for useAuth
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
import { isSameDay, isPast, startOfDay } from 'date-fns';

// Helper to clean task data for DB insertion/update
const cleanTaskForDb = (task: Partial<Task> & { user_id: string }): Omit<NewTaskData, 'category_color' | 'is_daily_recurring'> => {
  const cleaned: Omit<NewTaskData, 'category_color' | 'is_daily_recurring'> = { // Corrected OOmit to Omit
    user_id: task.user_id,
    description: task.description || '',
    status: task.status || 'to-do',
    priority: task.priority || 'medium',
    due_date: task.due_date || null,
    notes: task.notes || null,
    remind_at: task.remind_at || null,
    section_id: task.section_id || null,
    order: task.order ?? 0,
    parent_task_id: task.parent_task_id || null,
    recurring_type: task.recurring_type || 'none',
    original_task_id: task.original_task_id || null,
    category: task.category || null,
    link: task.link || null,
    image_url: task.image_url || null,
  };
  return cleaned;
};

export const useTasks = ({ userId: propUserId, isDemo = false, demoUserId }: UseTasksProps) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const queryClient = useQueryClient();

  const invalidateTasksQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] });
    queryClient.invalidateQueries({ queryKey: ['dailyTaskCount', currentUserId] });
  }, [queryClient, currentUserId]);

  const invalidateCategoriesQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['task_categories', currentUserId] });
  }, [queryClient, currentUserId]);

  const invalidateSectionsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['task_sections', currentUserId] });
  }, [queryClient, currentUserId]);

  // Fetch Tasks
  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useQuery<Task[], Error>({
    queryKey: ['tasks', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, category(color, name)')
        .eq('user_id', currentUserId)
        .order('order', { ascending: true });
      if (error) throw error;
      return data.map(task => ({
        ...task,
        category_color: task.category ? (task.category as unknown as TaskCategory).color : undefined,
      })) as Task[];
    },
    enabled: !!currentUserId && !authLoading,
  });

  // Fetch Categories
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useQuery<TaskCategory[], Error>({
    queryKey: ['task_categories', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .eq('user_id', currentUserId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentUserId && !authLoading,
  });

  // Fetch Sections
  const { data: sections, isLoading: sectionsLoading, error: sectionsError } = useQuery<TaskSection[], Error>({
    queryKey: ['task_sections', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('task_sections')
        .select('*')
        .eq('user_id', currentUserId)
        .order('order', { ascending: true });
      if (error) throw error;
      return data as TaskSection[]; // Explicitly cast to TaskSection[]
    },
    enabled: !!currentUserId && !authLoading,
  });

  // Add Task
  const addTaskMutation = useMutation<Task, Error, NewTaskData, unknown>({
    mutationFn: async (newTaskData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('tasks')
        .insert(cleanTaskForDb({ ...newTaskData, user_id: currentUserId } as Partial<Task> & { user_id: string })) // Corrected type assertion
        .select('*, category(color, name)')
        .single();
      if (error) throw error;
      return { ...data, category_color: data.category ? (data.category as unknown as TaskCategory).color : undefined } as Task;
    },
    onSuccess: () => {
      invalidateTasksQueries();
    },
  });

  // Update Task
  const updateTaskMutation = useMutation<Task, Error, { id: string; updates: UpdateTaskData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('tasks')
        .update(cleanTaskForDb({ ...updates, user_id: currentUserId } as Partial<Task> & { user_id: string }))
        .eq('id', id)
        .eq('user_id', currentUserId)
        .select('*, category(color, name)')
        .single();
      if (error) throw error;
      return { ...data, category_color: data.category ? (data.category as unknown as TaskCategory).color : undefined } as Task;
    },
    onSuccess: () => {
      invalidateTasksQueries();
    },
  });

  // Delete Task
  const deleteTaskMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateTasksQueries();
    },
  });

  // Create Category
  const createCategoryMutation = useMutation<TaskCategory, Error, NewTaskCategoryData, unknown>({
    mutationFn: async (newCategoryData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('task_categories')
        .insert({ ...newCategoryData, user_id: currentUserId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateCategoriesQueries();
    },
  });

  // Update Category
  const updateCategoryMutation = useMutation<TaskCategory, Error, { id: string; updates: UpdateTaskCategoryData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('task_categories')
        .update(updates)
        .eq('id', id)
        .eq('user_id', currentUserId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateCategoriesQueries();
    },
  });

  // Delete Category
  const deleteCategoryMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('task_categories')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCategoriesQueries();
    },
  });

  // Create Section
  const createSectionMutation = useMutation<TaskSection, Error, NewTaskSectionData, unknown>({
    mutationFn: async (newSectionData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('task_sections')
        .insert({ ...newSectionData, user_id: currentUserId })
        .select('*')
        .single();
      if (error) throw error;
      return data as TaskSection; // Explicitly cast
    },
    onSuccess: () => {
      invalidateSectionsQueries();
    },
  });

  // Update Section
  const updateSectionMutation = useMutation<TaskSection, Error, { id: string; updates: UpdateTaskSectionData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('task_sections')
        .update(updates)
        .eq('id', id)
        .eq('user_id', currentUserId)
        .select('*')
        .single();
      if (error) throw error;
      return data as TaskSection; // Explicitly cast
    },
    onSuccess: () => {
      invalidateSectionsQueries();
    },
  });

  // Delete Section
  const deleteSectionMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('task_sections')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateSectionsQueries();
    },
  });

  // Update sections order
  const updateSectionsOrderMutation = useMutation<void, Error, { id: string; order: number; name: string; user_id: string; include_in_focus_mode: boolean | null }[], unknown>({
    mutationFn: async (updates) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase.rpc('update_sections_order', { updates: updates as any }); // Cast to any for rpc
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateSectionsQueries();
    },
  });

  // Update tasks order
  const updateTasksOrderMutation = useMutation<void, Error, { id: string; order: number | null; parent_task_id: string | null; section_id: string | null }[], unknown>({
    mutationFn: async (updates) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase.rpc('update_tasks_order', { updates });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateTasksQueries();
    },
  });

  const reorderTasks = useCallback(async (activeId: string, overId: string | null, parentTaskId: string | null, sectionId: string | null) => {
    if (!tasks) return;

    const activeIndex = tasks.findIndex(t => t.id === activeId);
    const overIndex = tasks.findIndex(t => t.id === overId);

    if (activeIndex === -1) return;

    let newTasks = [...tasks];
    // let newOrder = 0; // Removed unused variable

    if (overId === null) {
      // Dropped into a section or general area
      const siblings = newTasks.filter(t => t.parent_task_id === parentTaskId && t.section_id === sectionId);
      newTasks = arrayMove(siblings, activeIndex, siblings.length - 1);
      // newOrder = siblings.length - 1; // Removed unused variable
    } else {
      // Dropped onto another task
      newTasks = arrayMove(newTasks, activeIndex, overIndex);
      // newOrder = overIndex; // Removed unused variable
    }

    const updates = newTasks.map((task, index) => ({
      id: task.id,
      order: index,
      parent_task_id: parentTaskId,
      section_id: sectionId,
    }));

    await updateTasksOrderMutation.mutateAsync(updates);
  }, [tasks, updateTasksOrderMutation]);

  const reorderSections = useCallback(async (activeId: string, overId: string | null) => {
    if (!sections) return;

    const activeIndex = sections.findIndex((s: TaskSection) => s.id === activeId); // Explicitly typed s
    const overIndex = sections.findIndex((s: TaskSection) => s.id === overId); // Explicitly typed s

    if (activeIndex === -1) return;

    const newSections = arrayMove(sections, activeIndex, overIndex);

    const updates = newSections.map((section: TaskSection, index) => ({ // Explicitly typed section
      id: section.id,
      name: section.name,
      order: index,
      user_id: section.user_id,
      include_in_focus_mode: section.include_in_focus_mode,
    }));

    await updateSectionsOrderMutation.mutateAsync(updates);
  }, [sections, updateSectionsOrderMutation]);

  const updateSectionIncludeInFocusMode = useCallback(async (sectionId: string, include: boolean) => {
    await updateSectionMutation.mutateAsync({ id: sectionId, updates: { include_in_focus_mode: include } });
  }, [updateSectionMutation]);

  // --- Filtering and Sorting Logic for TaskList ---
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDueDate, setFilterDueDate] = useState<Date | undefined>(undefined);
  const [showCompleted, setShowCompleted] = useState<boolean>(false);

  const filteredAndSortedTasks = useMemo(() => {
    if (!tasks) return [];

    let filtered = tasks;

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

    if (!showCompleted) {
      filtered = filtered.filter(task => task.status !== 'completed');
    }

    // Sort by due date (closest first), then priority, then order
    filtered.sort((a, b) => {
      // Sort by due date
      if (a.due_date && b.due_date) {
        const dateA = new Date(a.due_date);
        const dateB = new Date(b.due_date);
        if (isPast(dateA) && !isPast(dateB)) return 1; // Past dates come after future dates
        if (!isPast(dateA) && isPast(dateB)) return -1;
        return dateA.getTime() - dateB.getTime();
      }
      if (a.due_date) return -1; // Tasks with due dates come before tasks without
      if (b.due_date) return 1;

      // Then by priority (urgent > high > medium > low > none)
      const priorityOrder: { [key: string]: number } = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3, 'none': 4 };
      const pA = priorityOrder[a.priority || 'none'];
      const pB = priorityOrder[b.priority || 'none'];
      if (pA !== pB) return pA - pB;

      // Finally by explicit order
      if (a.order !== null && b.order !== null) {
        return a.order - b.order;
      }
      return 0;
    });

    return filtered;
  }, [tasks, filterStatus, filterCategory, filterPriority, searchQuery, filterDueDate, showCompleted]);

  const dailyProgress = useMemo(() => {
    if (!tasks) return { completed: 0, total: 0, percentage: 0 };
    const today = startOfDay(new Date());
    const dailyTasks = tasks.filter(task =>
      task.recurring_type === 'daily' ||
      (task.due_date && isSameDay(new Date(task.due_date), today))
    );
    const completed = dailyTasks.filter(task => task.status === 'completed').length;
    const total = dailyTasks.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    return { completed, total, percentage };
  }, [tasks]);

  return {
    tasks: filteredAndSortedTasks,
    categories,
    sections,
    isLoading: tasksLoading || categoriesLoading || sectionsLoading || authLoading,
    error: tasksError || categoriesError || sectionsError,
    addTask: addTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    createCategory: createCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    createSection: createSectionMutation.mutateAsync,
    updateSection: updateSectionMutation.mutateAsync,
    deleteSection: deleteSectionMutation.mutateAsync,
    reorderTasks,
    reorderSections,
    updateSectionIncludeInFocusMode,
    dailyProgress,
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
  };
};