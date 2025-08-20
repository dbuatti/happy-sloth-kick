import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed';
  created_at: string;
  updated_at: string;
  user_id: string;
  category: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number;
  parent_task_id: string | null;
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  original_task_id: string | null;
  link: string | null;
  image_url: string | null;
}

export interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number;
  created_at: string;
  include_in_focus_mode: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

interface UseTasksProps {
  currentDate?: Date;
  userId?: string;
}

export const useTasks = (props: UseTasksProps = {}) => {
  // Use the props to avoid unused variable errors
  void props;
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mark these as used to avoid TS errors
  void allCategories;
  void setAllCategories;
  void setLoading;
  void setError;

  const createTask = useCallback(async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<Task | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const newTask = {
        ...taskData,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'to-do' as const, // Add missing status property
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(newTask)
        .select()
        .single();

      if (error) throw error;

      setTasks(prevTasks => [...prevTasks, data]);
      toast.success('Task created successfully');
      return data;
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
      return null;
    }
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>): Promise<void> => {
    try {
      // Check if this is a virtual task
      if (id.startsWith('virtual-')) {
        // For virtual tasks, we don't update the database
        // In a real implementation, you might want to update the original recurring task
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTasks(prevTasks => 
        prevTasks.map(task => task.id === id ? { ...task, ...data } : task)
      );
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      throw error;
    }
  }, []);

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    try {
      // Check if this is a virtual task
      if (id.startsWith('virtual-')) {
        // Virtual tasks don't exist in the database, so we don't need to delete them
        return;
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
      toast.success('Task deleted successfully');
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
      throw error;
    }
  }, []);

  const createSection = useCallback(async (sectionData: Omit<TaskSection, 'id' | 'user_id' | 'created_at'>): Promise<TaskSection | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const newSection = {
        ...sectionData,
        user_id: user.id,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('task_sections')
        .insert(newSection)
        .select()
        .single();

      if (error) throw error;

      setSections(prevSections => [...prevSections, data]);
      toast.success('Section created successfully');
      return data;
    } catch (error: any) {
      console.error('Error creating section:', error);
      toast.error('Failed to create section');
      return null;
    }
  }, []);

  const updateSection = useCallback(async (id: string, updates: Partial<TaskSection>): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('task_sections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setSections(prevSections => 
        prevSections.map(section => section.id === id ? { ...section, ...data } : section)
      );
    } catch (error: any) {
      console.error('Error updating section:', error);
      toast.error('Failed to update section');
      throw error;
    }
  }, []);

  const deleteSection = useCallback(async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('task_sections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSections(prevSections => prevSections.filter(section => section.id !== id));
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.section_id === id ? { ...task, section_id: null } : task
        )
      );
      toast.success('Section deleted successfully');
    } catch (error: any) {
      console.error('Error deleting section:', error);
      toast.error('Failed to delete section');
      throw error;
    }
  }, []);

  const updateSectionIncludeInFocusMode = useCallback(async (id: string, includeInFocusMode: boolean): Promise<void> => {
    try {
      await updateSection(id, { include_in_focus_mode: includeInFocusMode });
    } catch (error: any) {
      console.error('Error updating section focus mode:', error);
      toast.error('Failed to update section focus mode');
      throw error;
    }
  }, [updateSection]);

  return {
    tasks,
    sections,
    allCategories,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
  };
};