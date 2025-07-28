import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess, showReminder } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';
import { isSameDay, isPast, startOfDay as fnsStartOfDay, parseISO, format, isAfter, isBefore, addDays, addWeeks, addMonths } from 'date-fns';

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
  original_task_id: string | null; // This is the ID of the original recurring task if this is an instance
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
  const HOOK_VERSION = "2024-07-29-15"; // Updated version
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
  const createdRecurringInstancesTodayRef = useRef<Set<string>>(new Set()); // New ref to prevent duplicate recurring instances

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

  // New useEffect to clear the ref when currentDate changes
  useEffect(() => {
    createdRecurringInstancesTodayRef.current.clear();
    console.log('Cleared createdRecurringInstancesTodayRef due to currentDate change.');
  }, [currentDate]);

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

      setTasks(initialTasksFromDB || []);
      console.log('fetchTasks: Tasks state updated with fetched data.');
      
    } catch (error: any) {
      console.error('Error in fetchDataAndSections:', error);
      showError('An unexpected error occurred while loading data.');
    } finally {
      setLoading(false);
      console.log('fetchTasks: Fetch process completed.');
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchDataAndSections();
    } else {
      setTasks([]);
      setSections([]);
      setLoading(false);
      console.log('useTasks useEffect: No user ID, clearing tasks and sections.');
    }
  }, [userId, fetchDataAndSections]);

  useEffect(() => {
    if (!userId) return;

    const reminderInterval = setInterval(() => {
      tasks.forEach(task => {
        if (task.remind_at && task.status === 'to-do' && !remindedTaskIdsRef.current.has(task.id)) {
          const reminderTime = parseISO(task.remind_at);
          const fiveMinutesAgo = new Date(new Date().getTime() - 5 * 60 * 1000); // Corrected to 5 minutes
          
          if (reminderTime <= new Date() && reminderTime > fiveMinutesAgo) {
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
    let newTask: Task;
    try {
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
        description: newTaskData.description,
      };
      setTasks(prev => [...prev, newTask]);

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
      setTasks(prev => prev.filter(task => task.id !== newTask.id));
      return false;
    }
  }, [userId, currentDate]);

  const createRecurringTaskInstance = useCallback(async (originalRecurringTask: Task) => {
    console.log('createRecurringTaskInstance: Called for original task:', { id: originalRecurringTask.id, description: originalRecurringTask.description, status: originalRecurringTask.status, recurring_type: originalRecurringTask.recurring_type });
    if (originalRecurringTask.recurring_type === 'none' || !userId) return;

    let nextRecurrenceDate = new Date();
    if (originalRecurringTask.recurring_type === 'daily') {
      nextRecurrenceDate = addDays(currentDate, 1); // Base on currentDate from hook state
    } else if (originalRecurringTask.recurring_type === 'weekly') {
      nextRecurrenceDate = addWeeks(currentDate, 1);
    } else if (originalRecurringTask.recurring_type === 'monthly') {
      nextRecurrenceDate = addMonths(currentDate, 1);
    }
    
    const nextRecurrenceDateUTC = getUTCStartOfDay(nextRecurrenceDate);

    // Unique key for this original task and target recurrence date
    const uniqueKeyForTargetDate = `${originalRecurringTask.id}-${nextRecurrenceDateUTC.toISOString()}`;

    // 1. Check local ref to prevent immediate duplicates from rapid calls
    if (createdRecurringInstancesTodayRef.current.has(uniqueKeyForTargetDate)) {
        console.log(`createRecurringTaskInstance: Skipping creation: Instance for "${originalRecurringTask.description}" on ${nextRecurrenceDateUTC.toISOString()} already processed in current session.`);
        return;
    }

    // 2. Check existing tasks in state (including optimistically added ones)
    const existingInstanceForNextDay = tasks.some(t => 
      (t.original_task_id === originalRecurringTask.id || t.id === originalRecurringTask.id) && 
      isSameDay(getUTCStartOfDay(parseISO(t.created_at)), nextRecurrenceDateUTC) &&
      t.status === 'to-do' // Only consider active instances
    );

    if (existingInstanceForNextDay) {
      console.log(`createRecurringTaskInstance: Skipping creation: Instance for "${originalRecurringTask.description}" on ${nextRecurrenceDateUTC.toISOString()} already exists in state.`);
      createdRecurringInstancesTodayRef.current.add(uniqueKeyForTargetDate); // Mark as processed even if found in state
      return;
    }

    const newInstance: Task = {
      ...originalRecurringTask,
      id: uuidv4(),
      created_at: nextRecurrenceDateUTC.toISOString(),
      status: 'to-do', // This is explicitly set to 'to-do'
      original_task_id: originalRecurringTask.id,
      due_date: null, // Reset due_date for the new instance
      remind_at: null, // Reset remind_at for the new instance
    };
    console.log('createRecurringTaskInstance: New instance created with status:', newInstance.status, 'and created_at:', newInstance.created_at);

    const { error: insertError } = await supabase
      .from('tasks')
      .insert(newInstance);

    if (insertError) {
      console.error('createRecurringTaskInstance: Error creating recurring task instance:', insertError);
      showError('Failed to create the next instance of the recurring task.');
      return;
    }
    setTasks(prev => [...prev, newInstance]);
    createdRecurringInstancesTodayRef.current.add(uniqueKeyForTargetDate); // Mark as processed after successful insert
    showSuccess(`Recurring task "${originalRecurringTask.description}" has been reset for ${format(nextRecurrenceDate, 'MMM d')}.`);
  }, [userId, tasks, currentDate]);

  const updateTask = useCallback(async (taskId: string, updates: TaskUpdate) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const originalTask = tasks.find(t => t.id === taskId); // Get the task before optimistic update
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

      // --- NEW LOGIC FOR RECURRING TASKS ---
      if (originalTask && updates.status === 'completed' && originalTask.recurring_type !== 'none') {
        // If an original recurring task is completed, create its next instance
        // Only create if it's the original task (not an instance itself)
        const taskToConsiderForRecurrence = originalTask.original_task_id ? tasks.find(t => t.id === originalTask.original_task_id) : originalTask;
        if (taskToConsiderForRecurrence) {
            await createRecurringTaskInstance(taskToConsiderForRecurrence);
        }
      }
      // --- END NEW LOGIC ---

    } catch (error: any) {
      console.error('Error updating task:', error);
      showError('Failed to update task.');
      // If the database operation fails, revert the optimistic update
      fetchDataAndSections();
    }
  }, [userId, fetchDataAndSections, tasks, createRecurringTaskInstance]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    let taskToDelete: Task | undefined;
    try {
      taskToDelete = tasks.find(t => t.id === taskId);
      setTasks(prev => prev.filter(task => task.id !== taskId && task.parent_task_id !== taskId));

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
      setTasks(prev => prev.map(task => 
        ids.includes(task.id) ? { ...task, ...updates } : task
      ));

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
    const effectiveCurrentDateUTC = getUTCStartOfDay(currentDate);
    console.log('filteredTasks: Current Date (UTC):', effectiveCurrentDateUTC.toISOString());
    console.log('filteredTasks: Raw tasks BEFORE filter:', tasks.map(t => ({
      id: t.id,
      description: t.description,
      status: t.status,
      created_at: t.created_at,
      original_task_id: t.original_task_id,
      recurring_type: t.recurring_type,
      parent_task_id: t.parent_task_id
    })));

    let relevantTasks: Task[] = [];

    // 1. Filter out subtasks first
    const topLevelTasks = tasks.filter(task => task.parent_task_id === null);

    // 2. Handle archived tasks (they are date-agnostic for the archive view)
    if (statusFilter === 'archived') {
      relevantTasks = topLevelTasks.filter(task => task.status === 'archived');
    } else {
      // 3. For non-archived views, determine which tasks are relevant for the current date
      const recurringTasksMap: Record<string, Task[]> = {}; // Map originalId to an array of its instances for currentDate
      const nonRecurringTasksForCurrentDate: Task[] = [];

      topLevelTasks.forEach(task => {
        const taskCreatedAtUTC = getUTCStartOfDay(parseISO(task.created_at));
        const isTaskCreatedOnCurrentDate = isSameDay(taskCreatedAtUTC, effectiveCurrentDateUTC);

        if (task.recurring_type !== 'none') {
          const originalId = task.original_task_id || task.id;
          
          // Collect all instances (and the original template if relevant) that are not archived
          if (task.status !== 'archived') {
              if (!recurringTasksMap[originalId]) {
                  recurringTasksMap[originalId] = [];
              }
              recurringTasksMap[originalId].push(task);
          }
        } else {
          // Non-recurring tasks: only show if created on the current date and not archived
          if (isTaskCreatedOnCurrentDate && task.status !== 'archived') {
            nonRecurringTasksForCurrentDate.push(task);
          }
        }
      });

      // Now, for each original recurring task, select the single best instance to display
      Object.values(recurringTasksMap).forEach(instances => {
          // Filter instances to only those relevant for the current date or the original template
          const instancesForCurrentDate = instances.filter(t => isSameDay(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC));
          const originalTemplate = instances.find(t => t.original_task_id === null);

          let bestInstanceToDisplay: Task | undefined;

          if (instancesForCurrentDate.length > 0) {
              // If there are instances specifically for the current date, pick the best one among them
              instancesForCurrentDate.sort((a, b) => {
                  // Prioritize 'to-do'
                  if (a.status === 'to-do' && b.status !== 'to-do') return -1;
                  if (a.status !== 'to-do' && b.status === 'to-do') return 1;
                  // Then by most recent created_at (if status is same)
                  return getUTCStartOfDay(parseISO(b.created_at)).getTime() - getUTCStartOfDay(parseISO(a.created_at)).getTime();
              });
              bestInstanceToDisplay = instancesForCurrentDate[0];
          } else if (originalTemplate && (isBefore(getUTCStartOfDay(parseISO(originalTemplate.created_at)), effectiveCurrentDateUTC) || isSameDay(getUTCStartOfDay(parseISO(originalTemplate.created_at)), effectiveCurrentDateUTC))) {
              // If no instance for current date, but there's an original template that was created before or on current date
              bestInstanceToDisplay = originalTemplate;
          }

          if (bestInstanceToDisplay) {
              relevantTasks.push(bestInstanceToDisplay);
              console.log('filteredTasks: Adding recurring task to relevantTasks:', { id: bestInstanceToDisplay.id, description: bestInstanceToDisplay.description, status: bestInstanceToDisplay.status, created_at: bestInstanceToDisplay.created_at, original_task_id: bestInstanceToDisplay.original_task_id });
          }
      });

      relevantTasks.push(...nonRecurringTasksForCurrentDate); // Add non-recurring tasks after recurring ones are processed
    }

    // 4. Apply status filter (if not 'all' and not 'archived' which was handled above)
    if (statusFilter !== 'all' && statusFilter !== 'archived') {
      relevantTasks = relevantTasks.filter(task => task.status === statusFilter);
    }

    // 5. Apply other filters (search, category, priority, section)
    if (searchFilter) {
      relevantTasks = relevantTasks.filter(task =>
        task.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }
    if (categoryFilter && categoryFilter !== 'all') {
      relevantTasks = relevantTasks.filter(task => task.category === categoryFilter);
    }
    if (priorityFilter && priorityFilter !== 'all') {
      relevantTasks = relevantTasks.filter(task => task.priority === priorityFilter);
    }
    if (sectionFilter && sectionFilter !== 'all') {
      relevantTasks = relevantTasks.filter(task => {
        if (sectionFilter === 'no-section') {
          return task.section_id === null;
        }
        return task.section_id === sectionFilter;
      });
    }

    // 6. Sort the final tasks
    relevantTasks.sort((a, b) => {
      const statusOrder = { 'to-do': 1, 'skipped': 2, 'completed': 3, 'archived': 4 };
      const statusComparison = statusOrder[a.status] - statusOrder[b.status];
      if (statusComparison !== 0) return statusComparison;

      const aSectionOrder = sections.find(s => s.id === a.section_id)?.order ?? Infinity;
      const bSectionOrder = sections.find(s => s.id === b.section_id)?.order ?? Infinity;
      if (aSectionOrder !== bSectionOrder) return aSectionOrder - bSectionOrder;

      const aOrder = a.order ?? Infinity;
      const bOrder = b.order ?? Infinity;
      if (aOrder !== bOrder) return aOrder - bOrder;

      return parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime();
    });

    console.log('filteredTasks: Final tasks AFTER all filters and sorting:', relevantTasks.map(t => ({
      id: t.id,
      description: t.description,
      status: t.status,
      created_at: t.created_at,
      original_task_id: t.original_task_id,
      recurring_type: t.recurring_type,
      parent_task_id: t.parent_task_id
    })));
    console.log('filteredTasks: --- END FILTERING ---');
    return relevantTasks;
  }, [tasks, currentDate, searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter, sections]);

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