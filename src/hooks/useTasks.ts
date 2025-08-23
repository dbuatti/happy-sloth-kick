import { useAuth } from '@/context/AuthContext';
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
  Json,
} from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';
import { startOfDay, isToday, parseISO } from 'date-fns';
import { useDoTodayOffLog } from './useDoTodayOffLog';

// Helper to clean task data for DB insertion/update
const cleanTaskForDb = (task: Partial<NewTaskData | UpdateTaskData>): Partial<NewTaskData | UpdateTaskData> => {
  const cleanedTask = { ...task };
  // Remove properties that are not directly columns in the 'tasks' table
  delete (cleanedTask as any).category_color;
  delete (cleanedTask as any).is_daily_recurring;
  return cleanedTask;
};

export const useTasks = ({ userId: propUserId, isDemo = false, demoUserId }: UseTasksProps) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : propUserId || user?.id;
  const queryClient = useQueryClient();
  const { addDoTodayOffLogEntry, deleteDoTodayOffLogEntry, doTodayOffLog } = useDoTodayOffLog({ userId: currentUserId });

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
        category: task.category ? { id: task.category.id, name: task.category.name, color: task.category.color, user_id: task.category.user_id, created_at: task.category.created_at } : null,
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

  const addTaskMutation = useMutation<Task, Error, NewTaskData, unknown>({
    mutationFn: async (newTaskData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('tasks')
        .insert(cleanTaskForDb({ ...newTaskData, user_id: currentUserId }))
        .select('*, category(color, name)')
        .single();
      if (error) throw error;
      return {
        ...data,
        category: data.category ? { id: data.category.id, name: data.category.name, color: data.category.color, user_id: data.category.user_id, created_at: data.category.created_at } : null,
      } as Task;
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['userSettings', currentUserId] }); // Invalidate settings to update focused task if needed
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
      return {
        ...data,
        category: data.category ? { id: data.category.id, name: data.category.name, color: data.category.color, user_id: data.category.user_id, created_at: data.category.created_at } : null,
      } as Task;
    },
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['userSettings', currentUserId] }); // Invalidate settings to update focused task if needed
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
      queryClient.invalidateQueries({ queryKey: ['userSettings', currentUserId] }); // Invalidate settings to update focused task if needed
      toast.success('Task deleted!');
    },
  });

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
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_categories', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] }); // Tasks might need to reflect category name/color changes
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
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] }); // Tasks might need to reflect category removal
      toast.success('Category deleted!');
    },
  });

  const createSectionMutation = useMutation<TaskSection, Error, NewTaskSectionData, unknown>({
    mutationFn: async (newSectionData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('task_sections')
        .insert({ ...newSectionData, user_id: currentUserId })
        .select('*')
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
        .select('*')
        .single();
      if (error) throw error;
      return data as TaskSection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_sections', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] }); // Tasks might need to reflect section name changes
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
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] }); // Tasks might need to reflect section removal
      toast.success('Section deleted!');
    },
  });

  const updateSectionsOrderMutation = useMutation<void, Error, { id: string; order: number; name: string; include_in_focus_mode: boolean | null; }[], unknown>({
    mutationFn: async (updates) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase.rpc('update_sections_order', { updates: updates as Json }); // Cast to Json for rpc
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_sections', currentUserId] });
    },
  });

  const updateTasksOrderMutation = useMutation<void, Error, { id: string; order: number; parent_task_id: string | null; section_id: string | null; }[], unknown>({
    mutationFn: async (updates) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase.rpc('update_tasks_order', { updates: updates as Json }); // Cast to Json for rpc
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] });
    },
  });

  const reorderTasks = async (activeId: string, overId: string, parentId: string | null, newSectionId: string | null) => {
    if (!tasks) return;

    const activeIndex = tasks.findIndex((t) => t.id === activeId);
    const overIndex = tasks.findIndex((t) => t.id === overId);

    let newTasks = arrayMove(tasks, activeIndex, overIndex);

    // Update parent_task_id and section_id for the moved task
    const movedTask = newTasks.find(t => t.id === activeId);
    if (movedTask) {
      movedTask.parent_task_id = parentId;
      movedTask.section_id = newSectionId;
    }

    // Recalculate order for affected tasks
    const tasksToUpdate = newTasks
      .filter(t => t.parent_task_id === parentId && t.section_id === newSectionId)
      .map((t, index) => ({
        id: t.id,
        order: index,
        parent_task_id: t.parent_task_id,
        section_id: t.section_id,
      }));

    await updateTasksOrderMutation.mutateAsync(tasksToUpdate);
  };

  const reorderSections = async (activeId: string, overId: string) => {
    if (!sections) return;

    const activeIndex = sections.findIndex((s) => s.id === activeId);
    const overIndex = sections.findIndex((s) => s.id === overId);

    const newSections = arrayMove(sections, activeIndex, overIndex);

    const updates = newSections.map((section, index) => ({
      id: section.id,
      order: index,
      name: section.name,
      include_in_focus_mode: section.include_in_focus_mode,
    }));

    await updateSectionsOrderMutation.mutateAsync(updates);
  };

  const updateSectionIncludeInFocusMode = useMutation<TaskSection, Error, { sectionId: string; include: boolean }, unknown>({
    mutationFn: async ({ sectionId, include }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('task_sections')
        .update({ include_in_focus_mode: include })
        .eq('id', sectionId)
        .select('*')
        .single();
      if (error) throw error;
      return data as TaskSection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_sections', currentUserId] });
      toast.success('Section focus mode updated!');
    },
  });

  const getSubtasks = (taskId: string) => {
    return tasks?.filter(task => task.parent_task_id === taskId).sort((a, b) => {
      if (a.order !== null && b.order !== null) {
        return a.order - b.order;
      }
      return 0;
    }) || [];
  };

  const toggleFocusMode = async (taskId: string, isFocused: boolean) => {
    if (!currentUserId) return;
    const currentFocusedTaskId = (queryClient.getQueryData(['userSettings', currentUserId]) as UserSettings)?.focused_task_id;
    const newFocusedTaskId = currentFocusedTaskId === taskId ? null : taskId;

    await queryClient.cancelQueries({ queryKey: ['userSettings', currentUserId] });

    const previousSettings = queryClient.getQueryData(['userSettings', currentUserId]);

    queryClient.setQueryData(['userSettings', currentUserId], (old: UserSettings | undefined) => {
      return old ? { ...old, focused_task_id: newFocusedTaskId } : undefined;
    });

    try {
      await supabase
        .from('user_settings')
        .update({ focused_task_id: newFocusedTaskId })
        .eq('user_id', currentUserId);
      toast.success(newFocusedTaskId ? 'Task set as focus!' : 'Focus removed!');
    } catch (error) {
      toast.error('Failed to update focus task.');
      queryClient.setQueryData(['userSettings', currentUserId], previousSettings);
    }
  };

  const logDoTodayOff = async (taskId: string) => {
    if (!currentUserId) return;

    const isCurrentlyOff = doTodayOffLog?.some(entry => entry.task_id === taskId && isToday(parseISO(entry.off_date)));

    if (isCurrentlyOff) {
      const entryToDelete = doTodayOffLog?.find(entry => entry.task_id === taskId && isToday(parseISO(entry.off_date)));
      if (entryToDelete) {
        await deleteDoTodayOffLogEntry.mutateAsync(entryToDelete.id);
        toast.success('Task marked as "Do Today"!');
      }
    } else {
      await addDoTodayOffLogEntry.mutateAsync({ task_id: taskId, off_date: startOfDay(new Date()).toISOString().split('T')[0] });
      toast.success('Task marked as "Do Today Off"!');
    }
  };

  return {
    tasks,
    categories,
    sections,
    isLoading: isLoading || categoriesLoading || sectionsLoading,
    error: error || categoriesError || sectionsError,
    refetchTasks: refetch,
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
    updateSectionIncludeInFocusMode: updateSectionIncludeInFocusMode.mutateAsync,
    getSubtasks,
    onToggleFocusMode: toggleFocusMode,
    onLogDoTodayOff: logDoTodayOff,
    doTodayOffLog,
  };
};