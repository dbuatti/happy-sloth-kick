import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import {
  format,
  isSameDay,
  startOfWeek,
  startOfMonth,
  parseISO,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfDay,
} from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

// Type Definitions
export interface Task {
  id: string; // Can be a UUID or a virtual ID (e.g., "virtual-...")
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived'; // Added 'skipped' and 'archived'
  user_id: string;
  category?: string | null; // UUID, can be null
  priority?: 'low' | 'medium' | 'high' | 'urgent' | null; // Can be null
  due_date?: string | null; // ISO date string (e.g., 'YYYY-MM-DD'), can be null
  notes?: string | null; // Can be null
  remind_at?: string | null; // ISO datetime string, can be null
  section_id?: string | null; // UUID, can be null
  order?: number | null; // Can be null
  parent_task_id?: string | null; // UUID, can be null
  recurring_type?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | null; // Added 'yearly', can be null
  original_task_id?: string | null; // UUID of the recurring template task, can be null
  link?: string | null; // Can be null
  image_url?: string | null; // Can be null
  created_at: string; // Required
  updated_at?: string | null; // Can be null
}

export type NewTaskData = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'user_id'>;
export type UpdateTaskData = Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null; // Can be null
  created_at: string; // Required
  include_in_focus_mode: boolean;
}

export type NewTaskSectionData = Omit<TaskSection, 'id' | 'created_at' | 'user_id'>;
export type UpdateTaskSectionData = Partial<Omit<TaskSection, 'id' | 'user_id' | 'created_at'>>;

export interface Category {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

export type NewCategoryData = Omit<Category, 'id' | 'created_at' | 'user_id'>;
export type UpdateCategoryData = Partial<Omit<Category, 'id' | 'user_id' | 'created_at'>>;

interface UseTasksOptions {
  currentDate?: Date;
  userId?: string; // Optional userId for demo mode
}

const isValidUuid = (uuid: string) => {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid);
};

