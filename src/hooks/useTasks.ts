import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';
import { isSameDay, isPast, startOfDay as fnsStartOfDay } from 'date-fns';

export interface Task {
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
  original_task_id: string | null;
}

export interface TaskSection {
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

  const [tasks, setTasks] = useState<Task[]>([]); // This will now hold ALL tasks for the user
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
    
    try {
      // Fetch ALL tasks for the user.
      // The filtering for 'archived' status for the main dashboard
      // and date relevance will happen in the `filteredTasks` memo.
      const { data: fetchedTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId); // Fetch all tasks for the user

      if (fetchError) throw fetchError;

      let allUserTasks: Task[] = fetchedTasks || [];

      // --- Recurring task generation logic ---
      const dailyRecurringTemplates: Task[] = [];
      const existingOriginalIdsForToday = new Set<string>();
      const startOfCurrentDate = fnsStartOfDay(currentDate);

      for (const task of allUserTasks) {
        const taskCreatedAt = new Date(task.created_at);
        // Only consider non-archived tasks for recurring generation
        if (task.recurring_type === 'daily' && task.status !== 'archived') {
          dailyRecurringTemplates.push(task);
          if (isSameDay(taskCreatedAt, currentDate)) {
            existingOriginalIdsForToday.add(task.id);
          }
        }
        // Also check for existing instances created today
        if (task.original_task_id && isSameDay(taskCreatedAt, currentDate)) {
          existingOriginalIdsForToday.add(task.original_task_id);
        }
      }

      const newRecurringInstances: Task[] = [];
      for (const template of dailyRecurringTemplates) {
        if (new Date(template.created_at) < startOfCurrentDate && !existingOriginalIdsForToday.has(template.id)) {
          const newInstance: Task = {
            ...template,
            id: uuidv4(),
            created_at: currentDate.toISOString(),
            status: 'to-do',
            recurring_type: 'none',
            original_task_id: template.id,
            order: template.order,
          };
          newRecurringInstances.push(newInstance);
        }
      }

      if (newRecurringInstances.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('tasks')
          .insert(newRecurringInstances)
          .select();

        if (insertError) {
          console.error('Error inserting recurring instance:', insertError);
          showError('Failed to generate a recurring task instance.');
        } else if (insertedData) {
          allUserTasks.push(...insertedData);
        }
      }
      
      setTasks(allUserTasks); // Set the full list of tasks here
    } catch (error: any) {
      console.error('Error fetching or generating tasks:', error);
      showError('An unexpected error occurred while loading tasks.');
    } finally {
      setLoading(false);
    }
  }, [userId, currentDate]); // currentDate is a dependency for recurring task generation

  useEffect(() => {
    fetchSections();
    fetchTasks();
  }, [fetchSections, fetchTasks]);

  const filteredTasks = useMemo(() => {
    let tempTasks = [...tasks]; // 'tasks' now holds ALL tasks for the user

    const startOfCurrentDate = fnsStartOfDay(currentDate);

    // Apply date relevance filter based on the current view (Daily Tasks)
    // This logic applies ONLY if the statusFilter is 'all', 'to-do', or 'skipped'.
    // If statusFilter is 'completed' or 'archived', we skip this date relevance filter
    // and let the subsequent status filter handle it.
    if (statusFilter === 'all' || statusFilter === 'to-do' || statusFilter === 'skipped') {
      tempTasks = tempTasks.filter(task => {
        const taskCreatedAt = new Date(task.created_at);
        const taskDueDate = task.due_date ? new Date(task.due_date) : null;

        // 1. Tasks created on the current day (unless archived)
        if (isSameDay(taskCreatedAt, currentDate) && task.status !== 'archived') return true;

        // 2. Tasks due on the current day (unless archived)
        if (taskDueDate && isSameDay(taskDueDate, currentDate) && task.status !== 'archived') return true;

        // 3. Overdue tasks (status 'to-do' or 'skipped') from previous days
        if ((task.status === 'to-do' || task.status === 'skipped') && taskDueDate && isPast(taskDueDate) && !isSameDay(taskDueDate, currentDate)) return true;

        // 4. Undated tasks (status 'to-do' or 'skipped') created before today
        if ((task.status === 'to-do' || task.status === 'skipped') && taskDueDate === null && taskCreatedAt < startOfCurrentDate) return true;

        return false; // Exclude tasks that don't meet the above criteria for the daily view
      });
    }

    // Apply search, category, priority, section filters
    if (searchFilter) {
      tempTasks = tempTasks.filter(task =>
        task.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }
    // Apply status filter if it's not 'all'.
    // This will correctly filter for 'completed' or 'archived' if those filters are selected.
    if (statusFilter !== 'all') {
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

    // Apply user-selected sorting
    if (sortKey === 'order') {
      tempTasks.sort((a, b) => {
        const orderA = a.order === null ? Infinity : a.order;
        const orderB = b.order === null ? Infinity : b.order;
        return sortDirection === 'asc' ? orderA - orderB : orderB - orderA;
      });
    } else if (sortKey === 'priority') {
      const priorityOrder: { [key: string]: number } = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1, 'none': 0 };
      tempTasks.sort((a, b) => {
        const valA = priorityOrder[a.priority] || 0;
        const valB = priorityOrder[b.priority] || 0;
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
    } else if (sortKey === 'due_date') {
      tempTasks.sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else if (sortKey === 'created_at') {
      tempTasks.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    return tempTasks;
  }, [tasks, currentDate, searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter, sortKey, sortDirection]);

  const handleAddTask = async (taskData: NewTaskData) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    
    let targetSectionId = taskData.section_id;
    if (!targetSectionId && sections.length > 0) {
      targetSectionId = sections[0].id;
    } else if (!targetSectionId && sections.length === 0) {
      showError('Please create a section first before adding tasks.');
      return false;
    }

    const newTaskId = uuidv4();
    const now = new Date().toISOString();

    const targetSectionTasks = tasks.filter(t => t.section_id === targetSectionId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const newOrder = targetSectionTasks.length > 0 ? (targetSectionTasks[targetSectionTasks.length - 1].order || 0) + 1 : 0;

    const taskToInsert: Task = {
      id: newTaskId,
      description: taskData.description,
      user_id: userId,
      status: taskData.status || 'to-do',
      recurring_type: taskData.recurring_type || 'none',
      category: taskData.category || 'general',
      priority: taskData.priority || 'medium',
      due_date: taskData.due_date || currentDate.toISOString(), // Default to currentDate if not provided
      notes: taskData.notes || null,
      remind_at: taskData.remind_at,
      section_id: targetSectionId,
      order: newOrder,
      original_task_id: taskData.recurring_type !== 'none' ? newTaskId : null,
      created_at: now,
    };

    // Optimistic update
    setTasks(prevTasks => [...prevTasks, taskToInsert]);

    try {
      const { error } = await supabase
        .from('tasks')
        .insert(taskToInsert);

      if (error) {
        console.error('Error adding task:', error);
        showError('Failed to add task.');
        // Revert optimistic update on error
        setTasks(prevTasks => prevTasks.filter(task => task.id !== newTaskId));
        return false;
      }
      
      showSuccess('Task added successfully!');
      return true;
    } catch (err) {
      console.error('Exception adding task:', err);
      showError('An unexpected error occurred while adding the task.');
      // Revert optimistic update on exception
      setTasks(prevTasks => prevTasks.filter(task => task.id !== newTaskId));
      return false;
    }
  };

  const updateTask = async (taskId: string, updates: TaskUpdate) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const prevTasks = tasks; // Capture current state for rollback

    // Optimistic update
    setTasks(prevTasks => prevTasks.map(task => (task.id === taskId ? { ...task, ...updates } : task)));

    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating task:', error);
        showError(error.message);
        setTasks(prevTasks); // Revert optimistic update
        return;
      }
      showSuccess('Task updated successfully!');
    } catch (err) {
      console.error('Exception updating task:', err);
      showError('An unexpected error occurred while updating the task.');
      setTasks(prevTasks); // Revert optimistic update
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const prevTasks = tasks; // Capture current state for rollback
    const deletedTask = tasks.find(task => task.id === taskId);

    // Optimistic update
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting task:', error);
        showError(error.message);
        if (deletedTask) {
          setTasks(prevTasks => [...prevTasks, deletedTask]); // Revert optimistic update
        }
        return;
      }
      showSuccess('Task deleted successfully!');
    } catch (err) {
      console.error('Exception deleting task:', err);
      showError('An unexpected error occurred while deleting the task.');
      if (deletedTask) {
        setTasks(prevTasks => [...prevTasks, deletedTask]); // Revert optimistic update
      }
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

  const bulkUpdateTasks = async (updates: TaskUpdate, idsToUpdate?: string[]) => {
    const targetIds = idsToUpdate && idsToUpdate.length > 0 ? idsToUpdate : selectedTaskIds;
    if (!userId || targetIds.length === 0) {
      showError('No tasks selected for bulk update.');
      return;
    }
    const prevTasks = tasks; // Capture current state for rollback

    // Optimistic update
    setTasks(prevTasks => prevTasks.map(task => targetIds.includes(task.id) ? { ...task, ...updates } : task));

    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .in('id', targetIds)
        .eq('user_id', userId);

      if (error) {
        console.error('Error bulk updating tasks:', error);
        showError(error.message);
        setTasks(prevTasks); // Revert optimistic update
        return;
      }
      showSuccess('Tasks updated successfully!');
      clearSelectedTasks();
    } catch (err) {
      console.error('Exception bulk updating tasks:', err);
      showError('An unexpected error occurred during bulk update.');
      setTasks(prevTasks); // Revert optimistic update
    }
  };

  const createSection = async (name: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const prevSections = sections; // Capture current state for rollback
    const newSectionId = uuidv4();
    const maxOrder = sections.reduce((max, section) => Math.max(max, section.order || 0), -1);
    const newOrder = maxOrder + 1;

    const newSection: TaskSection = { id: newSectionId, name, user_id: userId, order: newOrder };

    // Optimistic update
    setSections(prevSections => [...prevSections, newSection]);

    try {
      const { error } = await supabase
        .from('task_sections')
        .insert({ id: newSectionId, name, user_id: userId, order: newOrder });

      if (error) {
        console.error('Error creating section:', error);
        showError(error.message);
        setSections(prevSections); // Revert optimistic update
        return;
      }
      showSuccess('Section created successfully!');
    } catch (err) {
      console.error('Exception creating section:', err);
      showError('An unexpected error occurred while creating the section.');
      setSections(prevSections); // Revert optimistic update
    }
  };

  const updateSection = async (sectionId: string, newName: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const prevSections = sections; // Capture current state for rollback

    // Optimistic update
    setSections(prevSections => prevSections.map(sec => sec.id === sectionId ? { ...sec, name: newName } : sec));

    try {
      const { error } = await supabase
        .from('task_sections')
        .update({ name: newName })
        .eq('id', sectionId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating section:', error);
        showError(error.message);
        setSections(prevSections); // Revert optimistic update
        return;
      }
      showSuccess('Section updated successfully!');
    } catch (err: any) {
      console.error('Exception updating section:', err);
      showError('An unexpected error occurred while updating the section.');
      setSections(prevSections); // Revert optimistic update
    }
  };

  const deleteSection = async (sectionId: string, reassignToSectionId: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const prevSections = sections; // Capture current state for rollback
    const prevTasks = tasks; // Capture current state for rollback
    const deletedSection = sections.find(sec => sec.id === sectionId);

    // Optimistic update
    setSections(prevSections => prevSections.filter(sec => sec.id !== sectionId));
    setTasks(prevTasks => prevTasks.map(task => task.section_id === sectionId ? { ...task, section_id: reassignToSectionId } : task));

    try {
      // Update tasks that belong to this section to the new reassignToSectionId
      const { error: updateTasksError } = await supabase
        .from('tasks')
        .update({ section_id: reassignToSectionId })
        .eq('section_id', sectionId)
        .eq('user_id', userId);

      if (updateTasksError) {
        console.error('Error reassigning tasks from section:', updateTasksError);
        showError(updateTasksError.message);
        setSections(prevSections); // Revert optimistic update
        setTasks(prevTasks); // Revert optimistic update
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
        showError(deleteSectionError.message);
        setSections(prevSections); // Revert optimistic update
        setTasks(prevTasks); // Revert optimistic update
        return;
      }

      showSuccess('Section deleted successfully and tasks reassigned!');
    } catch (err) {
      console.error('Exception deleting section:', err);
      showError('An unexpected error occurred while deleting the section.');
      setSections(prevSections); // Revert optimistic update
      setTasks(prevTasks); // Revert optimistic update
    }
  };

  const reorderTasksInSameSection = async (sectionId: string | null, startIndex: number, endIndex: number) => {
    if (!userId) return;
    const prevTasks = tasks; // Capture current state for rollback

    // Optimistic update
    setTasks(prevTasks => {
      const newTasks = [...prevTasks];
      const sectionTasks = newTasks.filter(t => t.section_id === sectionId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      const [removed] = sectionTasks.splice(startIndex, 1);
      sectionTasks.splice(endIndex, 0, removed);

      const updatedSectionTasks = sectionTasks.map((task, index) => ({
        ...task,
        order: index,
      }));

      return newTasks.map(task => {
        const updatedTask = updatedSectionTasks.find(t => t.id === task.id);
        return updatedTask || task;
      });
    });

    try {
      const sectionTasksToUpdate = prevTasks.filter(t => t.section_id === sectionId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      const result = Array.from(sectionTasksToUpdate);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);

      const updates = result.map((task, index) => ({
        id: task.id,
        order: index,
      }));

      const { error } = await supabase.from('tasks').upsert(updates, { onConflict: 'id' });
      if (error) {
        console.error('Error reordering tasks:', error);
        showError(error.message);
        setTasks(prevTasks); // Revert optimistic update
        return;
      }
      showSuccess('Tasks reordered successfully!');
    } catch (err) {
      console.error('Exception reordering tasks:', err);
      showError('An unexpected error occurred while reordering the tasks.');
      setTasks(prevTasks); // Revert optimistic update
    }
  };

  const moveTaskToNewSection = async (
    taskId: string,
    sourceSectionId: string | null,
    destinationSectionId: string | null,
    destinationIndex: number
  ) => {
    if (!userId) return;
    const prevTasks = tasks; // Capture current state for rollback

    // Optimistic update
    setTasks(prevTasks => {
      const newTasks = [...prevTasks];
      
      const sourceTasks = newTasks.filter(t => t.section_id === sourceSectionId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const destinationTasks = newTasks.filter(t => t.section_id === destinationSectionId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const movedTask = sourceTasks.find(t => t.id === taskId);
      if (!movedTask) return prevTasks;

      const newSourceTasks = sourceTasks.filter(t => t.id !== taskId).map((task, index) => ({
        ...task,
        order: index,
      }));

      const tempNewDestinationTasks = Array.from(destinationTasks);
      tempNewDestinationTasks.splice(destinationIndex, 0, { ...movedTask, section_id: destinationSectionId });
      const newDestinationTasks = tempNewDestinationTasks.map((task, index) => ({
        ...task,
        order: index,
      }));

      return newTasks.map(task => {
        if (task.id === taskId) {
          return { ...task, section_id: destinationSectionId, order: destinationIndex };
        }
        const updatedSourceTask = newSourceTasks.find(t => t.id === task.id);
        if (updatedSourceTask) return updatedSourceTask;
        const updatedDestTask = newDestinationTasks.find(t => t.id === task.id);
        if (updatedDestTask) return updatedDestTask;
        return task;
      });
    });

    try {
      // Fetch current state from DB to ensure accurate re-indexing for persistence
      const { data: currentDbTasks, error: dbFetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);
      
      if (dbFetchError) {
        console.error('Error fetching tasks for move operation:', dbFetchError);
        showError(dbFetchError.message);
        setTasks(prevTasks); // Revert optimistic update
        return;
      }

      const dbSourceTasks = currentDbTasks.filter(t => t.section_id === sourceSectionId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const dbDestinationTasks = currentDbTasks.filter(t => t.section_id === destinationSectionId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const movedTaskFromDb = dbSourceTasks.find(t => t.id === taskId);
      if (!movedTaskFromDb) throw new Error('Moved task not found in source section in DB.');

      const newDbSourceTasks = dbSourceTasks.filter(t => t.id !== taskId).map((task, index) => ({
        id: task.id,
        order: index,
      }));

      const tempNewDbDestinationTasks = Array.from(dbDestinationTasks);
      tempNewDbDestinationTasks.splice(destinationIndex, 0, { ...movedTaskFromDb, section_id: destinationSectionId });
      const newDbDestinationTasks = tempNewDbDestinationTasks.map((task, index) => ({
        id: task.id,
        order: index,
        section_id: destinationSectionId,
      }));

      const updates: { id: string; order: number; section_id?: string | null }[] = [
        ...newDbSourceTasks,
        ...newDbDestinationTasks,
      ];

      const { error } = await supabase.from('tasks').upsert(updates, { onConflict: 'id' });
      if (error) {
        console.error('Error moving task:', error);
        showError(error.message);
        setTasks(prevTasks); // Revert optimistic update
        return;
      }
      showSuccess('Task moved successfully!');
    } catch (err) {
      console.error('Exception moving task:', err);
      showError('An unexpected error occurred while moving the task.');
      setTasks(prevTasks); // Revert optimistic update
    }
  };

  const reorderSections = async (startIndex: number, endIndex: number) => {
    if (!userId) return;
    const prevSections = sections; // Capture current state for rollback

    // Optimistic update
    setSections(prevSections => {
      const newSections = Array.from(prevSections);
      const [removed] = newSections.splice(startIndex, 1);
      newSections.splice(endIndex, 0, removed);

      return newSections.map((section, index) => ({
        ...section,
        order: index,
      }));
    });

    try {
      const sectionsToUpdate = Array.from(prevSections);
      const [removed] = sectionsToUpdate.splice(startIndex, 1);
      sectionsToUpdate.splice(endIndex, 0, removed);

      const updates = sectionsToUpdate.map((section, index) => ({
        id: section.id,
        order: index,
      }));

      const { error } = await supabase.from('task_sections').upsert(updates, { onConflict: 'id' });
      if (error) {
        console.error('Error reordering sections:', error);
        showError(error.message);
        setSections(prevSections); // Revert optimistic update
        return;
      }
      showSuccess('Sections reordered successfully!');
    } catch (err) {
      console.error('Exception reordering sections:', err);
      showError('An unexpected error occurred while reordering sections.');
      setSections(prevSections); // Revert optimistic update
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
    reorderSections,
  };
};