import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskSection, TaskCategory, DoTodayOffLog } from '@/types/task-management';
import { addDays, addMonths, addYears, format, parseISO, isSameDay, isPast, startOfDay } from 'date-fns'; // Added isSameDay, isPast, startOfDay

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

// Helper to calculate next due date for recurring tasks
const calculateNextDueDate = (task: Task): string | null => {
  if (!task.due_date || task.recurring_type === 'none') return null;

  let nextDate = parseISO(task.due_date);
  switch (task.recurring_type) {
    case 'daily':
      nextDate = addDays(nextDate, 1);
      break;
    case 'weekly':
      nextDate = addDays(nextDate, 7);
      break;
    case 'monthly':
      nextDate = addMonths(nextDate, 1);
      break;
    case 'yearly':
      nextDate = addYears(nextDate, 1);
      break;
    default:
      return null;
  }
  return format(nextDate, 'yyyy-MM-dd');
};

// Data Fetching Functions
const fetchTaskSections = async (currentDate: Date, userId: string): Promise<TaskSection[]> => {
  const { data: sections, error: sectionsError } = await supabase
    .from('task_sections')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });

  if (sectionsError) throw new Error(sectionsError.message);

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });

  if (tasksError) throw new Error(tasksError.message);

  const { data: offLogs, error: offLogsError } = await supabase
    .from('do_today_off_log')
    .select('task_id')
    .eq('user_id', userId)
    .eq('off_date', format(currentDate, 'yyyy-MM-dd'));

  if (offLogsError) throw new Error(offLogsError.message);

  const skippedTaskIds = new Set(offLogs.map(log => log.task_id));

  const sectionMap = new Map<string, TaskSection>(
    sections.map((section) => ({ ...section, tasks: [] })).map((section) => [section.id, section])
  );

  const allTasks: Task[] = tasks;
  const processedTaskIds = new Set<string>();
  const tasksForDisplay: Task[] = [];

  // First, add all non-recurring tasks and specific instances of recurring tasks
  allTasks.forEach(task => {
    if (task.recurring_type === 'none' || task.original_task_id) {
      tasksForDisplay.push(task);
      processedTaskIds.add(task.id);
    }
  });

  // Then, handle master recurring tasks
  allTasks.forEach(masterTask => {
    if (masterTask.recurring_type !== 'none' && !masterTask.original_task_id && !processedTaskIds.has(masterTask.id)) {
      // Check if an instance of this master task already exists for today
      const existingInstanceForToday = allTasks.find(
        t => t.original_task_id === masterTask.id && t.due_date && isSameDay(parseISO(t.due_date), currentDate)
      );

      if (existingInstanceForToday) {
        // If an instance exists, we'll use that and skip the master task
        if (!processedTaskIds.has(existingInstanceForToday.id)) {
          tasksForDisplay.push(existingInstanceForToday);
          processedTaskIds.add(existingInstanceForToday.id);
        }
      } else if (!skippedTaskIds.has(masterTask.id)) {
        // If no instance exists for today and it hasn't been skipped,
        // determine if the master task itself should be shown or "rolled over"
        const masterTaskDueDate = masterTask.due_date ? parseISO(masterTask.due_date) : null;

        if (masterTaskDueDate && (isSameDay(masterTaskDueDate, currentDate) || (isPast(masterTaskDueDate) && masterTask.status !== 'completed'))) {
          // If master task is due today or overdue and not completed, show it
          tasksForDisplay.push(masterTask);
          processedTaskIds.add(masterTask.id);
        } else if (!masterTaskDueDate && masterTask.status !== 'completed') {
          // If no due date and not completed, show it (e.g., a general recurring task)
          tasksForDisplay.push(masterTask);
          processedTaskIds.add(masterTask.id);
        }
      }
    }
  });

  const topLevelTasks = tasksForDisplay.filter((task) => !task.parent_task_id);
  const tasksWithSubtasks = buildTaskTree(topLevelTasks, tasksForDisplay);

  tasksWithSubtasks.forEach((task) => {
    if (task.section_id && sectionMap.has(task.section_id)) {
      sectionMap.get(task.section_id)?.tasks.push(task);
    }
  });

  return Array.from(sectionMap.values());
};

