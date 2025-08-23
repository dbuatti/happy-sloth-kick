import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskCategory, TaskSection } from '@/types';
import { toast } from 'react-hot-toast';

interface UseDailyTasksResult {
  tasks: Task[];
  sections: TaskSection[];
  categories: TaskCategory[];
  loading: boolean;
  error: string | null;
  addTask: (description: string, sectionId: string | null, parentTaskId?: string | null) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  reorderTasks: (updates: { id: string; order: number; parent_task_id: string | null; section_id: string | null }[]) => Promise<void>;
  toggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  logDoTodayOff: (taskId: string) => Promise<void>;
}

export const useDailyTasks = (userId: string | undefined, isDemo: boolean = false, demoUserId: string | undefined = undefined): UseDailyTasksResult => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = isDemo ? demoUserId : userId;

  const fetchTasks = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*, task_categories(name, color)')
        .eq('user_id', currentUserId)
        .order('order', { ascending: true })
        .order('created_at', { ascending: true });

      if (tasksError) throw tasksError;

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('task_sections')
        .select('*')
        .eq('user_id', currentUserId)
        .order('order', { ascending: true });

      if (sectionsError) throw sectionsError;

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('task_categories')
        .select('*')
        .eq('user_id', currentUserId);

      if (categoriesError) throw categoriesError;

      setTasks(tasksData as Task[]);
      setSections(sectionsData as TaskSection[]);
      setCategories(categoriesData as TaskCategory[]);
    } catch (err: any) {
      console.error('Error fetching daily tasks:', err.message);
      setError(err.message);
      toast.error(`Failed to load tasks: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(async (description: string, sectionId: string | null, parentTaskId?: string | null) => {
    if (!currentUserId) return;
    try {
      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert({
          user_id: currentUserId,
          description,
          status: 'to-do',
          section_id: sectionId,
          parent_task_id: parentTaskId,
          order: tasks.filter(t => t.section_id === sectionId && t.parent_task_id === parentTaskId).length,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setTasks(prev => [...prev, data as Task]);
      toast.success('Task added!');
    } catch (err: any) {
      console.error('Error adding task:', err.message);
      toast.error(`Failed to add task: ${err.message}`);
    }
  }, [currentUserId, tasks]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    if (!currentUserId) return;
    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (updateError) throw updateError;
      setTasks(prev => prev.map(task => (task.id === id ? { ...task, ...updates } : task)));
      toast.success('Task updated!');
    } catch (err: any) {
      console.error('Error updating task:', err.message);
      toast.error(`Failed to update task: ${err.message}`);
    }
  }, [currentUserId]);

  const deleteTask = useCallback(async (id: string) => {
    if (!currentUserId) return;
    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (deleteError) throw deleteError;
      setTasks(prev => prev.filter(task => task.id !== id && task.parent_task_id !== id)); // Also remove subtasks
      toast.success('Task deleted!');
    } catch (err: any) {
      console.error('Error deleting task:', err.message);
      toast.error(`Failed to delete task: ${err.message}`);
    }
  }, [currentUserId]);

  const reorderTasks = useCallback(async (updates: { id: string; order: number; parent_task_id: string | null; section_id: string | null }[]) => {
    if (!currentUserId) return;
    try {
      // Optimistically update UI
      setTasks(prevTasks => {
        const newTasks = [...prevTasks];
        updates.forEach(update => {
          const taskIndex = newTasks.findIndex(t => t.id === update.id);
          if (taskIndex !== -1) {
            newTasks[taskIndex] = {
              ...newTasks[taskIndex],
              order: update.order,
              parent_task_id: update.parent_task_id,
              section_id: update.section_id,
            };
          }
        });
        return newTasks;
      });

      const { error: rpcError } = await supabase.rpc('update_tasks_order', { updates });

      if (rpcError) throw rpcError;
      toast.success('Tasks reordered!');
      fetchTasks(); // Re-fetch to ensure consistency
    } catch (err: any) {
      console.error('Error reordering tasks:', err.message);
      toast.error(`Failed to reorder tasks: ${err.message}`);
      fetchTasks(); // Revert to original state on error
    }
  }, [currentUserId, fetchTasks]);

  const toggleFocusMode = useCallback(async (taskId: string, isFocused: boolean) => {
    if (!currentUserId) return;
    try {
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({ focused_task_id: isFocused ? taskId : null })
        .eq('user_id', currentUserId);

      if (updateError) throw updateError;
      toast.success(isFocused ? 'Task added to focus!' : 'Task removed from focus!');
    } catch (err: any) {
      console.error('Error toggling focus mode:', err.message);
      toast.error(`Failed to update focus mode: ${err.message}`);
    }
  }, [currentUserId]);

  const logDoTodayOff = useCallback(async (taskId: string) => {
    if (!currentUserId) return;
    try {
      const { error: insertError } = await supabase
        .from('do_today_off_log')
        .insert({ user_id: currentUserId, task_id: taskId, off_date: new Date().toISOString().split('T')[0] });

      if (insertError) throw insertError;
      toast.success('Task moved off "Do Today"!');
    } catch (err: any) {
      console.error('Error logging "Do Today Off":', err.message);
      toast.error(`Failed to log "Do Today Off": ${err.message}`);
    }
  }, [currentUserId]);

  return {
    tasks,
    sections,
    categories,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    toggleFocusMode,
    logDoTodayOff,
  };
};