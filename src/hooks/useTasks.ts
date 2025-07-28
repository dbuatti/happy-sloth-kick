import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess, showReminder } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';
import { isSameDay, isPast, startOfDay as fnsStartOfDay, parseISO, format, isAfter, isBefore } from 'date-fns'; // Added isBefore

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
  parent_task_id: string | null;
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
  parent_task_id?: string | null;
}

const getInitialFilter = (key: string, defaultValue: string) => {
  if (typeof window !== 'undefined') {
    const storedValue = localStorage.getItem(`task_filter_${key}`);
    return storedValue !== null ? storedValue : defaultValue;
  }
  return defaultValue;
};

// Helper to get UTC start of day
const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

export const useTasks = () => {
  const HOOK_VERSION = "2024-07-29-11"; // Incremented version
  const { user } = useAuth();
  const userId = user?.id;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => getUTCStartOfDay(new Date()));
  console.log(`useTasks hook version: ${HOOK_VERSION}`);
  console.log('useTasks: Re-rendering. Current date in state (from hook start):', currentDate.toISOString());

  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<'priority' | 'due_date' | 'created_at' | 'order'>('order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sections, setSections] = useState<TaskSection[]>([]);

  const [searchFilter, setSearchFilter] = useState(() => getInitialFilter('search', ''));
  const [statusFilter, setStatusFilter] = useState(() => getInitialFilter('status', 'all'));
  const [categoryFilter, setCategoryFilter] = useState(() => getInitialFilter('category', 'all'));
  const [priorityFilter, setPriorityFilter] = useState(() => getInitialFilter('priority', 'all'));
  const [sectionFilter, setSectionFilter] = useState(() => getInitialFilter('section', 'all'));

  const remindedTaskIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('task_filter_search', searchFilter);
  }, [searchFilter]);

  useEffect(() => {
    localStorage.setItem('task_filter_status', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('task_filter_category', categoryFilter);
  }, [categoryFilter]);

  useEffect(() => {
    localStorage.setItem('task_filter_priority', priorityFilter);
  }, [priorityFilter]);

  useEffect(() => {
    localStorage.setItem('task_filter_section', sectionFilter);
  }, [sectionFilter]);

  const fetchDataAndSections = useCallback(async () => {
    console.trace('fetchDataAndSections called');
    setLoading(true);

    try {
      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('task_sections')
        .select('*')
        .eq('user_id', userId)
        .order('order', { ascending: true })
        .order('name', { ascending: true });
      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);
      console.log('useTasks useEffect: Sections fetched.');

      // Fetch all tasks from DB
      const { data: initialTasksFromDB, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;
      console.log('fetchTasks: Initial tasks fetched from DB:', initialTasksFromDB);

      let tasksToProcess = initialTasksFromDB || [];

      const dailyRecurringTemplates = tasksToProcess.filter(
        task => task.recurring_type === 'daily' && task.original_task_id === null
      );
      console.log('fetchTasks: Daily recurring templates found:', dailyRecurringTemplates);

      const newInstancesToInsert: Task[] = [];

      for (const template of dailyRecurringTemplates) {
        const startOfCurrentUTC = currentDate.toISOString();
        const endOfCurrentUTC = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();

        // Check if ANY instance (to-do, completed, skipped) for this template already exists for today
        const { data: existingInstances, error: checkError } = await supabase
          .from('tasks')
          .select('id')
          .eq('original_task_id', template.id)
          .eq('user_id', userId)
          .gte('created_at', startOfCurrentUTC)
          .lt('created_at', endOfCurrentUTC);

        if (checkError) throw checkError;
        console.log(`fetchTasks: Found ${existingInstances?.length || 0} existing instances (any status) for template "${template.description}" today.`);

        if (!existingInstances || existingInstances.length === 0) {
          const newInstance: Task = {
            ...template,
            id: uuidv4(),
            created_at: currentDate.toISOString(), // This is the key for daily instances
            status: 'to-do',
            recurring_type: 'none', // Instances are not recurring themselves
            original_task_id: template.id,
            due_date: null, // Reset due_date for new instance
            remind_at: null, // Reset remind_at for new instance
            parent_task_id: null, // Ensure it's a top-level task
          };
          newInstancesToInsert.push(newInstance);
          console.log('fetchTasks: Preparing to insert new instance:', newInstance.description);
        }
      }

      if (newInstancesToInsert.length > 0) {
        console.log('fetchTasks: Inserting new recurring instances:', newInstancesToInsert.map(t => t.description));
        const { data: insertedData, error: insertError } = await supabase
          .from('tasks')
          .insert(newInstancesToInsert)
          .select();

        if (insertError) throw insertError;
        console.log('fetchTasks: Inserted data:', insertedData);
        
        // After insertion, re-fetch ALL tasks to ensure state is fully consistent with DB
        const { data: finalTasksFromDB, error: finalFetchError } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId);
        if (finalFetchError) throw finalFetchError;
        setTasks(finalTasksFromDB || []);
        console.log('fetchTasks: Tasks state updated after re-fetching all tasks post-insertion.');

      } else {
        setTasks(tasksToProcess); // If no new instances, just set tasks from initial fetch
        console.log('fetchTasks: No new instances to insert, setting tasks from initial fetch.');
      }
      
    } catch (error: any) {
      console.error('Error in fetchDataAndSections:', error);
      showError('An unexpected error occurred while loading data.');
    } finally {
      setLoading(false);
      console.log('fetchTasks: Fetch process completed.');
    }
  }, [userId, currentDate]); // Dependencies for fetchDataAndSections

  useEffect(() => {
    if (userId) {
      fetchDataAndSections(); // Call the memoized function
    } else {
      setTasks([]);
      setSections([]);
      setLoading(false);
      console.log('useTasks useEffect: No user ID, clearing tasks and sections.');
    }
  }, [userId, currentDate, fetchDataAndSections]); // Add fetchDataAndSections to dependencies

  useEffect(() => {
    if (!userId) return;

    const reminderInterval = setInterval(() => {
      const now = new Date();
      tasks.forEach(task => {
        if (task.remind_at && task.status === 'to-do' && !remindedTaskIdsRef.current.has(task.id)) {
          const reminderTime = parseISO(task.remind_at);
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
          
          if (reminderTime <= now && reminderTime > fiveMinutesAgo) {
            showReminder(`Reminder: ${task.description}`, task.id);
            remindedTaskIdsRef.current.add(task.id);
          }
        }
      });
    }, 30 * 1000);

    return () => clearInterval(reminderInterval);
  }, [tasks, userId]);

  const handleAddTask = useCallback(async (newTaskData: NewTaskData) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    // Declare newTask outside the try block
    let newTask: Task;
    try {
      // Optimistically add the task to the state
      newTask = {
        id: uuidv4(),
        user_id: userId,
        created_at: currentDate.toISOString(),
        status: newTaskData.status || 'to-do',
        recurring_type: newTaskData.recurring_type || 'none',
        category: newTaskData.category || 'general',
        priority: newTaskData.priority || 'medium',
        due_date: newTaskData.due_date || null,
        notes: newTaskData.notes || null,
        remind_at: newTaskData.remind_at || null,
        section_id: newTaskData.section_id || null,
        order: null,
        original_task_id: null,
        parent_task_id: newTaskData.parent_task_id || null,
        description: newTaskData.description, // Added missing description
      };
      setTasks(prev => [...prev, newTask]);

      // Perform the database insert
      const { data, error } = await supabase
        .from('tasks')
        .insert(newTask)
        .select()
        .single();

      if (error) throw error;
      showSuccess('Task added successfully!');
      return true;
    } catch (error: any) {
      console.error('Error adding task:', error);
      showError('Failed to add task.');
      // If the database operation fails, revert the optimistic update
      setTasks(prev => prev.filter(task => task.id !== newTask.id));
      return false;
    }
  }, [userId, currentDate]);

  const updateTask = useCallback(async (taskId: string, updates: TaskUpdate) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      // Optimistically update the task in the state
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));

      // Perform the database update
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      showSuccess('Task updated successfully!');
    } catch (error: any) {
      console.error('Error updating task:', error);
      showError('Failed to update task.');
      // If the database operation fails, revert the optimistic update
      fetchDataAndSections();
    }
  }, [userId, fetchDataAndSections]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    // Declare taskToDelete outside the try block
    let taskToDelete: Task | undefined;
    try {
      // Optimistically remove the task from the state
      taskToDelete = tasks.find(t => t.id === taskId);
      setTasks(prev => prev.filter(task => task.id !== taskId && task.parent_task_id !== taskId));

      // Perform the database delete
      const { error: subtaskError } = await supabase
        .from('tasks')
        .delete()
        .eq('parent_task_id', taskId)
        .eq('user_id', userId);

      if (subtaskError) throw subtaskError;

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Task deleted successfully!');
    }
    catch (error: any) {
      console.error('Error deleting task:', error);
      showError('Failed to delete task.');
      // If the database operation fails, revert the optimistic update
      if (taskToDelete) {
        setTasks(prev => [...prev, taskToDelete]);
      }
    }
  }, [userId, tasks]);

  const toggleTaskSelection = useCallback((taskId: string, checked: boolean) => {
    setSelectedTaskIds(prev =>
      checked ? [...prev, taskId] : prev.filter(id => id !== taskId)
    );
  }, []);

  const clearSelectedTasks = useCallback(() => {
    setSelectedTaskIds([]);
  }, []);

  const bulkUpdateTasks = useCallback(async (updates: Partial<Task>, ids: string[] = selectedTaskIds) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    if (ids.length === 0) return;

    try {
      // Optimistically update the tasks in the state
      setTasks(prev => prev.map(task => 
        ids.includes(task.id) ? { ...task, ...updates } : task
      ));

      // Perform the database update
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .in('id', ids)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      showSuccess(`${ids.length} tasks updated successfully!`);
      clearSelectedTasks();
    } catch (error: any) {
      console.error('Error bulk updating tasks:', error);
      showError('Failed to update tasks in bulk.');
      // If the database operation fails, revert the optimistic update
      fetchDataAndSections();
    }
  }, [userId, selectedTaskIds, clearSelectedTasks, fetchDataAndSections]);

  const createSection = useCallback(async (name: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('task_sections')
        .insert({ name, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      setSections(prev => [...prev, data]);
      showSuccess('Section created successfully!');
    } catch (error: any) {
      console.error('Error creating section:', error);
      showError('Failed to create section.');
    }
  }, [userId]);

  const updateSection = useCallback(async (sectionId: string, newName: string) => {
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
        .select()
        .single();

      if (error) throw error;
      setSections(prev => prev.map(s => (s.id === sectionId ? data : s)));
      showSuccess('Section updated successfully!');
    }
    catch (error: any) {
      console.error('Error updating section:', error);
      showError('Failed to update section.');
    }
  }, [userId]);

  const deleteSection = useCallback(async (sectionId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      await supabase
        .from('tasks')
        .update({ section_id: null })
        .eq('section_id', sectionId)
        .eq('user_id', userId);

      const { error } = await supabase
        .from('task_sections')
        .delete()
        .eq('id', sectionId)
        .eq('user_id', userId);

      if (error) throw error;
      setSections(prev => prev.filter(s => s.id !== sectionId));
      setTasks(prev => prev.map(task =>
        task.section_id === sectionId ? { ...task, section_id: null } : task
      ));
      showSuccess('Section deleted successfully!');
    }
    catch (error: any) {
      showError('Failed to delete section.');
      console.error('Error deleting section:', error);
    }
  }, [userId]);

  const reorderTasksInSameSection = useCallback(async (sectionId: string | null, oldIndex: number, newIndex: number) => {
    setTasks(prevTasks => {
      const tasksInSection = prevTasks.filter(t => t.parent_task_id === null && t.section_id === sectionId);
      const otherTasks = prevTasks.filter(t => t.parent_task_id !== null || t.section_id !== sectionId);
      const reordered = [...tasksInSection];
      const [movedTask] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, movedTask);

      const updatedReordered = reordered.map((task, index) => ({ ...task, order: index }));

      updatedReordered.forEach(async (task) => {
        await supabase.from('tasks').update({ order: task.order }).eq('id', task.id);
      });

      return [...otherTasks, ...updatedReordered];
    });
  }, []);

  const moveTaskToNewSection = useCallback(async (taskId: string, sourceSectionId: string | null, destinationSectionId: string | null, destinationIndex: number) => {
    setTasks(prevTasks => {
      const taskToMove = prevTasks.find(t => t.id === taskId);
      if (!taskToMove) return prevTasks;

      const newTasks = prevTasks.filter(t => t.id !== taskId);
      const tasksInDestination = newTasks.filter(t => t.section_id === destinationSectionId);
      const otherTasks = newTasks.filter(t => t.section_id !== destinationSectionId);

      const updatedTaskToMove = { ...taskToMove, section_id: destinationSectionId, order: destinationIndex };
      
      const reorderedDestination = [...tasksInDestination];
      reorderedDestination.splice(destinationIndex, 0, updatedTaskToMove);

      const updatedDestinationTasks = reorderedDestination.map((task, index) => ({ ...task, order: index }));

      updatedDestinationTasks.forEach(async (task) => {
        await supabase.from('tasks').update({ section_id: task.section_id, order: task.order }).eq('id', task.id);
      });

      return [...otherTasks, ...updatedDestinationTasks];
    });
  }, []);

  const reorderSections = useCallback(async (oldIndex: number, newIndex: number) => {
    setSections(prevSections => {
      const reordered = [...prevSections];
      const [movedSection] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, movedSection);

      const updatedReordered = reordered.map((section, index) => ({ ...section, order: index }));

      updatedReordered.forEach(async (section) => {
        await supabase.from('task_sections').update({ order: section.order }).eq('id', section.id);
      });

      return updatedReordered;
    });
  }, []);

  const filteredTasks = useMemo(() => {
    console.log('filteredTasks: --- START FILTERING ---');
    const effectiveCurrentDateUTC = getUTCStartOfDay(currentDate); // Ensure this is UTC midnight
    console.log('filteredTasks: Current Date (UTC):', effectiveCurrentDateUTC.toISOString());
    console.log('filteredTasks: Raw tasks BEFORE filter:', tasks.map(t => ({
      id: t.id,
      description: t.description,
      status: t.status,
      created_at: t.created_at,
      original_task_id: t.original_task_id,
      recurring_type: t.recurring_type
    })));

    let workingTasks = [...tasks];

    // 1. Filter out subtasks (they are handled within parent tasks)
    workingTasks = workingTasks.filter(task => task.parent_task_id === null);
    console.log('filteredTasks: After subtask filter, count:', workingTasks.length);

    // Apply main daily view logic (if not in 'archived' filter)
    if (statusFilter !== 'archived') {
      workingTasks = workingTasks.filter(task => {
        const taskCreatedAt = parseISO(task.created_at);
        const taskCreatedAtUTC = getUTCStartOfDay(taskCreatedAt); // Convert task's created_at to UTC midnight for comparison

        const isTaskCreatedOnCurrentDate = isSameDay(taskCreatedAtUTC, effectiveCurrentDateUTC);

        console.log(`  Task "${task.description}" (ID: ${task.id}):`);
        console.log(`    created_at: ${task.created_at} (UTC: ${taskCreatedAtUTC.toISOString()})`);
        console.log(`    currentDate (UTC): ${effectiveCurrentDateUTC.toISOString()}`);
        console.log(`    isSameDay(${taskCreatedAtUTC.toISOString()}, ${effectiveCurrentDateUTC.toISOString()}) = ${isTaskCreatedOnCurrentDate}`);
        console.log(`    status: ${task.status}, recurring_type: ${task.recurring_type}, original_task_id: ${task.original_task_id}`);

        // Rule 1: Exclude recurring templates from the daily view
        if (task.recurring_type === 'daily' && task.original_task_id === null) {
          console.log(`    -> Rule 1: Recurring Template. Result: Excluded`);
          return false;
        }

        // Rule 2: Exclude archived tasks from the daily view
        if (task.status === 'archived') {
          console.log(`    -> Rule 2: Archived. Result: Excluded`);
          return false;
        }

        // Rule 3: Handle tasks that are 'to-do' or 'skipped'
        if (task.status === 'to-do' || task.status === 'skipped') {
          // For recurring instances, only show if created for the current day
          if (task.original_task_id !== null) {
            const shouldInclude = isTaskCreatedOnCurrentDate;
            console.log(`    -> Rule 3a: Active Recurring Instance. Created on current date? ${shouldInclude}. Result: ${shouldInclude ? 'Included' : 'Excluded'}`);
            return shouldInclude;
          }
          // For non-recurring tasks, show if active (regardless of creation date)
          else {
            console.log(`    -> Rule 3b: Active Non-Recurring Task. Result: Included`);
            return true;
          }
        }

        // Rule 4: Handle tasks that are 'completed'
        if (task.status === 'completed') {
          // Only show completed tasks if they were created (or generated as an instance) on the current day
          const shouldInclude = isTaskCreatedOnCurrentDate;
          console.log(`    -> Rule 4: Completed Task. Created on current date? ${shouldInclude}. Result: ${shouldInclude ? 'Included' : 'Excluded'}`);
          return shouldInclude;
        }
        
        console.log(`    -> No specific rule matched for daily view. Result: Excluded`);
        return false;
      });
      console.log('filteredTasks: After daily view logic, count:', workingTasks.length);
    } else {
      // For 'archived' status filter, only show archived tasks
      workingTasks = workingTasks.filter(task => task.status === 'archived');
      console.log('filteredTasks: After archived filter, count:', workingTasks.length);
    }

    // 3. Apply other filters (search, category, priority, section)
    if (searchFilter) {
      workingTasks = workingTasks.filter(task =>
        task.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchFilter.toLowerCase())
      );
      console.log('filteredTasks: After search filter, count:', workingTasks.length);
    }
    if (categoryFilter && categoryFilter !== 'all') {
      workingTasks = workingTasks.filter(task => task.category === categoryFilter);
      console.log('filteredTasks: After category filter, count:', workingTasks.length);
    }
    if (priorityFilter && priorityFilter !== 'all') {
      workingTasks = workingTasks.filter(task => task.priority === priorityFilter);
      console.log('filteredTasks: After priority filter, count:', workingTasks.length);
    }
    if (sectionFilter && sectionFilter !== 'all') {
      workingTasks = workingTasks.filter(task => {
        if (sectionFilter === 'no-section') {
          return task.section_id === null;
        }
        return task.section_id === sectionFilter;
      });
      console.log('filteredTasks: After section filter, count:', workingTasks.length);
    }

    // 4. Apply final status filter for non-archived views (if statusFilter is not 'all')
    if (statusFilter !== 'all' && statusFilter !== 'archived') {
      workingTasks = workingTasks.filter(task => task.status === statusFilter);
      console.log('filteredTasks: After final status filter, count:', workingTasks.length);
    }

    console.log('filteredTasks: Final tasks AFTER filter:', workingTasks.map(t => ({
      id: t.id,
      description: t.description,
      status: t.status,
      created_at: t.created_at,
      original_task_id: t.original_task_id,
      recurring_type: t.recurring_type
    })));
    console.log('filteredTasks: --- END FILTERING ---');
    return workingTasks;
  }, [tasks, currentDate, searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter]);

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