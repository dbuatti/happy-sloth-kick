import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/supabaseClient';
import { Task, TaskSection, Category, TaskStatus } from '@/types/task-management'; // Assuming these are the canonical types
import { toast } from 'sonner';

interface UseTaskManagementProps {
  currentDate: Date;
  userId?: string; // Optional userId for demo mode
}

export const useTaskManagement = ({ currentDate, userId: propUserId }: UseTaskManagementProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getUserId = useCallback(async () => {
    if (propUserId) return propUserId;
    const { data: { user } } = await supabase.auth.getUser(); // Modern way to get user
    return user?.id;
  }, [propUserId]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = await getUserId();
      if (!userId) {
        console.warn("No user ID found for fetching tasks.");
        setTasks([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err: any) {
      console.error('Error fetching tasks:', err.message);
      setError(err.message);
      toast.error('Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [getUserId]);

  const fetchSections = useCallback(async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('task_sections')
        .select('*')
        .eq('user_id', userId)
        .order('order', { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (err: any) {
      console.error('Error fetching sections:', err.message);
      toast.error('Failed to load sections.');
    }
  }, [getUserId]);

  const fetchCategories = useCallback(async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error('Error fetching categories:', err.message);
      toast.error('Failed to load categories.');
    }
  }, [getUserId]);

  useEffect(() => {
    fetchTasks();
    fetchSections();
    fetchCategories();
  }, [fetchTasks, fetchSections, fetchCategories]);

  const addTask = useCallback(async (newTask: Omit<Task, 'id' | 'created_at' | 'user_id' | 'status'>) => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User not authenticated.");

      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...newTask, user_id: userId, status: 'to-do' })
        .select()
        .single();

      if (error) throw error;
      setTasks(prev => [data, ...prev]);
      toast.success('Task added successfully!');
      return data;
    } catch (err: any) {
      console.error('Error adding task:', err.message);
      toast.error('Failed to add task.');
      return null;
    }
  }, [getUserId]);

  const updateTask = useCallback(async (id: string, updates: Partial<Omit<Task, 'id' | 'created_at' | 'user_id'>>) => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User not authenticated.");

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      setTasks(prev => prev.map(task => (task.id === id ? data : task)));
      toast.success('Task updated successfully!');
      return data;
    } catch (err: any) {
      console.error('Error updating task:', err.message);
      toast.error('Failed to update task.');
      return null;
    }
  }, [getUserId]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User not authenticated.");

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      setTasks(prev => prev.filter(task => task.id !== id));
      toast.success('Task deleted successfully!');
      return true;
    } catch (err: any) {
      console.error('Error deleting task:', err.message);
      toast.error('Failed to delete task.');
      return false;
    }
  }, [getUserId]);

  const createSection = useCallback(async (name: string) => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User not authenticated.");

      const { data, error } = await supabase
        .from('task_sections')
        .insert({ name, user_id: userId, order: sections.length })
        .select()
        .single();

      if (error) throw error;
      setSections(prev => [...prev, data]);
      toast.success('Section created successfully!');
      return data;
    } catch (err: any) {
      console.error('Error creating section:', err.message);
      toast.error('Failed to create section.');
      return null;
    }
  }, [getUserId, sections.length]);

  const updateSection = useCallback(async (id: string, updates: Partial<Omit<TaskSection, 'id' | 'created_at' | 'user_id'>>) => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User not authenticated.");

      const { data, error } = await supabase
        .from('task_sections')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      setSections(prev => prev.map(section => (section.id === id ? data : section)));
      toast.success('Section updated successfully!');
      return data;
    } catch (err: any) {
      console.error('Error updating section:', err.message);
      toast.error('Failed to update section.');
      return null;
    }
  }, [getUserId]);

  const deleteSection = useCallback(async (id: string) => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User not authenticated.");

      // First, update tasks that belong to this section to have no section
      await supabase
        .from('tasks')
        .update({ section_id: null })
        .eq('section_id', id)
        .eq('user_id', userId);

      const { error } = await supabase
        .from('task_sections')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      setSections(prev => prev.filter(section => section.id !== id));
      // Re-fetch tasks to reflect the section_id: null change
      fetchTasks();
      toast.success('Section deleted successfully!');
      return true;
    } catch (err: any) {
      console.error('Error deleting section:', err.message);
      toast.error('Failed to delete section.');
      return false;
    }
  }, [getUserId, fetchTasks]);

  const updateSectionOrder = useCallback(async (orderedSections: TaskSection[]) => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User not authenticated.");

      const updates = orderedSections.map((section, index) => ({
        id: section.id,
        order: index,
      }));

      const { error } = await supabase
        .from('task_sections')
        .upsert(updates, { onConflict: 'id' });

      if (error) throw error;
      setSections(orderedSections);
      // toast.success('Section order updated!'); // Too many toasts if dragging frequently
      return true;
    } catch (err: any) {
      console.error('Error updating section order:', err.message);
      toast.error('Failed to update section order.');
      return false;
    }
  }, [getUserId]);

  const updateSectionIncludeInFocusMode = useCallback(async (id: string, includeInFocusMode: boolean) => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User not authenticated.");

      const { data, error } = await supabase
        .from('task_sections')
        .update({ include_in_focus_mode: includeInFocusMode })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      setSections(prev => prev.map(section => (section.id === id ? data : section)));
      toast.success('Section focus mode updated!');
      return data;
    } catch (err: any) {
      console.error('Error updating section focus mode:', err.message);
      toast.error('Failed to update section focus mode.');
      return null;
    }
  }, [getUserId]);

  const createCategory = useCallback(async (name: string, color: string) => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User not authenticated.");

      const { data, error } = await supabase
        .from('categories')
        .insert({ name, color, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      setCategories(prev => [...prev, data]);
      return data;
    } catch (err: any) {
      console.error('Error creating category:', err.message);
      toast.error('Failed to create category.');
      return null;
    }
  }, [getUserId]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Omit<Category, 'id' | 'created_at' | 'user_id'>>) => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User not authenticated.");

      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      setCategories(prev => prev.map(category => (category.id === id ? data : category)));
      toast.success('Category updated successfully!');
      return data;
    } catch (err: any) {
      console.error('Error updating category:', err.message);
      toast.error('Failed to update category.');
      return null;
    }
  }, [getUserId]);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User not authenticated.");

      // First, update tasks that belong to this category to have no category
      await supabase
        .from('tasks')
        .update({ category: null })
        .eq('category', categories.find(c => c.id === id)?.name || '') // Match by name as category field is name
        .eq('user_id', userId);

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      setCategories(prev => prev.filter(category => category.id !== id));
      // Re-fetch tasks to reflect the category: null change
      fetchTasks();
      toast.success('Category deleted successfully!');
      return true;
    } catch (err: any) {
      console.error('Error deleting category:', err.message);
      toast.error('Failed to delete category.');
      return false;
    }
  }, [getUserId, categories, fetchTasks]);

  return {
    tasks,
    sections,
    categories,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    createSection,
    updateSection,
    deleteSection,
    updateSectionOrder,
    updateSectionIncludeInFocusMode,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchTasks, // Expose fetchTasks for manual refresh if needed
  };
};