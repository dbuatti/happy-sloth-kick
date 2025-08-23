import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  TaskStatus,
  DoTodayOffLogEntry,
} from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'react-hot-toast';
import { isToday, parseISO } from 'date-fns';

export const useTasks = ({ userId: propUserId, isDemo = false, demoUserId }: UseTasksProps) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : propUserId || user?.id;
  const queryClient = useQueryClient();

  const { data: tasks, isLoading, error, refetch } = useQuery<Task[], Error>({
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
        category: task.category ? { ...task.category, id: task.category.id } : null,
      })) as Task[];
    },
    enabled: !!currentUserId && !authLoading,
  });

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
      return data as TaskSection[];
    },
    enabled: !!currentUserId && !authLoading,
  });

  const { data: doTodayOffLog } = useQuery<DoTodayOffLogEntry[], Error>({
    queryKey: ['doTodayOffLog', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('do_today_off_log')
        .select('*')
        .eq('user_id', currentUserId);
      if (error) throw error;
      return data;
    },
    enabled: !!currentUserId && !authLoading,
  });

  const cleanTaskForDb = (task: Partial<NewTaskData | UpdateTaskData>) => {
    const cleaned: Partial<NewTaskData | UpdateTaskData> = { ...task };
    // Remove properties that are not part of the DB schema or are handled separately
    delete (cleaned as any).category_color;
    delete (cleaned as any).is_daily_recurring;
    return cleaned;
  };

  const addTaskMutation = useMutation<Task, Error, NewTaskData, unknown>({
    mutationFn: async (newTaskData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('tasks')
        .insert(cleanTaskForDb({ ...newTaskData, user_id: currentUserId }))
        .select('*, category(color, name)')
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['userSettings', currentUserId] }); // Invalidate settings to update focused task count
      toast.success('Task added!');
    },
  });

  const updateTaskMutation = useMutation<Task, Error, { id: string; updates: UpdateTaskData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('tasks')
        .update(cleanTaskForDb(updates))
        .eq('id', id)
        .select('*, category(color, name)')
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['userSettings', currentUserId] }); // Invalidate settings to update focused task count
      toast.success('Task updated!');
    },
  });

  const deleteTaskMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['userSettings', currentUserId] }); // Invalidate settings to update focused task count
      toast.success('Task deleted!');
    },
  });

  const createCategoryMutation = useMutation<TaskCategory, Error, NewTaskCategoryData, unknown>({
    mutationFn: async (newCategoryData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('task_categories')
        .insert({ ...newCategoryData, user_id: currentUserId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_categories', currentUserId] });
      toast.success('Category created!');
    },
  });

  const updateCategoryMutation = useMutation<TaskCategory, Error, { id: string; updates: UpdateTaskCategoryData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('task_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_categories', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] }); // Tasks might need category name/color update
      toast.success('Category updated!');
    },
  });

  const deleteCategoryMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('task_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_categories', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] }); // Tasks might lose category reference
      toast.success('Category deleted!');
    },
  });

  const createSectionMutation = useMutation<TaskSection, Error, NewTaskSectionData, unknown>({
    mutationFn: async (newSectionData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('task_sections')
        .insert({ ...newSectionData, user_id: currentUserId })
        .select()
        .single();
      if (error) throw error;
      return data as TaskSection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_sections', currentUserId] });
      toast.success('Section created!');
    },
  });

  const updateSectionMutation = useMutation<TaskSection, Error, { id: string; updates: UpdateTaskSectionData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('task_sections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as TaskSection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_sections', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] }); // Tasks might need section name update
      toast.success('Section updated!');
    },
  });

  const deleteSectionMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('task_sections')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_sections', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] }); // Tasks might lose section reference
      toast.success('Section deleted!');
    },
  });

  const updateSectionIncludeInFocusModeMutation = useMutation<void, Error, { sectionId: string; include: boolean }, unknown>({
    mutationFn: async ({ sectionId, include }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('task_sections')
        .update({ include_in_focus_mode: include })
        .eq('id', sectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_sections', currentUserId] });
      toast.success('Focus mode setting updated for section!');
    },
  });

  const reorderTasksMutation = useMutation<void, Error, { updates: { id: string; order: number; parent_task_id: string | null; section_id: string | null }[] }, unknown>({
    mutationFn: async ({ updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase.rpc('update_tasks_order', { updates: updates as any }); // Cast to any for rpc
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] });
    },
  });

  const reorderSectionsMutation = useMutation<void, Error, { updates: { id: string; order: number; name: string; include_in_focus_mode: boolean | null }[] }, unknown>({
    mutationFn: async ({ updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase.rpc('update_sections_order', { updates: updates as any }); // Cast to any for rpc
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_sections', currentUserId] });
    },
  });

  const logDoTodayOffMutation = useMutation<DoTodayOffLogEntry, Error, { taskId: string; offDate: Date }, unknown>({
    mutationFn: async ({ taskId, offDate }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('do_today_off_log')
        .insert({ user_id: currentUserId, task_id: taskId, off_date: offDate.toISOString().split('T')[0] })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doTodayOffLog', currentUserId] });
      toast.success('Task logged as "Do Today Off"!');
    },
  });

  const removeDoTodayOffLogEntryMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (logEntryId) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('do_today_off_log')
        .delete()
        .eq('id', logEntryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doTodayOffLog', currentUserId] });
      toast.success('Task removed from "Do Today Off" log!');
    },
  });

  const addTask = async (
    description: string,
    sectionId: string | null,
    parentTaskId: string | null,
    dueDate: Date | null,
    categoryId: string | null,
    priority: string
  ) => {
    const newTaskData: NewTaskData = {
      description,
      user_id: currentUserId!,
      section_id: sectionId,
      parent_task_id: parentTaskId,
      due_date: dueDate ? dueDate.toISOString() : null,
      category: categoryId,
      priority,
    };
    return addTaskMutation.mutateAsync(newTaskData);
  };

  const updateTask = async (id: string, updates: UpdateTaskData) => {
    return updateTaskMutation.mutateAsync({ id, updates });
  };

  const deleteTask = async (id: string) => {
    return deleteTaskMutation.mutateAsync(id);
  };

  const createCategory = async (data: NewTaskCategoryData) => {
    return createCategoryMutation.mutateAsync(data);
  };

  const updateCategory = async (id: string, updates: UpdateTaskCategoryData) => {
    return updateCategoryMutation.mutateAsync({ id, updates });
  };

  const deleteCategory = async (id: string) => {
    return deleteCategoryMutation.mutateAsync(id);
  };

  const createSection = async (data: NewTaskSectionData) => {
    return createSectionMutation.mutateAsync(data);
  };

  const updateSection = async (id: string, updates: UpdateTaskSectionData) => {
    return updateSectionMutation.mutateAsync({ id, updates });
  };

  const deleteSection = async (id: string) => {
    return deleteSectionMutation.mutateAsync(id);
  };

  const updateSectionIncludeInFocusMode = async (sectionId: string, include: boolean) => {
    return updateSectionIncludeInFocusModeMutation.mutateAsync({ sectionId, include });
  };

  const reorderTasks = async (activeId: string, overId: string, newParentTaskId: string | null, newSectionId: string | null, newOrder: number) => {
    const updates = [{ id: activeId, order: newOrder, parent_task_id: newParentTaskId, section_id: newSectionId }];
    return reorderTasksMutation.mutateAsync({ updates });
  };

  const reorderSections = async (updates: { id: string; order: number; name: string; include_in_focus_mode: boolean | null }[]) => {
    return reorderSectionsMutation.mutateAsync({ updates });
  };

  const onToggleFocusMode = async (taskId: string, isFocused: boolean) => {
    if (!currentUserId) return;
    const currentFocusedTaskId = (queryClient.getQueryData(['userSettings', currentUserId]) as UserSettings)?.focused_task_id;
    const newFocusedTaskId = currentFocusedTaskId === taskId ? null : taskId;

    await supabase
      .from('user_settings')
      .update({ focused_task_id: newFocusedTaskId })
      .eq('user_id', currentUserId);

    queryClient.invalidateQueries({ queryKey: ['userSettings', currentUserId] });
    toast.success(newFocusedTaskId ? 'Task set as focus!' : 'Focus removed!');
  };

  const onLogDoTodayOff = async (taskId: string) => {
    if (!currentUserId) return;
    const existingLogEntry = doTodayOffLog?.find(
      (entry: DoTodayOffLogEntry) => entry.task_id === taskId && isToday(parseISO(entry.off_date))
    );

    if (existingLogEntry) {
      await removeDoTodayOffLogEntryMutation.mutateAsync(existingLogEntry.id);
    } else {
      await logDoTodayOffMutation.mutateAsync({ taskId, offDate: new Date() });
    }
  };

  const sortedTasks = tasks?.sort((a, b) => {
    if (a.order !== null && b.order !== null) {
      return a.order - b.order;
    }
    return 0;
  }) || [];

  return {
    tasks: sortedTasks,
    categories,
    sections,
    isLoading: isLoading || categoriesLoading || sectionsLoading || authLoading,
    error: error || categoriesError || sectionsError,
    addTask,
    updateTask,
    deleteTask,
    createCategory,
    updateCategory,
    deleteCategory,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    reorderTasks,
    reorderSections,
    onToggleFocusMode,
    onLogDoTodayOff,
    doTodayOffLog,
    refetchTasks: refetch,
  };
};