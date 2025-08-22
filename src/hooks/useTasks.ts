import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskCategory } from '@/types/task';

export const useTasks = (userId: string | undefined) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchCategories = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('task_categories')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      console.error('Error fetching categories:', error);
      setError(error.message);
    } else {
      setCategories(data || []);
    }
  }, [userId]);

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchCategories();
    fetchTasks();
  }, [fetchCategories, fetchTasks]);

  const processedTasks = tasks.map(task => {
    const category = categories.find(cat => cat.id === task.category);
    return {
      ...task,
      category_color: category?.color || '#cccccc', // Default color if category not found
    };
  });

  const addTask = async (newTask: Omit<Task, 'id' | 'created_at' | 'user_id' | 'updated_at' | 'order'>) => {
    if (!userId) {
      setError('User not authenticated.');
      return;
    }
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...newTask, user_id: userId })
      .select()
      .single();

    if (error) {
      setError(error.message);
      console.error('Error adding task:', error);
    } else if (data) {
      setTasks(prev => [data, ...prev]);
    }
  };

  const updateTask = async (id: string, updates: Partial<Omit<Task, 'user_id' | 'created_at'>>) => {
    if (!userId) {
      setError('User not authenticated.');
      return;
    }
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      setError(error.message);
      console.error('Error updating task:', error);
    } else if (data) {
      setTasks(prev => prev.map(task => (task.id === id ? data : task)));
    }
  };

  const deleteTask = async (id: string) => {
    if (!userId) {
      setError('User not authenticated.');
      return;
    }
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      setError(error.message);
      console.error('Error deleting task:', error);
    } else {
      setTasks(prev => prev.filter(task => task.id !== id));
    }
  };

  // Placeholder for daily progress, next available task, etc.
  const dailyProgress = { completed: 0, total: 0 };
  const nextAvailableTask = null;
  const filteredTasks = processedTasks; // For now, just return all processed tasks

  return {
    tasks: processedTasks, // Return processed tasks with category_color
    processedTasks,
    filteredTasks,
    nextAvailableTask,
    loading,
    error,
    currentDate,
    setCurrentDate,
    dailyProgress,
    addTask,
    updateTask,
    deleteTask,
    categories,
    fetchCategories,
    fetchTasks,
  };
};