import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess, showReminder } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';
import { isSameDay, isPast, startOfDay as fnsStartOfDay, parseISO, format, isAfter } from 'date-fns';

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
  const { user } = useAuth();
  const userId = user?.id;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  // Initialize currentDate to UTC midnight using the helper
  const [currentDate, setCurrentDate] = useState(() => getUTCStartOfDay(new Date()));
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
  const isFetchingRef = useRef<string | null>(null); // Stores the key of the fetch in progress

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
    const currentFetchKey = `${userId}-${currentDate.toISOString()}`;
    if (isFetchingRef.current === currentFetchKey) { // Check if this specific fetch is already in progress
      console.log(`fetchDataAndSections: Already fetching for ${currentFetchKey}, skipping.`);
      return;
    }
    isFetchingRef.current = currentFetchKey; // Mark this specific fetch as in progress
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

      // Fetch all tasks
      console.log('fetchTasks: Starting fetch for user:', userId, 'on date:', currentDate.toISOString());
      const { data: allTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;
      console.log('fetchTasks: All tasks fetched:', allTasks);

      let currentTasks = allTasks || []; // Start with all tasks fetched initially

      const dailyRecurringTemplates = currentTasks.filter(
        task => task.recurring_type === 'daily' && task.original_task_id === null
      );
      console.log('fetchTasks: Daily recurring templates found:', dailyRecurringTemplates);

      const newRecurringInstances: Task[] = [];

      for (const template of dailyRecurringTemplates) {
        const startOfCurrentUTC = currentDate.toISOString();
        const endOfCurrentUTC = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
        console.log(`fetchTasks: Checking for existing instance of template "${template.description}" (ID: ${template.id}) for today (UTC: ${startOfCurrentUTC} - ${endOfCurrentUTC})`);

        const { data: existingInstances, error: checkError } = await supabase
          .from('tasks')
          .select('id')
          .eq('original_task_id', template.id)
          .eq('user_id', userId)
          .gte('created_at', startOfCurrentUTC)
          .lt('created_at', endOfCurrentUTC)
          .in('status', ['to-do', 'skipped']);

        if (checkError) throw checkError;
        console.log(`fetchTasks: Found ${existingInstances?.length || 0} existing active instances for template "${template.description}" today.`);

        if (!existingInstances || existingInstances.length === 0) {
          const newInstance: Task = {
            ...template,
            id: uuidv4(),
            created_at: currentDate.toISOString(),
            status: 'to-do',
            recurring_type: 'none',
            original_task_id: template.id,
            due_date: null,
            remind_at: null,
            parent_task_id: null,
          };
          newRecurringInstances.push(newInstance);
          console.log('fetchTasks: Preparing to insert new instance:', newInstance.description);
        }
      }

      if (newRecurringInstances.length > 0) {
        console.log('fetchTasks: Inserting new recurring instances:', newRecurringInstances.map(t => t.description));
        const { data: insertedData, error: insertError } = await supabase
          .from('tasks')
          .insert(newRecurringInstances)
          .select();

        if (insertError) throw insertError;
        console.log('fetchTasks: Inserted data:', insertedData);
        
        // Combine existing tasks with newly inserted ones directly
        currentTasks = [...currentTasks, ...(insertedData as Task[])];
        console.log('fetchTasks: Tasks state updated with new instances directly.');
      } else {
        console.log('fetchTasks: No new instances to insert.');
      }
      
      setTasks(currentTasks); // Set the final combined list of tasks
      console.log('fetchTasks: Final tasks set after processing recurring logic.');
      
    } catch (error: any) {
      console.error('Error in fetchDataAndSections:', error);
      showError('An unexpected error occurred while loading data.');
    } finally {
      setLoading(false);
      if (isFetchingRef.current === currentFetchKey) { // Only reset if it's *this* fetch that's completing
        isFetchingRef.current = null;
      }
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
      isFetchingRef.current = null; // Ensure reset if user logs out
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
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
          
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
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...newTaskData, user_id: userId, created_at: currentDate.toISOString() }) // Use consistent UTC currentDate
        .select()
        .single();

      if (error) throw error;
      setTasks(prev => [...prev, data]);
      showSuccess('Task added successfully!');
      return true;
    } catch (error: any) {
      console.error('Error adding task:', error);
      showError('Failed to add task.');
      return false;
    }
  }, [userId, currentDate]);

  const updateTask = useCallback(async (taskId: string, updates: TaskUpdate) => {
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
        .select()
        .single();

      if (error) throw error;
      setTasks(prev => prev.map(task => (task.id === taskId ? data : task)));
      showSuccess('Task updated successfully!');
    } catch (error: any) {
      console.error('Error updating task:', error);
      showError('Failed to update task.');
    }
  }, [userId]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
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
      setTasks(prev => prev.filter(task => task.id !== taskId && task.parent_task_id !== taskId));
      showSuccess('Task deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting task:', error);
      showError('Failed to delete task.');
    }
  }, [userId]);

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
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .in('id', ids)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      setTasks(prev => prev.map(task => {
        const updated = data.find(d => d.id === task.id);
        return updated ? updated : task;
      }));
      showSuccess(`${ids.length} tasks updated successfully!`);
      clearSelectedTasks();
    } catch (error: any) {
      console.error('Error bulk updating tasks:', error);
      showError('Failed to update tasks in bulk.');
    }
  }, [userId, selectedTaskIds, clearSelectedTasks]);

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
    console.log('filteredTasks: Starting filter process for currentDate:', currentDate.toISOString(), 'statusFilter:', statusFilter);
    let workingTasks = [...tasks];
    const effectiveCurrentDateUTC = getUTCStartOfDay(currentDate); // Ensure this is UTC midnight
    console.log('filteredTasks: Initial tasks count:', workingTasks.length);

    // 1. Filter out subtasks (they are handled within parent tasks)
    workingTasks = workingTasks.filter(task => task.parent_task_id === null);
    console.log('filteredTasks: After subtask filter, count:', workingTasks.length);

    // 2. Apply main daily view logic (if not in 'archived' filter)
    if (statusFilter !== 'archived') {
      workingTasks = workingTasks.filter(task => {
        const taskCreatedAt = parseISO(task.created_at);
        const taskCreatedAtUTC = getUTCStartOfDay(taskCreatedAt); // Convert task's created_at to UTC midnight for comparison

        const isTaskCreatedOnCurrentDate = isSameDay(taskCreatedAtUTC, effectiveCurrentDateUTC);
        const isRecurringTemplate = task.recurring_type === 'daily' && task.original_task_id === null;
        const isRecurringInstance = task.original_task_id !== null;
        const isActiveStatus = task.status === 'to-do' || task.status === 'skipped';
        const isCompletedStatus = task.status === 'completed';
        const isArchivedStatus = task.status === 'archived';

        console.log(`  Task "${task.description}" (ID: ${task.id}):`);
        console.log(`    created_at: ${task.created_at} (UTC: ${taskCreatedAtUTC.toISOString()})`);
        console.log(`    currentDate (UTC): ${effectiveCurrentDateUTC.toISOString()}`);
        console.log(`    isCreatedOnCurrentDate: ${isTaskCreatedOnCurrentDate}`);
        console.log(`    status: ${task.status}, recurring_type: ${task.recurring_type}, original_task_id: ${task.original_task_id}`);
        console.log(`    isRecurringTemplate: ${isRecurringTemplate}, isRecurringInstance: ${isRecurringInstance}`);
        console.log(`    isActiveStatus: ${isActiveStatus}, isCompletedStatus: ${isCompletedStatus}, isArchivedStatus: ${isArchivedStatus}`);

        // Rule 1: Exclude recurring templates from daily view
        if (isRecurringTemplate) {
          console.log(`    -> Excluded (Rule 1: Is a Recurring Template)`);
          return false;
        }

        // Rule 2: Exclude archived tasks from daily view (unless statusFilter is 'archived')
        if (isArchivedStatus) {
          console.log(`    -> Excluded (Rule 2: Is Archived)`);
          return false;
        }

        // Rule 3: Handle recurring instances (tasks generated from a template)
        // These should ONLY show if they were generated for the current day.
        if (isRecurringInstance) {
          const shouldInclude = isTaskCreatedOnCurrentDate;
          console.log(`    -> Rule 3: Is Recurring Instance. Included if created on current date: ${shouldInclude}`);
          return shouldInclude;
        }

        // Rule 4: Handle general tasks (non-recurring, not instances)
        // These should always be visible if active (to-do/skipped), regardless of creation date.
        if (isActiveStatus) {
          console.log(`    -> Rule 4: Is Active General Task. Included.`);
          return true;
        }

        // Rule 5: Handle completed general tasks (non-recurring, not instances)
        // These should ONLY show if they were completed on the current day.
        // We rely on 'created_at' for this, assuming completion happens on the same day or
        // we only want to show completed tasks on the day they were created/generated.
        if (isCompletedStatus) {
          const shouldInclude = isTaskCreatedOnCurrentDate;
          console.log(`    -> Rule 5: Is Completed General Task. Included if created on current date: ${shouldInclude}`);
          return shouldInclude;
        }
        
        console.log(`    -> Excluded (No specific rule matched for daily view)`);
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

    console.log('filteredTasks: Final tasks count:', workingTasks.length);
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