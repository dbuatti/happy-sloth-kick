import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating IDs
import { isSameDay } from 'date-fns'; // Import isSameDay

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
  order: number | null;
  original_task_id: string | null; // New field for recurring tasks
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
  const [sortKey, setSortKey] = useState<'priority' | 'due_date' | 'created_at' | 'order'>('order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sections, setSections] = useState<TaskSection[]>([]);

  // Filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const fetchSections = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('task_sections')
      .select('*')
      .eq('user_id', userId)
      .order('order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching sections:', error);
      showError('Failed to load sections.');
    } else {
      setSections(data || []);
    }
  }, [userId]);

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

    try {
      // 1. Fetch tasks already existing for the current day
      const { data: existingTasks, error: existingTasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      if (existingTasksError) throw existingTasksError;

      let tasksToSet = [...(existingTasks || [])];
      const existingOriginalIdsForToday = new Set(tasksToSet.map(t => t.original_task_id || t.id));

      // 2. Fetch daily recurring task templates that should appear today
      const { data: recurringTemplates, error: recurringTemplatesError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('recurring_type', 'daily')
        .lt('created_at', startOfDay.toISOString()); // Created before today

      if (recurringTemplatesError) throw recurringTemplatesError;

      const newRecurringInstances: Task[] = [];
      for (const template of (recurringTemplates || [])) {
        // Check if an instance of this recurring task already exists for today
        // An instance for today would have its original_task_id matching the template's ID
        // AND its created_at date being today.
        const instanceExists = tasksToSet.some(
          t => (t.original_task_id === template.id) &&
               isSameDay(new Date(t.created_at), currentDate)
        );

        if (!instanceExists) {
          // Create a new instance for today
          const newInstance: Task = {
            ...template,
            id: uuidv4(), // Generate a new ID for the instance
            created_at: currentDate.toISOString(), // Set created_at to current day
            status: 'to-do', // Reset status for the new day's instance
            recurring_type: 'none', // This instance is not recurring itself
            original_task_id: template.id, // Link to the original recurring task
            order: template.order, // Keep original order for now, reordering will adjust
          };
          newRecurringInstances.push(newInstance);
        }
      }

      // Insert new recurring instances into the database
      if (newRecurringInstances.length > 0) {
        const { error: insertError } = await supabase
          .from('tasks')
          .insert(newRecurringInstances);

        if (insertError) throw insertError;
        
        // Re-fetch all tasks for the day to include newly inserted ones
        // This is simpler than merging manually and ensures consistency
        const { data: updatedTasks, error: updatedTasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());

        if (updatedTasksError) throw updatedTasksError;
        tasksToSet = updatedTasks || [];
      }
      
      setTasks(tasksToSet);
    } catch (error: any) {
      console.error('Error fetching or generating tasks:', error);
      showError('Failed to load tasks, or generate recurring tasks.');
    } finally {
      setLoading(false);
    }
  }, [userId, currentDate, sortKey, sortDirection]);

  // Effect to fetch sections and tasks on userId or date change
  useEffect(() => {
    fetchSections();
    fetchTasks();
  }, [fetchSections, fetchTasks]);

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
      return false; // Indicate failure
    }
    
    let targetSectionId = taskData.section_id;
    if (!targetSectionId && sections.length > 0) {
      targetSectionId = sections[0].id; // Default to the first available section
    } else if (!targetSectionId && sections.length === 0) {
      showError('Please create a section first before adding tasks.');
      return false; // Indicate failure
    }

    try {
      // Determine the highest order in the target section to place the new task at the end
      const targetSectionTasks = tasks.filter(t => t.section_id === targetSectionId);
      const maxOrder = targetSectionTasks.reduce((max, task) => Math.max(max, task.order || 0), -1);
      const newOrder = maxOrder + 1;

      // Generate ID before insert to set original_task_id if it's a recurring task
      const newTaskId = uuidv4();
      const taskToInsert = {
        id: newTaskId,
        description: taskData.description,
        user_id: userId,
        status: taskData.status || 'to-do',
        recurring_type: taskData.recurring_type || 'none',
        category: taskData.category || 'General',
        priority: taskData.priority || 'medium',
        due_date: taskData.due_date || null,
        notes: taskData.notes || null,
        remind_at: taskData.remind_at || null,
        section_id: targetSectionId,
        order: newOrder,
        original_task_id: taskData.recurring_type !== 'none' ? newTaskId : null, // Set original_task_id if recurring
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskToInsert)
        .select();

      if (error) {
        console.error('Error adding task:', error);
        showError('Failed to add task.');
        return false;
      }
      if (data && data.length > 0) {
        setTasks(prevTasks => [...prevTasks, data[0]]);
        showSuccess('Task added successfully!');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Exception adding task:', err);
      showError('An unexpected error occurred while adding the task.');
      return false;
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

    // Get tasks for the specific section from the current state
    const sectionTasks = tasks.filter(t => t.section_id === sectionId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

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
      // Get current tasks from state, filter by section, and sort by order
      const currentTasks = [...tasks];

      const sourceTasks = currentTasks.filter(t => t.section_id === sourceSectionId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const destinationTasks = currentTasks.filter(t => t.section_id === destinationSectionId)
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
    filteredTasks,
    loading,
    currentDate,
    setCurrentDate,
    userId,
    handleAddTask,
    updateTask,
    deleteTask,
    applyFilters,
    searchFilter,
    statusFilter,
    categoryFilter,
    priorityFilter,
    sectionFilter,
    setSearchFilter,
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