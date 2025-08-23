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
  UserSettings,
} from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';
import { useDoTodayOffLog } from './useDoTodayOffLog';
import { startOfDay, isToday, parseISO } from 'date-fns';
import { useSettings } from '@/context/SettingsContext';

export const useTasks = ({ userId: propUserId, isDemo = false, demoUserId }: UseTasksProps) => {
  const { user } = useAuth();
  const currentUserId = isDemo ? demoUserId : propUserId || user?.id;
  const queryClient = useQueryClient();
  const { addDoTodayOffLogEntry, deleteDoTodayOffLogEntry, offLogEntries: doTodayOffLog } = useDoTodayOffLog({ userId: currentUserId });
  const { updateSettings } = useSettings();

  const { data: tasks, isLoading, error } = useQuery<Task[], Error>({
    queryKey: ['tasks', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, task_categories(*)')
        .eq('user_id', currentUserId)
        .order('order', { ascending: true });

      if (error) throw error;
      return data.map(task => ({
        ...task,
        category: task.task_categories ? { id: task.task_categories.id, name: task.task_categories.name, color: task.task_categories.color, user_id: task.task_categories.user_id, created_at: task.task_categories.created_at } : null,
      })) as Task[];
    },
    enabled: !!currentUserId,
  });

  const { data: categories } = useQuery<TaskCategory[], Error>({
    queryKey: ['task_categories', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .eq('user_id', currentUserId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as TaskCategory[];
    },
    enabled: !!currentUserId,
  });

  const { data: sections } = useQuery<TaskSection[], Error>({
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
    enabled: !!currentUserId,
  });

  const addTaskMutation = useMutation<Task, Error, NewTaskData, unknown>({
    mutationFn: async (newTaskData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...newTaskData, user_id: currentUserId })
        .select('*, task_categories(*)')
        .single();

      if (error) throw error;
      return {
        ...data,
        category: data.task_categories ? { id: data.task_categories.id, name: data.task_categories.name, color: data.task_categories.color, user_id: data.task_categories.user_id, created_at: data.task_categories.created_at } : null,
      } as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] });
    },
  });

  const updateTaskMutation = useMutation<Task, Error, { id: string; updates: UpdateTaskData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .eq('user_id', currentUserId)
        .select('*, task_categories(*)')
        .single();

      if (error) throw error;
      return {
        ...data,
        category: data.task_categories ? { id: data.task_categories.id, name: data.task_categories.name, color: data.task_categories.color, user_id: data.task_categories.user_id, created_at: data.task_categories.created_at } : null,
      } as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['userSettings', currentUserId] }); // Invalidate settings to update focused task
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['userSettings', currentUserId] }); // Invalidate settings to update focused task
    },
  });

  const addCategoryMutation = useMutation<TaskCategory, Error, NewTaskCategoryData, unknown>({
    mutationFn: async (newCategoryData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('task_categories')
        .insert({ ...newCategoryData, user_id: currentUserId })
        .select()
        .single();

      if (error) throw error;
      return data as TaskCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_categories', currentUserId] });
    },
  });

  const updateCategoryMutation = useMutation<TaskCategory, Error, { id: string; updates: UpdateTaskCategoryData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('task_categories')
        .update(updates)
        .eq('id', id)
        .eq('user_id', currentUserId)
        .select()
        .single();

      if (error) throw error;
      return data as TaskCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_categories', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] }); // Tasks might need category name/color updates
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['task_categories', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] }); // Tasks might need category name/color updates
    },
  });

  const addSectionMutation = useMutation<TaskSection, Error, NewTaskSectionData, unknown>({
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
    },
  });

  const updateSectionMutation = useMutation<TaskSection, Error, { id: string; updates: UpdateTaskSectionData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('task_sections')
        .update(updates)
        .eq('id', id)
        .eq('user_id', currentUserId)
        .select()
        .single();

      if (error) throw error;
      return data as TaskSection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_sections', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] }); // Tasks might need section name updates
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['task_sections', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] }); // Tasks might need section name updates
    },
  });

  const updateTasksOrderMutation = useMutation<void, Error, { id: string; order: number; parent_task_id: string | null; section_id: string | null; }[], unknown>({
    mutationFn: async (updates) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase.rpc('update_tasks_order', { updates });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] });
    },
  });

  const updateSectionsOrderMutation = useMutation<void, Error, { id: string; order: number; name: string; include_in_focus_mode: boolean | null; }[], unknown>({
    mutationFn: async (updates) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase.rpc('update_sections_order', { updates });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_sections', currentUserId] });
    },
  });

  const reorderTasks = async (tasksToUpdate: { id: string; order: number; parent_task_id: string | null | undefined; section_id: string | null | undefined; }[]) => {
    const formattedUpdates = tasksToUpdate.map(t => ({
      id: t.id,
      order: t.order,
      parent_task_id: t.parent_task_id || null,
      section_id: t.section_id || null,
    }));
    await updateTasksOrderMutation.mutateAsync(formattedUpdates);
  };

  const reorderSections = async (updates: { id: string; order: number; name: string; include_in_focus_mode: boolean | undefined; }[]) => {
    const formattedUpdates = updates.map(s => ({
      id: s.id,
      order: s.order,
      name: s.name,
      include_in_focus_mode: s.include_in_focus_mode ?? null,
    }));
    await updateSectionsOrderMutation.mutateAsync(formattedUpdates);
  };

  const getSortedTasks = (taskList: Task[] | undefined) => {
    if (!taskList) return [];
    return [...taskList].sort((a, b) => {
      if (a.order !== null && b.order !== null) {
        return a.order - b.order;
      }
      return 0;
    });
  };

  const onToggleFocusMode = async (taskId: string, isFocused: boolean) => {
    if (!currentUserId) return;
    const currentFocusedTaskId = (queryClient.getQueryData(['userSettings', currentUserId]) as UserSettings)?.focused_task_id;
    const newFocusedTaskId = currentFocusedTaskId === taskId ? null : taskId;

    try {
      await updateSettings({ focused_task_id: newFocusedTaskId });
      queryClient.setQueryData(['userSettings', currentUserId], (old: UserSettings | undefined) => {
        return old ? { ...old, focused_task_id: newFocusedTaskId } : undefined;
      });
      toast.success(newFocusedTaskId ? 'Task added to focus mode!' : 'Task removed from focus mode.');
    } catch (error) {
      toast.error('Failed to update focus mode.');
      console.error('Error toggling focus mode:', error);
    }
  };

  const onLogDoTodayOff = async (taskId: string) => {
    if (!currentUserId) return;

    const isCurrentlyOff = doTodayOffLog?.some((entry: DoTodayOffLogEntry) => entry.task_id === taskId && isToday(parseISO(entry.off_date)));

    if (isCurrentlyOff) {
      const entryToDelete = doTodayOffLog?.find((entry: DoTodayOffLogEntry) => entry.task_id === taskId && isToday(parseISO(entry.off_date)));
      if (entryToDelete) {
        await deleteDoTodayOffLogEntry(entryToDelete.id);
        toast.success('Task marked as "Do Today"!');
      }
    } else {
      await addDoTodayOffLogEntry({ task_id: taskId, off_date: startOfDay(new Date()).toISOString().split('T')[0] });
      toast.success('Task marked as "Do Today Off"!');
    }
  };

  return {
    tasks: tasks || [],
    categories: categories || [],
    sections: sections || [],
    isLoading,
    error,
    addTask: addTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    addCategory: addCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    addSection: addSectionMutation.mutateAsync,
    updateSection: updateSectionMutation.mutateAsync,
    deleteSection: deleteSectionMutation.mutateAsync,
    reorderTasks,
    reorderSections,
    getSortedTasks,
    onToggleFocusMode,
    onLogDoTodayOff,
    doTodayOffLog: doTodayOffLog || [],
  };
};