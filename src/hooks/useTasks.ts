import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  order: number | null; // Added order column
}

interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
}

type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>;

interface NewTaskData {
  description: string;
  status?: 'to-do' | 'completed' | 'skipped' | 'archived';
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
  const [sortKey, setSortKey] = useState<'priority' | 'due_date' | 'created_at' | 'order'>('order'); // Default sort by order
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc'); // Default to asc for order
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [noSectionDisplayName, setNoSectionDisplayName] = useState('No Section');

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
      .order('order', { ascending: sortDirection === 'asc' }) // Order by 'order' first
      .order(sortKey, { ascending: sortDirection === 'asc' }); // Then by selected sortKey

    if (error) {
      console.error('Error fetching tasks:', error);
      showError('Failed to load tasks.');
    } else {
      setTasks(data || []);
      setFilteredTasks(data || []);
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

  const fetchNoSectionDisplayName = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('default_no_section_name')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine for new users
        throw error;
      }
      if (data) {
        setNoSectionDisplayName(data.default_no_section_name || 'No Section');
      }
    } catch (error: any) {
      console.error('Error fetching default no section name:', error);
      showError('Failed to load custom "No Section" name.');
    }
  }, [userId]);

  useEffect(() => {
    fetchTasks();
    fetchSections();
    fetchNoSectionDisplayName(); // Fetch custom name on load
  }, [fetchTasks, fetchSections, fetchNoSectionDisplayName]);

  const handleAddTask = async (taskData: NewTaskData) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      // Determine the highest order in the target section to place the new task at the end
      const targetSectionTasks = tasks.filter(t => 
        (t.section_id === taskData.section_id) || (t.section_id === null && taskData.section_id === null)
      );
      const maxOrder = targetSectionTasks.reduce((max, task) => Math.max(max, task.order || 0), -1);
      const newOrder = maxOrder + 1;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          description: taskData.description,
          user_id: userId,
          status: taskData.status || 'to-do',
          recurring_type: taskData.recurring_type || 'none',
          category: taskData.category || 'General',
          priority: taskData.priority || 'medium',
          due_date: taskData.due_date || null,
          notes: taskData.notes || null,
          remind_at: taskData.remind_at || null,
          section_id: taskData.section_id || null,
          order: newOrder, // Set the order for the new task
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
  }, [tasks]);

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
      fetchTasks();
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
      // If it's the 'no-section' special ID, update the user's profile
      if (sectionId === 'no-section') {
        const { error } = await supabase
          .from('profiles')
          .update({ default_no_section_name: newName })
          .eq('id', userId);

        if (error) throw error;
        setNoSectionDisplayName(newName);
        showSuccess('Default "No Section" name updated successfully!');
      } else {
        // Otherwise, update a regular section
        const { data, error } = await supabase
          .from('task_sections')
          .update({ name: newName })
          .eq('id', sectionId)
          .eq('user_id', userId)
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          setSections(prevSections =>
            prevSections.map(sec =>
              sec.id === sectionId ? { ...sec, name: newName } : sec
            )
          );
          showSuccess('Section updated successfully!');
        } else {
          showError('Section not found or no changes applied.');
        }
      }
    } catch (err: any) {
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

      setSections(prevSections => prevSections.filter(sec => sec.id !== sectionId));
      fetchTasks();

      showSuccess('Section deleted successfully and tasks unassigned!');
    } catch (err) {
      console.error('Exception deleting section:', err);
      showError('An unexpected error occurred while deleting the section.');
    }
  };

  const reassignNoSectionTasks = async (targetSectionId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ section_id: targetSectionId })
        .is('section_id', null) // Target tasks with section_id = null
        .eq('user_id', userId);

      if (error) {
        console.error('Error reassigning "No Section" tasks:', error);
        showError('Failed to reassign tasks from "No Section".');
        return false;
      }
      showSuccess('All tasks from "No Section" have been reassigned!');
      fetchTasks(); // Re-fetch tasks to update the UI
      return true;
    } catch (err) {
      console.error('Exception reassigning "No Section" tasks:', err);
      showError('An unexpected error occurred while reassigning tasks.');
      return false;
    }
  };

  const reorderTasksInSameSection = async (sectionId: string | null, startIndex: number, endIndex: number) => {
    if (!userId) return;

    // Get tasks for the specific section, including 'no-section' tasks if sectionId is null
    const sectionTasks = tasks.filter(t => 
      (t.section_id === sectionId) || (t.section_id === null && sectionId === 'no-section')
    ).sort((a, b) => (a.order || 0) - (b.order || 0)); // Ensure they are sorted by current order

    const result = Array.from(sectionTasks);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    // Prepare updates for all tasks in this section
    const updates = result.map((task, index) => ({
      id: task.id,
      order: index, // Assign new sequential order
    }));

    try {
      const { error } = await supabase.from('tasks').upsert(updates, { onConflict: 'id' });
      if (error) throw error;
      showSuccess('Tasks reordered successfully!');
      fetchTasks(); // Re-fetch to ensure UI consistency
    } catch (err) {
      console.error('Error reordering tasks:', err);
      showError('Failed to reorder tasks.');
    }
  };

  const moveTaskToNewSection = async (
    taskId: string,
    sourceSectionId: string | null,
    destinationSectionId: string | null,
    destinationIndex: number
  ) => {
    if (!userId) return;

    try {
      // Fetch all tasks to correctly re-index both source and destination sections
      const { data: allUserTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      const sourceTasks = allUserTasks.filter(t => 
        (t.section_id === sourceSectionId) || (t.section_id === null && sourceSectionId === 'no-section')
      ).sort((a, b) => (a.order || 0) - (b.order || 0));

      const destinationTasks = allUserTasks.filter(t => 
        (t.section_id === destinationSectionId) || (t.section_id === null && destinationSectionId === 'no-section')
      ).sort((a, b) => (a.order || 0) - (b.order || 0));

      const movedTask = sourceTasks.find(t => t.id === taskId);
      if (!movedTask) throw new Error('Moved task not found in source section.');

      // Remove from source section's list
      const newSourceTasks = sourceTasks.filter(t => t.id !== taskId);

      // Add to destination section's list at the correct index
      const newDestinationTasks = Array.from(destinationTasks);
      newDestinationTasks.splice(destinationIndex, 0, { ...movedTask, section_id: destinationSectionId });

      // Prepare updates for both sections
      const updates: { id: string; order: number; section_id?: string | null }[] = [];

      newSourceTasks.forEach((task, index) => {
        updates.push({ id: task.id, order: index });
      });
      newDestinationTasks.forEach((task, index) => {
        updates.push({ id: task.id, order: index, section_id: task.section_id });
      });

      // Perform a batch upsert
      const { error } = await supabase.from('tasks').upsert(updates, { onConflict: 'id' });
      if (error) throw error;
      showSuccess('Task moved successfully!');
      fetchTasks(); // Re-fetch to ensure UI consistency
    } catch (err) {
      console.error('Error moving task:', err);
      showError('Failed to move task.');
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
    noSectionDisplayName,
    reassignNoSectionTasks,
    reorderTasksInSameSection, // Expose new function
    moveTaskToNewSection, // Expose new function
  };
};