const fetchTaskCategories = async (userId: string): Promise<TaskCategory[]> => {
  const { data, error } = await supabase.from('task_categories').select('*').eq('user_id', userId);
  if (error) throw new Error(error.message);
  return data;
};

// Custom Hook
export const useTaskManagement = (currentDate: Date) => { // currentDate is now a parameter
  const queryClient = useQueryClient();
  const userId = supabase.auth.currentUser?.id;

  // --- Queries ---
  const {
    data: sections = [],
    isLoading: isLoadingSections,
    error: sectionsError,
  } = useQuery<TaskSection[], Error>({
    queryKey: ['taskSections', currentDate, userId], // Added currentDate to queryKey
    queryFn: () => fetchTaskSections(currentDate, userId!), // Pass currentDate and userId
    enabled: !!userId,
  });

  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useQuery<TaskCategory[], Error>({
    queryKey: ['taskCategories', userId],
    queryFn: () => fetchTaskCategories(userId!),
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
      queryClient.invalidateQueries({ queryKey: ['taskSections', currentDate, userId] }); // Invalidate with currentDate
      toast.success('Task added successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to add task: ${error.message}`);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask: Partial<Task>): Promise<Task> => {
      if (!userId) throw new Error('User not authenticated.');

      // Handle recurring task completion
      if (updatedTask.status === 'completed' && updatedTask.recurring_type !== 'none' && updatedTask.id) {
        const originalTask = sections.flatMap(s => s.tasks).find(t => t.id === updatedTask.id);
        if (originalTask) {
          const nextDueDate = calculateNextDueDate(originalTask);
          if (nextDueDate) {
            // Create a new instance of the recurring task for the next due date
            const { error: newError } = await supabase.from('tasks').insert({
              description: originalTask.description,
              status: 'to-do',
              user_id: userId,
              priority: originalTask.priority,
              due_date: nextDueDate,
              notes: originalTask.notes,
              remind_at: originalTask.remind_at,
              section_id: originalTask.section_id,
              order: originalTask.order, // Keep same order for now, reordering can happen later
              parent_task_id: originalTask.parent_task_id,
              recurring_type: originalTask.recurring_type,
              original_task_id: originalTask.original_task_id || originalTask.id, // Link to the original recurring task
              category: originalTask.category,
              link: originalTask.link,
              image_url: originalTask.image_url,
            });
            if (newError) {
              console.error('Failed to create next recurring task instance:', newError.message);
              toast.error(`Failed to create next recurring task instance: ${newError.message}`);
            }
          }
        }
      }

      const { data, error } = await supabase.from('tasks').update(updatedTask).eq('id', updatedTask.id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections', currentDate, userId] }); // Invalidate with currentDate
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
      queryClient.invalidateQueries({ queryKey: ['taskSections', currentDate, userId] }); // Invalidate with currentDate
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
      queryClient.invalidateQueries({ queryKey: ['taskSections', currentDate, userId] }); // Invalidate with currentDate
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
      queryClient.invalidateQueries({ queryKey: ['taskSections', currentDate, userId] }); // Invalidate with currentDate
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
      queryClient.invalidateQueries({ queryKey: ['taskSections', currentDate, userId] }); // Invalidate with currentDate
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
      queryClient.invalidateQueries({ queryKey: ['taskSections', currentDate, userId] }); // Invalidate with currentDate
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
      queryClient.invalidateQueries({ queryKey: ['taskSections', currentDate, userId] }); // Invalidate with currentDate
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
      queryClient.invalidateQueries({ queryKey: ['taskCategories', userId] });
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
      queryClient.invalidateQueries({ queryKey: ['taskCategories', userId] });
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
      queryClient.invalidateQueries({ queryKey: ['taskCategories', userId] });
      toast.success('Category deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });

  // Do Today Off Log
  const logTaskOffTodayMutation = useMutation({
    mutationFn: async (logEntry: Partial<DoTodayOffLog>): Promise<DoTodayOffLog> => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase.from('do_today_off_log').insert({ ...logEntry, user_id: userId }).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSections', currentDate, userId] }); // Invalidate with currentDate
      toast.success('Task marked off for today!');
    },
    onError: (error) => {
      toast.error(`Failed to mark task off: ${error.message}`);
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
    logTaskOffToday: logTaskOffTodayMutation.mutate,
  };
};