export const useTasks = ({ currentDate = new Date(), userId: propUserId }: UseTasksOptions = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = propUserId || user?.id;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<Task[]>([]); // All recurring tasks from DB
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('order', { ascending: true })
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      const nonRecurring = tasksData.filter(t => t.recurring_type === 'none' || !t.recurring_type);
      const recurring = tasksData.filter(t => t.recurring_type !== 'none' && t.recurring_type !== null);

      setTasks(nonRecurring); // Set non-recurring tasks directly to 'tasks' state
      setRecurringTasks(recurring);

    } catch (err: any) {
      console.error('Error fetching tasks:', err.message);
      setError(err.message);
      showError('Failed to fetch tasks.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const fetchSections = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('task_sections')
        .select('*')
        .eq('user_id', userId)
        .order('order', { ascending: true });
      if (error) throw error;
      setSections(data);
    } catch (err: any) {
      console.error('Error fetching sections:', err.message);
      showError('Failed to fetch sections.');
    }
  }, [userId]);

  const fetchCategories = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });
      if (error) throw error;
      setAllCategories(data);
    } catch (err: any) {
      console.error('Error fetching categories:', err.message);
      showError('Failed to fetch categories.');
    }
  }, [userId]);

  useEffect(() => {
    fetchTasks();
    fetchSections();
    fetchCategories();
  }, [fetchTasks, fetchSections, fetchCategories]);

  // Realtime subscriptions
  useEffect(() => {
    if (!userId) return;

    const tasksChannel = supabase
      .channel('public:tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, payload => {
        if (payload.eventType === 'INSERT') {
          const newTask = payload.new as Task;
          if (newTask.recurring_type === 'none' || !newTask.recurring_type) {
            setTasks(prev => [...prev, newTask]);
          } else {
            setRecurringTasks(prev => [...prev, newTask]);
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedTask = payload.new as Task;
          if (updatedTask.recurring_type === 'none' || !updatedTask.recurring_type) {
            setTasks(prev => prev.map(task => (task.id === payload.old.id ? updatedTask : task)));
          } else {
            setRecurringTasks(prev => prev.map(task => (task.id === payload.old.id ? updatedTask : task)));
          }
        } else if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(task => task.id !== payload.old.id));
          setRecurringTasks(prev => prev.filter(task => task.id !== payload.old.id));
        }
      })
      .subscribe();

    const sectionsChannel = supabase
      .channel('public:task_sections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_sections', filter: `user_id=eq.${userId}` }, payload => {
        if (payload.eventType === 'INSERT') {
          setSections(prev => [...prev, payload.new as TaskSection]);
        } else if (payload.eventType === 'UPDATE') {
          setSections(prev => prev.map(section => (section.id === payload.old.id ? payload.new as TaskSection : section)));
        } else if (payload.eventType === 'DELETE') {
          setSections(prev => prev.filter(section => section.id !== payload.old.id));
        }
      })
      .subscribe();

    const categoriesChannel = supabase
      .channel('public:task_categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_categories', filter: `user_id=eq.${userId}` }, payload => {
        if (payload.eventType === 'INSERT') {
          setAllCategories(prev => [...prev, payload.new as Category]);
        } else if (payload.eventType === 'UPDATE') {
          setAllCategories(prev => prev.map(category => (category.id === payload.old.id ? payload.new as Category : category)));
        } else if (payload.eventType === 'DELETE') {
          setAllCategories(prev => prev.filter(category => category.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(sectionsChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, [userId]);

  // Generate virtual tasks for recurring tasks
  const generatedRecurringTasks = useMemo(() => {
    const generated: Task[] = [];
    const today = startOfDay(currentDate);
    const oneYearFromNow = addYears(today, 1); // Generate for up to one year in the future

    recurringTasks.forEach(task => {
      let currentInstanceDate = parseISO(task.created_at); // Start from creation date
      if (task.due_date) {
        currentInstanceDate = parseISO(task.due_date);
      }

      while (currentInstanceDate && (isSameDay(currentInstanceDate, oneYearFromNow) || currentInstanceDate < oneYearFromNow)) {
        let shouldGenerate = false;
        let instanceDueDate: Date | undefined;

        if (task.recurring_type === 'daily') {
          shouldGenerate = true;
          instanceDueDate = currentInstanceDate;
        } else if (task.recurring_type === 'weekly') {
          if (isSameDay(currentInstanceDate, startOfWeek(currentInstanceDate))) { // Assuming weekly tasks recur on start of week
            shouldGenerate = true;
            instanceDueDate = currentInstanceDate;
          }
        } else if (task.recurring_type === 'monthly') {
          if (isSameDay(currentInstanceDate, startOfMonth(currentInstanceDate))) { // Assuming monthly tasks recur on start of month
            shouldGenerate = true;
            instanceDueDate = currentInstanceDate;
          }
        } else if (task.recurring_type === 'yearly') {
          if (isSameDay(currentInstanceDate, new Date(currentInstanceDate.getFullYear(), 0, 1))) { // Assuming yearly tasks recur on Jan 1
            shouldGenerate = true;
            instanceDueDate = currentInstanceDate;
          }
        }

        if (shouldGenerate && instanceDueDate) {
          // Check if a real task already exists for this recurring instance's date
          const existingRealTask = tasks.find(
            t => t.original_task_id === task.id && t.due_date && isSameDay(parseISO(t.due_date), instanceDueDate!)
          );

          if (!existingRealTask) {
            generated.push({
              ...task,
              id: `virtual-${task.id}-${format(instanceDueDate, 'yyyy-MM-dd')}`, // Unique virtual ID
              due_date: format(instanceDueDate, 'yyyy-MM-dd'),
              status: 'to-do', // Virtual instances are always 'to-do' by default
              original_task_id: task.id, // Reference to the real recurring task
              created_at: format(new Date(), 'yyyy-MM-ddTHH:mm:ssZ'), // Set a valid created_at for virtual tasks
            });
          }
        }

        // Increment date for next iteration
        if (task.recurring_type === 'daily') {
          currentInstanceDate = addDays(currentInstanceDate, 1);
        } else if (task.recurring_type === 'weekly') {
          currentInstanceDate = addWeeks(currentInstanceDate, 1);
        } else if (task.recurring_type === 'monthly') {
          currentInstanceDate = addMonths(currentInstanceDate, 1);
        } else if (task.recurring_type === 'yearly') {
          currentInstanceDate = addYears(currentInstanceDate, 1);
        } else {
          break; // Should not happen for recurring tasks
        }
      }
    });
    return generated;
  }, [recurringTasks, tasks, currentDate]);

  // Combine real tasks and generated recurring tasks
  const allTasksCombined = useMemo(() => {
    // Filter out any generated recurring tasks that have a corresponding real task
    const combinedTasks = [
      ...tasks, // These are the non-recurring tasks from DB
      ...generatedRecurringTasks.filter(genTask =>
        !tasks.some(realTask => realTask.original_task_id === genTask.original_task_id && realTask.due_date && isSameDay(parseISO(realTask.due_date), parseISO(genTask.due_date || '')))
      )
    ];
    return combinedTasks;
  }, [tasks, generatedRecurringTasks]);


  const createTask = async (newTask: NewTaskData): Promise<Task | null> => {
    if (!userId) {
      showError('User not authenticated.');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...newTask, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      showSuccess('Task created successfully!');
      queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
      return data;
    } catch (err: any) {
      console.error('useTasks: Error creating task:', err.message);
      showError(`Failed to create task: ${err.message}`);
      return null;
    }
  };

  const updateTask = async (taskId: string, updates: UpdateTaskData): Promise<Task | null> => {
    if (!userId) {
      showError('User not authenticated.');
      return null;
    }
    try {
      if (!isValidUuid(taskId)) {
        // This is a virtual task ID. We need to create a new, non-recurring task.
        console.log(`Attempting to update virtual task ID: ${taskId}. Creating a new task instead.`);

        const virtualTaskToUpdate = allTasksCombined.find(t => t.id === taskId); // Find the virtual task in the current state

        if (!virtualTaskToUpdate) {
          console.error("Virtual task not found in current state for update. Cannot create new task.");
          showError("Failed to update task: Virtual task not found.");
          return null;
        }

        // Prepare data for a new task (detached from recurring)
        // Use properties from the virtual task as base, then apply updates
        const newTaskData: NewTaskData = {
          description: updates.description ?? virtualTaskToUpdate.description,
          status: updates.status ?? virtualTaskToUpdate.status,
          category: updates.category ?? virtualTaskToUpdate.category,
          priority: updates.priority ?? virtualTaskToUpdate.priority,
          due_date: updates.due_date ?? virtualTaskToUpdate.due_date, // Crucial: specific date of this instance
          notes: updates.notes ?? virtualTaskToUpdate.notes,
          remind_at: updates.remind_at ?? virtualTaskToUpdate.remind_at,
          section_id: updates.section_id ?? virtualTaskToUpdate.section_id,
          order: updates.order ?? virtualTaskToUpdate.order,
          parent_task_id: updates.parent_task_id ?? virtualTaskToUpdate.parent_task_id,
          recurring_type: 'none', // This new task is a specific instance, not recurring itself
          // Link back to the original recurring task.
          // If virtualTaskToUpdate has original_task_id, use it. Otherwise, if it was itself the recurring template, use its ID.
          original_task_id: virtualTaskToUpdate.original_task_id || (virtualTaskToUpdate.recurring_type !== 'none' && virtualTaskToUpdate.recurring_type !== null ? virtualTaskToUpdate.id : null),
          link: updates.link ?? virtualTaskToUpdate.link,
          image_url: updates.image_url ?? virtualTaskToUpdate.image_url,
        };

        // Ensure description is not empty for the new task
        if (!newTaskData.description) {
          showError("Cannot create new task from virtual ID: description is missing.");
          return null;
        }

        const createdTask = await createTask(newTaskData);
        if (createdTask) {
          showSuccess("Recurring task instance saved as a new task.");
          return createdTask;
        }
        return null;
      }

      // If it's a real UUID, proceed with the update operation
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      showSuccess('Task updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
      return data;
    } catch (err: any) {
      console.error('useTasks: Error updating task:', err.message);
      showError(`Failed to update task: ${err.message}`);
      return null;
    }
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      // If it's a virtual task, we don't delete from DB, just from local state if needed
      if (!isValidUuid(taskId)) {
        console.log(`Attempted to delete virtual task ID: ${taskId}. No database operation performed.`);
        // The memoized 'allTasksCombined' array will naturally re-calculate without it if it's not a real task.
        showSuccess('Virtual task removed from view.');
        return true;
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Task deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
      return true;
    } catch (err: any) {
      console.error('useTasks: Error deleting task:', err.message);
      showError(`Failed to delete task: ${err.message}`);
      return false;
    }
  };

  const createSection = async (newSection: NewTaskSectionData): Promise<TaskSection | null> => {
    if (!userId) {
      showError('User not authenticated.');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('task_sections')
        .insert({ ...newSection, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      showSuccess('Section created successfully!');
      queryClient.invalidateQueries({ queryKey: ['sections', userId] });
      return data;
    } catch (err: any) {
      console.error('useTasks: Error creating section:', err.message);
      showError(`Failed to create section: ${err.message}`);
      return null;
    }
  };

  const updateSection = async (sectionId: string, updates: UpdateTaskSectionData): Promise<TaskSection | null> => {
    if (!userId) {
      showError('User not authenticated.');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('task_sections')
        .update(updates)
        .eq('id', sectionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      showSuccess('Section updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['sections', userId] });
      return data;
    } catch (err: any) {
      console.error('useTasks: Error updating section:', err.message);
      showError(`Failed to update section: ${err.message}`);
      return null;
    }
  };

  const updateSectionIncludeInFocusMode = async (sectionId: string, include: boolean): Promise<TaskSection | null> => {
    return updateSection(sectionId, { include_in_focus_mode: include });
  };

  const deleteSection = async (sectionId: string): Promise<boolean> => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      const { error } = await supabase
        .from('task_sections')
        .delete()
        .eq('id', sectionId)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Section deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['sections', userId] });
      return true;
    } catch (err: any) {
      console.error('useTasks: Error deleting section:', err.message);
      showError(`Failed to delete section: ${err.message}`);
      return false;
    }
  };

  const createCategory = async (newCategory: NewCategoryData): Promise<Category | null> => {
    if (!userId) {
      showError('User not authenticated.');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('task_categories')
        .insert({ ...newCategory, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      showSuccess('Category created successfully!');
      queryClient.invalidateQueries({ queryKey: ['categories', userId] });
      return data;
    } catch (err: any) {
      console.error('useTasks: Error creating category:', err.message);
      showError(`Failed to create category: ${err.message}`);
      return null;
    }
  };

  const updateCategory = async (categoryId: string, updates: UpdateCategoryData): Promise<Category | null> => {
    if (!userId) {
      showError('User not authenticated.');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('task_categories')
        .update(updates)
        .eq('id', categoryId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      showSuccess('Category updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['categories', userId] });
      return data;
    } catch (err: any) {
      console.error('useTasks: Error updating category:', err.message);
      showError(`Failed to update category: ${err.message}`);
      return null;
    }
  };

  const deleteCategory = async (categoryId: string): Promise<boolean> => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      const { error } = await supabase
        .from('task_categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Category deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['categories', userId] });
      return true;
    } catch (err: any) {
      console.error('useTasks: Error deleting category:', err.message);
      showError(`Failed to delete category: ${err.message}`);
      return false;
    }
  };

  return {
    tasks: allTasksCombined, // Combined real and generated virtual tasks
    sections,
    allCategories,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};