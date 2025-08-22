import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskCategory } from '@/types/task';
import { useAuth } from '@/context/AuthContext';

interface UseTasksResult {
  tasks: Task[];
  processedTasks: Task[];
  filteredTasks: Task[];
  nextAvailableTask: Task | null;
  loading: boolean;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  dailyProgress: { completed: number; total: number };
  addTask: (description: string, sectionId?: string | null, parentTaskId?: string | null) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  reorderTasks: (updates: { id: string; order: number; parent_task_id: string | null; section_id: string | null }[]) => Promise<void>;
  toggleTaskStatus: (id: string, currentStatus: Task['status']) => Promise<void>;
  toggleTaskFocus: (taskId: string | null) => Promise<void>;
  focusedTaskId: string | null;
  categories: TaskCategory[];
  addCategory: (name: string, color: string) => Promise<void>;
  updateCategory: (id: string, updates: Partial<TaskCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

export const useTasks = (): UseTasksResult => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  const fetchTasksAndCategories = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('order', { ascending: true });

    const { data: categoriesData, error: categoriesError } = await supabase
      .from('task_categories')
      .select('*')
      .eq('user_id', user.id);

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
    } else {
      setTasks(tasksData as Task[]);
    }

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
    } else {
      setCategories(categoriesData as TaskCategory[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTasksAndCategories();
  }, [fetchTasksAndCategories]);

  const addTask = async (description: string, sectionId: string | null = null, parentTaskId: string | null = null) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('tasks')
      .insert({ user_id: user.id, description, section_id: sectionId, parent_task_id: parentTaskId })
      .select();
    if (error) {
      console.error('Error adding task:', error);
    } else if (data) {
      setTasks((prev) => [...prev, data[0]]);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select();
    if (error) {
      console.error('Error updating task:', error);
    } else if (data) {
      setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...data[0] } : task)));
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      console.error('Error deleting task:', error);
    } else {
      setTasks((prev) => prev.filter((task) => task.id !== id));
    }
  };

  const reorderTasks = async (updates: { id: string; order: number; parent_task_id: string | null; section_id: string | null }[]) => {
    if (!user) return;
    const { error } = await supabase.rpc('update_tasks_order', { updates });
    if (error) {
      console.error('Error reordering tasks:', error);
    } else {
      // Re-fetch to ensure correct order and state
      fetchTasksAndCategories();
    }
  };

  const toggleTaskStatus = async (id: string, currentStatus: Task['status']) => {
    const newStatus = currentStatus === 'completed' ? 'to-do' : 'completed';
    await updateTask(id, { status: newStatus });
  };

  const toggleTaskFocus = async (taskId: string | null) => {
    if (!user) return;
    const { error } = await supabase
      .from('user_settings')
      .update({ focused_task_id: taskId })
      .eq('user_id', user.id);
    if (error) {
      console.error('Error updating focused task:', error);
    } else {
      setFocusedTaskId(taskId);
    }
  };

  const addCategory = async (name: string, color: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('task_categories')
      .insert({ user_id: user.id, name, color })
      .select();
    if (error) {
      console.error('Error adding category:', error);
    } else if (data) {
      setCategories((prev) => [...prev, data[0]]);
    }
  };

  const updateCategory = async (id: string, updates: Partial<TaskCategory>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('task_categories')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select();
    if (error) {
      console.error('Error updating category:', error);
    } else if (data) {
      setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, ...data[0] } : cat)));
    }
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('task_categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      console.error('Error deleting category:', error);
    } else {
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
    }
  };

  // Process tasks to include category color
  const processedTasks = tasks.map(task => {
    const category = categories.find(cat => cat.id === task.category);
    return {
      ...task,
      category_color: category?.color || 'gray', // Default color if category not found
    };
  });

  // Filter tasks for the current date (example logic, adjust as needed)
  const filteredTasks = processedTasks.filter(task => {
    if (!task.due_date) return true; // Show tasks without due dates
    const taskDueDate = new Date(task.due_date);
    return taskDueDate.toDateString() === currentDate.toDateString();
  });

  // Example for next available task (adjust logic as needed)
  const nextAvailableTask = filteredTasks.find(task => task.status === 'to-do') || null;

  // Example for daily progress
  const dailyTasks = processedTasks.filter(task => {
    if (!task.due_date) return false;
    const taskDueDate = new Date(task.due_date);
    return taskDueDate.toDateString() === currentDate.toDateString();
  });
  const completedDailyTasks = dailyTasks.filter(task => task.status === 'completed').length;
  const dailyProgress = {
    completed: completedDailyTasks,
    total: dailyTasks.length,
  };

  return {
    tasks,
    processedTasks,
    filteredTasks,
    nextAvailableTask,
    loading,
    currentDate,
    setCurrentDate,
    dailyProgress,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    toggleTaskStatus,
    toggleTaskFocus,
    focusedTaskId,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
  };
};