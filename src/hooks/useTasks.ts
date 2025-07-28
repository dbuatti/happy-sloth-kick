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
  const HOOK_VERSION = "2024-07-30-05"; // Updated version
  const { user, loading: authLoading } = useAuth();
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

  // useEffect to clear selected tasks when currentDate changes
  useEffect(() => {
    setSelectedTaskIds([]);
    console.log('Cleared selectedTaskIds due to currentDate change.');
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

  // Function to create a new recurring task instance in DB
  // This function no longer updates local state directly.
  const createRecurringTaskInstance = useCallback(async (originalTask: Task, targetDate: Date): Promise<boolean> => {
    console.log(`createRecurringTaskInstance: Attempting to create instance for original task "${originalTask.description}" on ${format(targetDate, 'yyyy-MM-dd')}`);
    if (originalTask.recurring_type === 'none' || !userId) return false;

    const targetDateUTC = getUTCStartOfDay(targetDate);

    // Check if an instance already exists for this targetDate in the current state
    // This check is crucial to prevent duplicate DB inserts if syncRecurringTasks is called multiple times
    const existingInstance = tasks.find(t =>
      (t.original_task_id === originalTask.id || t.id === originalTask.id) &&
      isSameDay(getUTCStartOfDay(parseISO(t.created_at)), targetDateUTC)
    );

    if (existingInstance) {
      console.log(`createRecurringTaskInstance: Skipping creation: Instance for "${originalTask.description}" on ${format(targetDate, 'yyyy-MM-dd')} already exists in state with status: ${existingInstance.status}.`);
      return false; // Indicate that no new task was created
    }

    const newInstance: Task = {
      ...originalTask,
      id: uuidv4(),
      created_at: targetDateUTC.toISOString(),
      status: 'to-do', // New instances are always 'to-do'
      original_task_id: originalTask.id,
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
      return false;
    }
    showSuccess(`Recurring task "${originalTask.description}" created for ${format(targetDate, 'MMM d')}.`);
    return true; // Indicate successful creation
  }, [userId, tasks]); // `tasks` is a dependency because we read from it to check `existingInstance`

  // New function to sync recurring tasks for the current date
  const syncRecurringTasks = useCallback(async () => {
    if (!userId || tasks.length === 0) {
      console.log('syncRecurringTasks: Skipping sync - no user or no tasks loaded.');
      return;
    }

    console.log(`syncRecurringTasks: Running for date ${currentDate.toISOString()}`);

    const originalRecurringTasks = tasks.filter(t => t.recurring_type !== 'none' && t.original_task_id === null);
    let tasksWereModified = false;

    for (const originalTask of originalRecurringTasks) {
      const originalTaskCreatedAtUTC = getUTCStartOfDay(parseISO(originalTask.created_at));

      // Only consider tasks whose original creation date is on or before the current date
      if (isAfter(originalTaskCreatedAtUTC, currentDate)) {
        console.log(`syncRecurringTasks: Skipping "${originalTask.description}" - original creation date is after current date.`);
        continue;
      }

      // Find if there's an instance for the current date (any status)
      const instanceForCurrentDate = tasks.find(t =>
        (t.original_task_id === originalTask.id || t.id === originalTask.id) &&
        isSameDay(getUTCStartOfDay(parseISO(t.created_at)), currentDate)
      );

      if (instanceForCurrentDate) {
        // An instance for today exists.
        // If it's already 'to-do', or if it's 'completed'/'skipped' (meaning user acted on it), do nothing.
        console.log(`syncRecurringTasks: Instance for "${originalTask.description}" on current date exists with status "${instanceForCurrentDate.status}". No action needed.`);
        continue;
      } else {
        // No instance for the current date exists. Create a new 'to-do' instance.
        console.log(`syncRecurringTasks: Creating new 'to-do' instance for "${originalTask.description}" for current date.`);
        const created = await createRecurringTaskInstance(originalTask, currentDate);
        if (created) tasksWereModified = true;
      }
    }

    if (tasksWereModified) {
      console.log('syncRecurringTasks: Tasks were modified. Re-fetching all data to update state.');
      await fetchDataAndSections();
      console.log('syncRecurringTasks: fetchDataAndSections completed after modifying tasks.');
    } else {
      console.log('syncRecurringTasks: No recurring tasks created or updated for this date.');
    }
  }, [userId, tasks, currentDate, createRecurringTaskInstance, fetchDataAndSections]);

  // Effect to fetch initial data and sections
  useEffect(() => {
    if (!authLoading && userId) {
      fetchDataAndSections();
    } else if (!authLoading && !userId) {
      setTasks([]);
      setSections([]);
      setLoading(false);
      console.log('useTasks useEffect: Auth loaded, no user ID, clearing tasks and sections.');
    } else if (authLoading) {
      setTasks([]);
      setSections([]);
      setLoading(true);
      console.log('useTasks useEffect: Auth still loading, clearing tasks and setting loading true.');
    }
  }, [userId, authLoading, fetchDataAndSections]); // fetchDataAndSections is stable due to useCallback

  // Effect to sync recurring tasks whenever tasks or currentDate changes
  useEffect(() => {
    if (!loading && userId) { // Ensure initial loading is complete
      syncRecurringTasks();
    }
  }, [loading, userId, currentDate, syncRecurringTasks]); // syncRecurringTasks is stable due to useCallback

  useEffect(() => {
    if (!userId) return;

    const reminderInterval = setInterval(() => {
      tasks.forEach(task => {
        if (task.remind_at && task.status === 'to-do' && !remindedTaskIdsRef.current.has(task.id)) {
          const reminderTime = parseISO(task.remind_at);
          const fiveMinutesAgo = new Date(new Date().getTime() - 5 * 60 * 1000);
          
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
      // Optimistically add to state immediately for responsiveness
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
      // Revert optimistic update if DB insert fails
      setTasks(prev => prev.filter(task => task.id !== newTask.id));
      return false;
    }
  }, [userId, currentDate]);

  const updateTask = useCallback(async (taskId: string, updates: TaskUpdate) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    // Optimistically update the state
    setTasks(prevTasks => prevTasks.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    ));

    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Task updated successfully!');

      // After a task is updated (especially if completed), re-sync recurring tasks
      // to potentially create the next instance for the *next* day.
      syncRecurringTasks();

    } catch (error: any) {
      console.error('Error updating task:', error);
      showError('Failed to update task.');
      fetchDataAndSections(); // Revert optimistic update by re-fetching
    }
  }, [userId, fetchDataAndSections, syncRecurringTasks]);

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
    console.log('filteredTasks: Raw tasks state at start of memo:', tasks.map(t => ({
      id: t.id,
      description: t.description,
      status: t.status,
      created_at: t.created_at,
      original_task_id: t.original_task_id,
      recurring_type: t.recurring_type,
      parent_task_id: t.parent_task_id
    })));

    let relevantTasks: Task[] = [];
    const processedOriginalIds = new Set<string>(); // To ensure only one recurring task group is added

    // 1. Filter out subtasks first
    const topLevelTasks = tasks.filter(task => task.parent_task_id === null);

    // 2. Handle archived tasks (they are date-agnostic for the archive view)
    if (statusFilter === 'archived') {
      relevantTasks = topLevelTasks.filter(task => task.status === 'archived');
    } else {
      topLevelTasks.forEach(task => {
        const taskCreatedAtUTC = getUTCStartOfDay(parseISO(task.created_at));
        const isTaskCreatedOnCurrentDate = isSameDay(taskCreatedAtUTC, effectiveCurrentDateUTC);
        const originalId = task.original_task_id || task.id;

        if (task.recurring_type !== 'none') {
          if (processedOriginalIds.has(originalId)) {
            return; // Already processed this recurring group
          }

          // Find the instance for the current date
          const instanceForCurrentDate = tasks.find(t =>
            (t.original_task_id === originalId || t.id === originalId) &&
            isSameDay(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC)
          );

          if (instanceForCurrentDate && instanceForCurrentDate.status !== 'archived') {
            relevantTasks.push(instanceForCurrentDate);
          } else {
            // If no instance for current date, or it's archived, look for a carry-over 'to-do' from previous days
            const carryOverTask = tasks.find(t =>
              (t.original_task_id === originalId || t.id === originalId) &&
              isBefore(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) &&
              t.status === 'to-do'
            );
            if (carryOverTask) {
              relevantTasks.push(carryOverTask);
            }
          }
          processedOriginalIds.add(originalId); // Mark this group as processed
        } else {
          // Non-recurring tasks
          if (isTaskCreatedOnCurrentDate && task.status !== 'archived') {
            relevantTasks.push(task);
          } else if (isBefore(taskCreatedAtUTC, effectiveCurrentDateUTC) && task.status === 'to-do') {
            relevantTasks.push(task); // Carry over incomplete non-recurring tasks
          }
        }
      });
    }

    // 3. Apply status filter (if not 'all' and not 'archived' which was handled above)
    if (statusFilter !== 'all' && statusFilter !== 'archived') {
      relevantTasks = relevantTasks.filter(task => task.status === statusFilter);
    }

    // 4. Apply other filters (search, category, priority, section)
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

    // 5. Sort the final tasks
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
    setSearchFilter,
    setStatusFilter,
    setCategoryFilter,
    setPriorityFilter,
    sectionFilter,
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