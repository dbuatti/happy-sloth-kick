import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess, showReminder } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';
import { isSameDay, isPast, startOfDay as fnsStartOfDay, parseISO, format, isAfter, isBefore, addDays, addWeeks, addMonths } from 'date-fns';
import { getCategoryColorProps } from '@/lib/categoryColors'; // Import the new utility

export interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  created_at: string;
  user_id: string;
  category: string; // This is the category ID
  category_color: string; // New: This will store the color key like 'red', 'blue'
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
  category: string; // This is the category ID
  priority?: string;
  due_date?: Date | null;
  notes?: string | null;
  remind_at?: Date | null;
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

interface UseTasksProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}

export const useTasks = ({ currentDate, setCurrentDate }: UseTasksProps) => {
  const HOOK_VERSION = "2024-07-30-10"; // Updated version
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  console.log(`useTasks hook version: ${HOOK_VERSION}`);
  console.log('useTasks: Re-rendering. Current date received (from hook start):', currentDate.toISOString());

  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<'priority' | 'due_date' | 'created_at' | 'order'>('order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [categoriesMap, setCategoriesMap] = useState<Map<string, string>>(new Map()); // Map category ID to color key

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

      // Fetch categories to build a color map
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('task_categories')
        .select('id, color')
        .eq('user_id', userId);
      if (categoriesError) throw categoriesError;
      const newCategoriesMap = new Map<string, string>();
      categoriesData?.forEach(cat => newCategoriesMap.set(cat.id, cat.color));
      setCategoriesMap(newCategoriesMap);
      console.log('useTasks useEffect: Categories fetched and mapped.');

      // Fetch all tasks from DB (without join for now)
      const { data: initialTasksFromDB, error: fetchError } = await supabase
        .from('tasks')
        .select('*') // Select all columns, no join
        .eq('user_id', userId);

      if (fetchError) throw fetchError;
      console.log('fetchTasks: Initial tasks fetched from DB:', initialTasksFromDB);

      // Map fetched data to Task interface, enriching with category_color from the map
      const mappedTasks: Task[] = initialTasksFromDB.map((task: any) => ({
        ...task,
        category_color: newCategoriesMap.get(task.category) || 'gray', // Use map for color
      }));

      setTasks(mappedTasks || []);
      console.log('fetchTasks: Tasks state updated with fetched data.');
      
    } catch (error: any) {
      console.error('Error in fetchDataAndSections:', error);
      showError('An unexpected error occurred while loading data.');
    } finally {
      setLoading(false);
      console.log('fetchTasks: Fetch process completed.');
    }
  }, [userId]);

  const createRecurringTaskInstance = useCallback(async (originalTask: Task, targetDate: Date): Promise<boolean> => {
    console.log(`createRecurringTaskInstance: Attempting to create instance for original task "${originalTask.description}" on ${format(targetDate, 'yyyy-MM-dd')}`);
    if (originalTask.recurring_type === 'none' || !userId) return false;

    const targetDateUTC = getUTCStartOfDay(targetDate);

    // Check if an instance already exists for this targetDate in the current state
    const existingInstance = tasks.find(t =>
      (t.original_task_id === originalTask.id || t.id === originalTask.id) &&
      isSameDay(getUTCStartOfDay(parseISO(t.created_at)), targetDateUTC)
    );

    if (existingInstance) {
      console.log(`createRecurringTaskInstance: Skipping creation: Instance for "${originalTask.description}" on ${format(targetDate, 'yyyy-MM-dd')} already exists in state with status: ${existingInstance.status}.`);
      return false;
    }

    const newInstance: Task = {
      ...originalTask,
      id: uuidv4(),
      created_at: targetDateUTC.toISOString(), // This is the key: new instance gets current date
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
    return true;
  }, [userId, tasks]);

  const syncRecurringTasks = useCallback(async () => {
    if (!userId || loading) {
      console.log('syncRecurringTasks: Skipping sync - no user, or still loading initial data.');
      return;
    }

    console.log(`syncRecurringTasks: Running for date ${currentDate.toISOString()}`);
    const effectiveCurrentDateUTC = getUTCStartOfDay(currentDate);
    let tasksWereModified = false;

    const originalRecurringTasks = tasks.filter(t => t.recurring_type !== 'none' && t.original_task_id === null);

    for (const originalTask of originalRecurringTasks) {
      const originalTaskCreatedAtUTC = getUTCStartOfDay(parseISO(originalTask.created_at));

      // Skip if the original task's creation date is in the future relative to the current date
      if (isAfter(originalTaskCreatedAtUTC, effectiveCurrentDateUTC)) {
        console.log(`syncRecurringTasks: Skipping "${originalTask.description}" - original creation date (${format(originalTaskCreatedAtUTC, 'yyyy-MM-dd')}) is after current date (${format(effectiveCurrentDateUTC, 'yyyy-MM-dd')}).`);
        continue;
      }

      const allInstancesOfThisRecurringTask = tasks.filter(t =>
        t.original_task_id === originalTask.id || t.id === originalTask.id
      );
      console.log(`filteredTasks: For originalId ${originalTask.id} ("${originalTask.description}"), all instances:`, allInstancesOfThisRecurringTask.map(t => ({id: t.id, created_at: t.created_at, status: t.status})));

      // Check if an instance for the *current effective date* already exists
      const instanceForEffectiveCurrentDate = allInstancesOfThisRecurringTask.find(t =>
        isSameDay(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC)
      );

      if (instanceForEffectiveCurrentDate) {
        console.log(`syncRecurringTasks: Instance for "${originalTask.description}" on ${format(effectiveCurrentDateUTC, 'yyyy-MM-dd')} already exists (ID: ${instanceForEffectiveCurrentDate.id}, Status: ${instanceForEffectiveCurrentDate.status}). No new instance needed.`);
        continue; // An instance for today already exists, no need to create a new one
      }

      // If no instance for the current effective date exists, determine if one should be created.
      let shouldCreate = false;

      if (isSameDay(originalTaskCreatedAtUTC, effectiveCurrentDateUTC)) {
        // If the original task was created today, and no instance exists for today, create it.
        // This handles the very first appearance of a recurring task.
        shouldCreate = true;
        console.log(`syncRecurringTasks: Original task "${originalTask.description}" created today. Creating first instance.`);
      } else {
        // For dates after the original creation date, check the status of the *latest previous instance*.
        // IMPORTANT: Do NOT filter by status here. We need the actual latest instance.
        const latestPreviousInstance = allInstancesOfThisRecurringTask
          .filter(t => isBefore(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC))
          .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())[0];

        if (latestPreviousInstance) {
          console.log(`syncRecurringTasks: Latest previous instance for "${originalTask.description}" is ID: ${latestPreviousInstance.id}, Created At: ${format(parseISO(latestPreviousInstance.created_at), 'yyyy-MM-dd')}, Status: ${latestPreviousInstance.status}`);
          // If the latest previous instance was completed or skipped, create a new 'to-do' instance for today.
          if (latestPreviousInstance.status === 'completed' || latestPreviousInstance.status === 'skipped') {
            shouldCreate = true;
            console.log(`syncRecurringTasks: Latest previous instance was completed/skipped. Creating new 'to-do' instance for today.`);
          } else if (latestPreviousInstance.status === 'to-do') {
            // If the latest previous instance was 'to-do', it should carry over. No new instance needed.
            console.log(`syncRecurringTasks: Latest previous instance was 'to-do'. It should carry over. No new instance needed.`);
          }
        } else {
          // This case means originalTaskCreatedAtUTC is before effectiveCurrentDateUTC, but no instances exist before effectiveCurrentDateUTC.
          // This could happen if the original task was created in the past, but no instances were ever generated/fetched for the days between then and now.
          // In this scenario, we should create an instance for the current date if it's a recurring task.
          shouldCreate = true; // Assume we should create if there's a gap and it's a recurring task
          console.warn(`syncRecurringTasks: No previous instance found for "${originalTask.description}" before ${format(effectiveCurrentDateUTC, 'yyyy-MM-dd')}. Creating an instance for today.`);
        }
      }

      if (shouldCreate) {
        const created = await createRecurringTaskInstance(originalTask, effectiveCurrentDateUTC);
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
  }, [userId, tasks, currentDate, createRecurringTaskInstance, fetchDataAndSections, loading]);

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
  }, [userId, authLoading, fetchDataAndSections]);

  // Effect to sync recurring tasks whenever tasks or currentDate changes
  useEffect(() => {
    if (!loading && userId) {
      syncRecurringTasks();
    }
  }, [loading, userId, currentDate, syncRecurringTasks]);

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
      const categoryColor = categoriesMap.get(newTaskData.category) || 'gray';

      // Determine the order for the new task
      // Filter for top-level tasks in the target section
      const targetSectionTasks = tasks.filter(t => t.parent_task_id === null && t.section_id === (newTaskData.section_id || null));
      const newOrder = targetSectionTasks.length; // Place at the end of the section

      newTask = {
        id: uuidv4(),
        user_id: userId,
        created_at: currentDate.toISOString(),
        status: newTaskData.status || 'to-do',
        recurring_type: newTaskData.recurring_type || 'none',
        category: newTaskData.category, // This is the category ID
        category_color: categoryColor, // Store the color key
        priority: newTaskData.priority || 'medium',
        due_date: newTaskData.due_date ? newTaskData.due_date.toISOString() : null,
        notes: newTaskData.notes || null,
        remind_at: newTaskData.remind_at ? newTaskData.remind_at.toISOString() : null,
        section_id: newTaskData.section_id || null,
        order: newOrder, // Set the order here
        original_task_id: null,
        parent_task_id: newTaskData.parent_task_id || null,
        description: newTaskData.description,
      };
      // Optimistically add to state immediately for responsiveness
      setTasks(prev => [...prev, newTask]);

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          id: newTask.id,
          user_id: newTask.user_id,
          created_at: newTask.created_at,
          status: newTask.status,
          recurring_type: newTask.recurring_type,
          category: newTask.category, // Store category ID
          priority: newTask.priority,
          due_date: newTask.due_date,
          notes: newTask.notes,
          remind_at: newTask.remind_at,
          section_id: newTask.section_id,
          order: newTask.order, // Ensure order is sent to DB
          original_task_id: newTask.original_task_id,
          parent_task_id: newTask.parent_task_id,
          description: newTask.description,
        })
        .select() // Select all columns to get the full task back
        .single();

      if (error) throw error;
      
      // Update the optimistically added task with the actual fetched data (including category_color from map)
      setTasks(prev => prev.map(t => t.id === data.id ? { ...data, category_color: categoriesMap.get(data.category) || 'gray' } : t));

      showSuccess('Task added successfully!');
      return true;
    } catch (error: any) {
      console.error('Error adding task:', error);
      showError('Failed to add task.');
      // Revert optimistic update if DB insert fails
      setTasks(prev => prev.filter(task => task.id !== newTask.id));
      return false;
    }
  }, [userId, currentDate, categoriesMap, tasks]); // Add 'tasks' to dependency array for calculating newOrder

  const updateTask = useCallback(async (taskId: string, updates: TaskUpdate) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }

    let updatedCategoryColor: string | undefined;
    if (updates.category) {
      updatedCategoryColor = categoriesMap.get(updates.category) || 'gray';
    }

    // Optimistically update the state
    setTasks(prevTasks => prevTasks.map(task =>
      task.id === taskId ? { ...task, ...updates, ...(updatedCategoryColor && { category_color: updatedCategoryColor }) } : task
    ));

    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Task updated successfully!');

    } catch (error: any) {
      console.error('Error updating task:', error);
      showError('Failed to update task.');
      fetchDataAndSections(); // Revert optimistic update by re-fetching
    }
  }, [userId, fetchDataAndSections, categoriesMap]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    let taskToDelete: Task | undefined;
    try {
      taskToDelete = tasks.find(t => t.id === taskId);
      if (!taskToDelete) return;

      // Determine all task IDs to delete (including subtasks and recurring instances)
      let idsToDelete = [taskId];
      const subtaskIds = tasks.filter(t => t.parent_task_id === taskId).map(t => t.id);
      idsToDelete = [...idsToDelete, ...subtaskIds];

      // If it's an original recurring task, delete all its instances
      if (taskToDelete.recurring_type !== 'none' && taskToDelete.original_task_id === null) {
        const recurringInstanceIds = tasks.filter(t => t.original_task_id === taskId).map(t => t.id);
        idsToDelete = [...idsToDelete, ...recurringInstanceIds];
      }

      // Optimistically remove from state
      setTasks(prev => prev.filter(task => !idsToDelete.includes(task.id)));

      // Delete from database
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', idsToDelete)
        .eq('user_id', userId); // Ensure user ownership

      if (error) throw error;
      showSuccess('Task(s) deleted successfully!');
    }
    catch (error: any) {
      console.error('Error deleting task:', error);
      showError('Failed to delete task.');
      // Revert optimistic update if DB delete fails
      if (taskToDelete) {
        fetchDataAndSections(); // Re-fetch all data to restore state
      }
    }
  }, [userId, tasks, fetchDataAndSections]);

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

    let updatedCategoryColor: string | undefined;
    if (updates.category) {
      updatedCategoryColor = categoriesMap.get(updates.category) || 'gray';
    }

    // Optimistically update the state
    setTasks(prev => prev.map(task => 
      ids.includes(task.id) ? { ...task, ...updates, ...(updatedCategoryColor && { category_color: updatedCategoryColor }) } : task
    ));

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .in('id', ids)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      showSuccess(`${ids.length} tasks updated successfully!`);
      clearSelectedTasks();
      
      // After successful update, re-fetch all data to ensure UI consistency,
      // especially for status changes like archiving.
      await fetchDataAndSections(); 
    } catch (error: any) {
      console.error('Error bulk updating tasks:', error);
      showError('Failed to update tasks in bulk.');
      fetchDataAndSections(); // Revert optimistic update by re-fetching on error
    }
  }, [userId, selectedTaskIds, clearSelectedTasks, fetchDataAndSections, categoriesMap]);

  const createSection = useCallback(async (name: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      // Determine the order for the new section
      const newOrder = sections.length;

      const { data, error } = await supabase
        .from('task_sections')
        .insert({ name, user_id: userId, order: newOrder })
        .select()
        .single();

      if (error) throw error;
      setSections(prev => [...prev, data]);
      showSuccess('Section created successfully!');
    } catch (error: any) {
      console.error('Error creating section:', error);
      showError('Failed to create section.');
    }
  }, [userId, sections.length]);

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
      // First, update tasks to remove their section_id
      await supabase
        .from('tasks')
        .update({ section_id: null })
        .eq('section_id', sectionId)
        .eq('user_id', userId);

      // Then, delete the section
      const { error } = await supabase
        .from('task_sections')
        .delete()
        .eq('id', sectionId)
        .eq('user_id', userId);

      if (error) throw error;
      
      // Optimistically update UI
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
    // Get the current tasks for this section from the latest state
    const tasksInSection = tasks.filter(t => t.parent_task_id === null && t.section_id === sectionId);
    const reordered = [...tasksInSection];
    const [movedTask] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, movedTask);

    // Prepare updates for DB and optimistic UI
    const updatesForDbAndUi = reordered.map((task, index) => ({ ...task, order: index }));

    // Optimistically update the UI
    setTasks(prevTasks => {
      const otherTasks = prevTasks.filter(t => t.parent_task_id !== null || t.section_id !== sectionId);
      return [...otherTasks, ...updatesForDbAndUi];
    });

    // Now, update the database
    try {
      const dbPayload = updatesForDbAndUi.map(task => ({ id: task.id, order: task.order }));
      const { error } = await supabase.from('tasks').upsert(dbPayload, { onConflict: 'id' });
      if (error) throw error;
      showSuccess('Tasks reordered successfully!');
    } catch (error: any) {
      console.error('Error reordering tasks in same section:', error);
      showError('Failed to reorder tasks.');
      fetchDataAndSections(); // Revert optimistic update by re-fetching on error
    }
  }, [tasks, fetchDataAndSections]); // Depend on 'tasks' to get the latest state

  const moveTaskToNewSection = useCallback(async (taskId: string, sourceSectionId: string | null, destinationSectionId: string | null, destinationIndex: number) => {
    // Get the current tasks from the latest state
    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove) return;

    // Filter out the task being moved from its original section
    const tasksWithoutMoved = tasks.filter(t => t.id !== taskId);

    // Separate tasks into source, destination, and other
    const sourceTasks = tasksWithoutMoved.filter(t => t.parent_task_id === null && t.section_id === sourceSectionId);
    const destinationTasks = tasksWithoutMoved.filter(t => t.parent_task_id === null && t.section_id === destinationSectionId);
    const otherTasks = tasks.filter(t => t.parent_task_id !== null || (t.section_id !== sourceSectionId && t.section_id !== destinationSectionId));

    // Update order in source section
    const updatedSourceTasks = sourceTasks.map((task, index) => ({ ...task, order: index }));

    // Insert into destination section and update order
    const newDestinationTasks = [...destinationTasks];
    const updatedTaskToMove = { ...taskToMove, section_id: destinationSectionId, order: destinationIndex };
    newDestinationTasks.splice(destinationIndex, 0, updatedTaskToMove);
    const updatedDestinationTasks = newDestinationTasks.map((task, index) => ({ ...task, order: index }));

    // Prepare combined updates for DB and optimistic UI
    const updatesForDbAndUi = [...updatedSourceTasks, ...updatedDestinationTasks];

    // Optimistically update the UI
    setTasks(prevTasks => {
      const updatedTaskIds = new Set(updatesForDbAndUi.map(t => t.id));
      const remainingTasks = prevTasks.filter(t => !updatedTaskIds.has(t.id));
      return [...remainingTasks, ...updatesForDbAndUi];
    });

    // Now, update the database
    try {
      const dbPayload = updatesForDbAndUi.map(task => ({
        id: task.id,
        section_id: task.section_id, // Ensure section_id is updated for the moved task
        order: task.order,
      }));
      const { error } = await supabase.from('tasks').upsert(dbPayload, { onConflict: 'id' });
      if (error) throw error;
      showSuccess('Task moved successfully!');
    } catch (error: any) {
      console.error('Error moving task to new section:', error);
      showError('Failed to move task.');
      fetchDataAndSections(); // Revert optimistic update by re-fetching on error
    }
  }, [tasks, fetchDataAndSections]); // Depend on 'tasks' to get the latest state

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
      parent_task_id: t.parent_task_id,
      category: t.category, // Include category for debugging
      category_color: t.category_color // Include category_color for debugging
    })));

    let relevantTasks: Task[] = [];
    const processedOriginalIds = new Set<string>();

    const topLevelTasks = tasks.filter(task => task.parent_task_id === null);

    if (statusFilter === 'archived') {
      relevantTasks = topLevelTasks.filter(task => task.status === 'archived');
    } else {
      topLevelTasks.forEach(task => {
        const taskCreatedAtUTC = getUTCStartOfDay(parseISO(task.created_at));
        const originalId = task.original_task_id || task.id;

        if (task.recurring_type !== 'none') {
          if (processedOriginalIds.has(originalId)) {
            console.log(`filteredTasks: Skipping already processed originalId: ${originalId}`);
            return;
          }

          const allInstancesOfThisRecurringTask = tasks.filter(t =>
            t.original_task_id === originalId || t.id === originalId
          );
          console.log(`filteredTasks: For originalId ${originalId} ("${task.description}"), all instances:`, allInstancesOfThisRecurringTask.map(t => ({id: t.id, created_at: t.created_at, status: t.status})));

          let taskToDisplay: Task | null = null;

          // Prioritize:
          // 1. A 'to-do' instance for the current date
          // 2. A 'completed' or 'skipped' instance for the current date
          // 3. A 'to-do' instance carried over from a previous day

          const toDoForCurrentDay = allInstancesOfThisRecurringTask.find(t =>
            isSameDay(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status === 'to-do'
          );
          
          if (toDoForCurrentDay) {
            taskToDisplay = toDoForCurrentDay;
            console.log(`filteredTasks: For original ${originalId}, found TO-DO instance for current date (${format(effectiveCurrentDateUTC, 'yyyy-MM-dd')}). Pushing this.`);
          } else {
            const completedOrSkippedForCurrentDay = allInstancesOfThisRecurringTask.find(t =>
              isSameDay(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && (t.status === 'completed' || t.status === 'skipped')
            );
            if (completedOrSkippedForCurrentDay) {
              taskToDisplay = completedOrSkippedForCurrentDay;
              console.log(`filteredTasks: For original ${originalId}, found COMPLETED/SKIPPED instance for current date (${format(effectiveCurrentDateUTC, 'yyyy-MM-dd')}). Pushing this.`);
            } else {
              const carryOverTask = allInstancesOfThisRecurringTask
                .filter(t => isBefore(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status === 'to-do')
                .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())[0];

              if (carryOverTask) {
                taskToDisplay = carryOverTask;
                console.log(`filteredTasks: For original ${originalId}, no instance for current date. Found carry-over from ${format(parseISO(carryOverTask.created_at), 'yyyy-MM-dd')} with status: ${carryOverTask.status}. Pushing this.`);
              } else {
                console.log(`filteredTasks: For original ${originalId}, no relevant instance found for current date or carry-over.`);
              }
            }
          }
          
          if (taskToDisplay && taskToDisplay.status !== 'archived') {
            console.log(`filteredTasks: ACTUALLY PUSHING: ID: ${taskToDisplay.id}, Desc: "${taskToDisplay.description}", Status: "${taskToDisplay.status}", Created At: "${taskToDisplay.created_at}"`);
            relevantTasks.push(taskToDisplay);
          } else if (taskToDisplay && taskToDisplay.status === 'archived') {
            console.log(`filteredTasks: NOT PUSHING: ID: ${taskToDisplay.id}, Desc: "${taskToDisplay.description}", Status: "${taskToDisplay.status}" (archived)`);
          }
          processedOriginalIds.add(originalId);
        } else {
          // Non-recurring tasks
          const isTaskCreatedOnCurrentDate = isSameDay(taskCreatedAtUTC, effectiveCurrentDateUTC);
          if (isTaskCreatedOnCurrentDate && task.status !== 'archived') {
            console.log(`filteredTasks: Pushing non-recurring task created on current date: ${task.id}, ${task.description}`);
            relevantTasks.push(task);
          } else if (isBefore(taskCreatedAtUTC, effectiveCurrentDateUTC) && task.status === 'to-do') {
            console.log(`filteredTasks: Pushing non-recurring carry-over task: ${task.id}, ${task.description}`);
            relevantTasks.push(task); // Carry over incomplete non-recurring tasks
          } else {
            console.log(`filteredTasks: Skipping non-recurring task: ${task.id}, ${task.description} (not created today, not to-do carry-over, or archived)`);
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
      parent_task_id: t.parent_task_id,
      category: t.category, // Include category for debugging
      category_color: t.category_color // Include category_color for debugging
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
    fetchDataAndSections, // Expose for manual refresh if needed
  };
};