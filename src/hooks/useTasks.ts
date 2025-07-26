import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';

interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  created_at: string;
  user_id: string;
  category: string;
  priority: string;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
}

interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
}

type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>;

// New interface for task data when adding a new task
interface NewTaskData {
  description: string;
  status?: 'to-do' | 'completed' | 'skipped' | 'archived'; // Added status property
  recurring_type?: 'none' | 'daily' | 'weekly' | 'monthly';
  category?: string;
  priority?: string;
  due_date?: string | null;
  notes?: string | null;
  remind_at?: string | null;
  section_id?: string | null;
}

export const useTasks = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<'priority' | 'due_date' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sections, setSections] = useState<TaskSection[]>([]);

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order(sortKey, { ascending: sortDirection === 'asc' });

    if (error) {
      console.error('Error fetching tasks:', error);
      showError('Failed to load tasks.');
    } else {
      setTasks(data || []);
      setFilteredTasks(data || []); // Initialize filtered tasks with all tasks
    }
    setLoading(false);
  }, [userId, currentDate, sortKey, sortDirection]);

  const fetchSections = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('task_sections')
      .select('*')
      .eq('user_id', userId)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching sections:', error);
      showError('Failed to load sections.');
    } else {
      setSections(data || []);
    }
  }, [userId]);

  useEffect(() => {
    fetchTasks();
    fetchSections();
  }, [fetchTasks, fetchSections]);

  // Updated handleAddTask to accept a NewTaskData object
  const handleAddTask = async (taskData: NewTaskData) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          description: taskData.description,
          user_id: userId,
          status: taskData.status || 'to-do', // Default to 'to-do' if not provided
          recurring_type: taskData.recurring_type || 'none',
          category: taskData.category || 'General',
          priority: taskData.priority || 'medium',
          due_date: taskData.due_date || null,
          notes: taskData.notes || null,
          remind_at: taskData.remind_at || null,
          section_id: taskData.section_id || null,
        })
        .select();

      if (error) {
        console.error('Error adding task:', error);
        showError('Failed to add task.');
        return;
      }
      if (data && data.length > 0) {
        setTasks(prevTasks => [...prevTasks, data[0]]);
        setFilteredTasks(prevFilteredTasks => [...prevFilteredTasks, data[0]]);
        showSuccess('Task added successfully!');
      }
    } catch (err) {
      console.error('Exception adding task:', err);
      showError('An unexpected error occurred while adding the task.');
    }
  };

  const updateTask = async (taskId: string, updates: TaskUpdate) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('Error updating task:', error);
        showError('Failed to update task.');
        return;
      }
      if (data && data.length > 0) {
        setTasks(prevTasks =>
          prevTasks.map(task => (task.id === taskId ? { ...task, ...updates } : task))
        );
        setFilteredTasks(prevFilteredTasks =>
          prevFilteredTasks.map(task => (task.id === taskId ? { ...task, ...updates } : task))
        );
        showSuccess('Task updated successfully!');
      }
    } catch (err) {
      console.error('Exception updating task:', err);
      showError('An unexpected error occurred while updating the task.');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting task:', error);
        showError('Failed to delete task.');
        return;
      }
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      setFilteredTasks(prevFilteredTasks => prevFilteredTasks.filter(task => task.id !== taskId));
      showSuccess('Task deleted successfully!');
    } catch (err) {
      console.error('Exception deleting task:', err);
      showError('An unexpected error occurred while deleting the task.');
    }
  };

  const applyFilters = useCallback((filters: { search: string; status: string; category: string; priority: string; section: string }) => {
    let tempTasks = [...tasks];

    if (filters.search) {
      tempTasks = tempTasks.filter(task =>
        task.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.notes?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    if (filters.status && filters.status !== 'all') {
      tempTasks = tempTasks.filter(task => task.status === filters.status);
    }
    if (filters.category && filters.category !== 'all') {
      tempTasks = tempTasks.filter(task => task.category === filters.category);
    }
    if (filters.priority && filters.priority !== 'all') {
      tempTasks = tempTasks.filter(task => task.priority === filters.priority);
    }
    if (filters.section && filters.section !== 'all') {
      if (filters.section === 'no-section') {
        tempTasks = tempTasks.filter(task => task.section_id === null);
      } else {
        tempTasks = tempTasks.filter(task => task.section_id === filters.section);
      }
    }

    setFilteredTasks(tempTasks);
  }, [tasks]);

  useEffect(() => {
    // Re-apply filters whenever tasks or filter criteria change
    // This effect will be triggered by fetchTasks, updateTask, etc.
    // The actual filter values are managed by TaskFilter component and passed via applyFilters
    // For now, we'll just re-apply the last known filters if needed, or rely on explicit calls.
    // A more robust solution would store filter state in useTasks or pass it down.
    // For simplicity, let's assume applyFilters is called explicitly when filters change in UI.
  }, [tasks]); // Only re-run if tasks change, assuming filters are applied externally

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const clearSelectedTasks = () => {
    setSelectedTaskIds([]);
  };

  const bulkUpdateTasks = async (updates: TaskUpdate) => {
    if (!userId || selectedTaskIds.length === 0) {
      showError('No tasks selected for bulk update.');
      return;
    }
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .in('id', selectedTaskIds)
        .eq('user_id', userId);

      if (error) {
        console.error('Error bulk updating tasks:', error);
        showError('Failed to bulk update tasks.');
        return;
      }
      showSuccess('Tasks updated successfully!');
      clearSelectedTasks();
      fetchTasks(); // Re-fetch tasks to reflect bulk changes
    } catch (err) {
      console.error('Exception bulk updating tasks:', err);
      showError('An unexpected error occurred during bulk update.');
    }
  };

  const createSection = async (name: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('task_sections')
        .insert({ name, user_id: userId })
        .select();

      if (error) {
        console.error('Error creating section:', error);
        showError('Failed to create section.');
        return;
      }

      if (data && data.length > 0) {
        setSections(prevSections => [...prevSections, data[0]]);
        showSuccess('Section created successfully!');
      }
    } catch (err) {
      console.error('Exception creating section:', err);
      showError('An unexpected error occurred while creating the section.');
    }
  };

  const updateSection = async (sectionId: string, newName: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      console.log(`Attempting to update section ${sectionId} to name: ${newName} for user: ${userId}`);
      const { data, error } = await supabase
        .from('task_sections')
        .update({ name: newName })
        .eq('id', sectionId)
        .eq('user_id', userId)
        .select(); // Select the updated row to confirm

      if (error) {
        console.error('Error updating section:', error);
        showError('Failed to update section.');
        return;
      }

      if (data && data.length > 0) {
        console.log('Section updated successfully in Supabase:', data[0]);
        // Update the local state with the new section name
        setSections(prevSections =>
          prevSections.map(sec =>
            sec.id === sectionId ? { ...sec, name: newName } : sec
          )
        );
        showSuccess('Section updated successfully!');
      } else {
        console.warn('Section not found or no changes applied in Supabase. Data:', data);
        showError('Section not found or no changes applied.');
      }
    } catch (err) {
      console.error('Exception updating section:', err);
      showError('An unexpected error occurred while updating the section.');
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      // Start a transaction if Supabase client supports it directly, or handle sequentially
      // For simplicity, performing sequentially.
      // First, update tasks that belong to this section to have section_id = null
      const { error: updateTasksError } = await supabase
        .from('tasks')
        .update({ section_id: null })
        .eq('section_id', sectionId)
        .eq('user_id', userId);

      if (updateTasksError) {
        console.error('Error unassigning tasks from section:', updateTasksError);
        showError('Failed to unassign tasks from section.');
        return;
      }

      // Then, delete the section
      const { error: deleteSectionError } = await supabase
        .from('task_sections')
        .delete()
        .eq('id', sectionId)
        .eq('user_id', userId);

      if (deleteSectionError) {
        console.error('Error deleting section:', deleteSectionError);
        showError('Failed to delete section.');
        return;
      }

      // Update local state: remove the section
      setSections(prevSections => prevSections.filter(sec => sec.id !== sectionId));
      // Also need to update tasks state to reflect section_id = null
      // Re-fetch tasks to ensure consistency after unassigning them
      fetchTasks();

      showSuccess('Section deleted successfully and tasks unassigned!');
    } catch (err) {
      console.error('Exception deleting section:', err);
      showError('An unexpected error occurred while deleting the section.');
    }
  };

  return {
    tasks,
    filteredTasks,
    loading,
    currentDate,
    setCurrentDate,
    userId,
    handleAddTask,
    updateTask,
    deleteTask,
    applyFilters,
    selectedTaskIds,
    toggleTaskSelection,
    clearSelectedTasks,
    bulkUpdateTasks,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    sections,
    createSection,
    updateSection,
    deleteSection,
  };
};