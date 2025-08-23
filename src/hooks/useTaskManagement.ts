import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskSection, TaskCategory } from '@/types/task-management';

// Helper function to build task tree (tasks with subtasks)
const buildTaskTree = (parentTasks: Task[], allTasks: Task[]): Task[] => {
  return parentTasks.map((task) => ({
    ...task,
    subtasks: buildTaskTree(
      allTasks.filter((sub) => sub.parent_task_id === task.id).sort((a, b) => a.order - b.order),
      allTasks
    ),
  }));
};

// Data Fetching Functions
const fetchTaskSections = async (): Promise<TaskSection[]> => {
  const { data: sections, error: sectionsError } = await supabase
    .from('task_sections')
    .select('*')
    .order('order', { ascending: true });

  if (sectionsError) throw new Error(sectionsError.message);

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .order('order', { ascending: true });

  if (tasksError) throw new Error(tasksError.message);

  const sectionMap = new Map<string, TaskSection>(
    sections.map((section) => ({ ...section, tasks: [] })).map((section) => [section.id, section])
  );

  const topLevelTasks = tasks.filter((task) => !task.parent_task_id);
  const tasksWithSubtasks = buildTaskTree(topLevelTasks, tasks);

  tasksWithSubtasks.forEach((task) => {
    if (task.section_id && sectionMap.has(task.section_id)) {
      sectionMap.get(task.section_id)?.tasks.push(task);
    }
  });

  return Array.from(sectionMap.values());
};

const fetchTaskCategories = async (): Promise<TaskCategory[]> => {
  const { data, error } = await supabase.from('task_categories').select('*');
  if (error) throw new Error(error.message);
  return data;
};

// Custom Hook
export const useTaskManagement = () => {
  const queryClient = useQueryClient();
  const userId = supabase.auth.currentUser?.id;

  // --- Queries ---
  const {
    data: sections = [],
    isLoading: isLoadingSections,
    error: sectionsError,
  } = useQuery<TaskSection[], Error>({
    queryKey: ['taskSections'],
    queryFn: fetchTaskSections,
    enabled: !!userId,
  });

  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useQuery<TaskCategory[], Error>({
    queryKey: ['taskCategories'],
    queryFn: fetchTaskCategories,
    enabled: !!userId,
  });

  // --- Mutations ---

  // Tasks
  const addTaskMutation = useMutation({
    mutationFn: async (newTask: Partial<Task>): Promise<Task> => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase.from('tasks').insert({ ...newTask, user_id: userId }).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections'] });
      toast.success('Task added successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to add task: ${error.message}`);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask: Partial<Task>): Promise<Task> => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase.from('tasks').update(updatedTask).eq('id', updatedTask.id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections'] });
      toast.success('Task updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections'] });
      toast.success('Task deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete task: ${error.message}`);
    },
  });

  const updateTaskOrdersMutation = useMutation({
    mutationFn: async (updates: { id: string; order: number; section_id: string | null; parent_task_id: string | null }[]) => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase.rpc('update_tasks_order', { updates });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections'] });
      toast.success('Task order updated!');
    },
    onError: (error) => {
      toast.error(`Failed to update task order: ${error.message}`);
    },
  });

  // Sections
  const addSectionMutation = useMutation({
    mutationFn: async (newSection: Partial<TaskSection>): Promise<TaskSection> => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase.from('task_sections').insert({ ...newSection, user_id: userId, order: sections.length }).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections'] });
      toast.success('Section added successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to add section: ${error.message}`);
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async (updatedSection: Partial<TaskSection>): Promise<TaskSection> => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('task_sections')
        .update(updatedSection)
        .eq('id', updatedSection.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections'] });
      toast.success('Section updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update section: ${error.message}`);
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string): Promise<void> => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase.from('task_sections').delete().eq('id', sectionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections'] });
      toast.success('Section deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete section: ${error.message}`);
    },
  });

  const updateSectionOrdersMutation = useMutation({
    mutationFn: async (updates: { id: string; order: number; name: string; include_in_focus_mode: boolean }[]) => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase.rpc('update_sections_order', { updates });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections'] });
      toast.success('Section order updated!');
    },
    onError: (error) => {
      toast.error(`Failed to update section order: ${error.message}`);
    },
  });

  // Categories
  const addCategoryMutation = useMutation({
    mutationFn: async (newCategory: Partial<TaskCategory>): Promise<TaskCategory> => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase.from('task_categories').insert({ ...newCategory, user_id: userId }).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskCategories'] });
      toast.success('Category added successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to add category: ${error.message}`);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (updatedCategory: Partial<TaskCategory>): Promise<TaskCategory> => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('task_categories')
        .update(updatedCategory)
        .eq('id', updatedCategory.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskCategories'] });
      toast.success('Category updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string): Promise<void> => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase.from('task_categories').delete().eq('id', categoryId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskCategories'] });
      toast.success('Category deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });

  return {
    sections,
    isLoadingSections,
    sectionsError,
    categories,
    isLoadingCategories,
    categoriesError,
    addTask: addTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    updateTaskOrders: updateTaskOrdersMutation.mutateAsync,
    addSection: addSectionMutation.mutate,
    updateSection: updateSectionMutation.mutate,
    deleteSection: deleteSectionMutation.mutate,
    updateSectionOrders: updateSectionOrdersMutation.mutateAsync,
    addCategory: addCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate,
    deleteCategory: deleteCategoryMutation.mutate,
  };
};