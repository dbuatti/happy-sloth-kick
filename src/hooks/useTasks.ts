import { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<'priority' | 'due_date' | 'created_at' | 'order'>('order'); // Default sort by order
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc'); // Default to asc for order
  const [sections, setSections] = useState<TaskSection[]>([]);

  // Filter states, now managed within useTasks
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

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

  // Derived filteredTasks using useMemo
  const filteredTasks = useMemo(() => {
    let tempTasks = [...tasks];

    if (searchFilter) {
      tempTasks = tempTasks.filter(task =>
        task.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }
    if (statusFilter && statusFilter !== 'all') {
      tempTasks = tempTasks.filter(task => task.status === statusFilter);
    }
    if (categoryFilter && categoryFilter !== 'all') {
      tempTasks = tempTasks.filter(task => task.category === categoryFilter);
    }
    if (priorityFilter && priorityFilter !== 'all') {
      tempTasks = tempTasks.filter(task => task.priority === priorityFilter);
    }
    if (sectionFilter && sectionFilter !== 'all') {
      tempTasks = tempTasks.filter(task => task.section_id === sectionFilter);
    }
    return tempTasks;
  }, [tasks, searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter]);

  const handleAddTask = async (taskData: NewTaskData) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    
    let targetSectionId = taskData.section_id;
    if (!targetSectionId && sections.length > 0) {
      targetSectionId = sections[0].id; // Default to the first available section
    } else if (!targetSectionId && sections.length === 0) {
      showError('Please create a section first before adding tasks.');
      return;
    }

    try {
      // Determine the highest order in the target section to place the new task at the end
      const targetSectionTasks = tasks.filter(t => t.section_id === targetSectionId);
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
          section_id: targetSectionId, // Ensure section_id is set
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
      showSuccess('Task deleted successfully!');
    } catch (err) {
      console.error('Exception deleting task:', err);
      showError('An unexpected error occurred while deleting the task.');
    }
  };

  // This function now updates the internal filter states
  const applyFilters = useCallback((filters: { search: string; status: string; category: string; priority: string; section: string }) => {
    setSearchFilter(filters.search);
    setStatusFilter(filters.status);
    setCategoryFilter(filters.category);
    setPriorityFilter(filters.priority);
    setSectionFilter(filters.section);
  }, []);

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
    } catch (err: any) {
      console.error('Exception updating section:', err);
      showError('An unexpected error occurred while updating the section.');
    }
  };

  const deleteSection = async (sectionId: string, reassignToSectionId: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      // Update tasks that belong to this section to the new reassignToSectionId
      const { error: updateTasksError } = await supabase
        .from('tasks')
        .update({ section_id: reassignToSectionId })
        .eq('section_id', sectionId)
        .eq('user_id', userId);

      if (updateTasksError) {
        console.error('Error reassigning tasks from section:', updateTasksError);
        showError('Failed to reassign tasks from section.');
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
      fetchTasks(); // Re-fetch tasks to update the UI with new section assignments

      showSuccess('Section deleted successfully and tasks reassigned!');
    } catch (err) {
      console.error('Exception deleting section:', err);
      showError('An unexpected error occurred while deleting the section.');
    }
  };

  const reorderTasksInSameSection = async (sectionId: string | null, startIndex: number, endIndex: number) => {
    if (!userId) return;

    // Get tasks for the specific section
    const sectionTasks = tasks.filter(t => t.section_id === sectionId)
      .sort((a, b) => (a.order || 0) - (b.order || 0)); // Ensure they are sorted by current order

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

      const sourceTasks = allUserTasks.filter(t => t.section_id === sourceSectionId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const destinationTasks = allUserTasks.filter(t => t.section_id === destinationSectionId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

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
    filteredTasks, // Now derived from useMemo
    loading,
    currentDate,
    setCurrentDate,
    userId,
    handleAddTask,
    updateTask,
    deleteTask,
    applyFilters, // Now updates internal filter states
    searchFilter, // Expose filter states
    statusFilter,
    categoryFilter,
    priorityFilter,
    sectionFilter,
    setSearchFilter, // Expose filter setters
    setStatusFilter,
    setCategoryFilter,
    setPriorityFilter,
    setSectionFilter,
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
    reorderTasksInSameSection,
    moveTaskToNewSection,
  };
};