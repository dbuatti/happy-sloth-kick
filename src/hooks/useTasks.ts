import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess, showReminder } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';
import { isSameDay, isPast, startOfDay as fnsStartOfDay, parseISO, format, isAfter, isBefore, addDays, addWeeks, addMonths } from 'date-fns';
import { getCategoryColorProps } from '@/lib/categoryColors';
import { arrayMove } from '@dnd-kit/sortable'; // Import arrayMove

export interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  created_at: string;
  user_id: string;
  category: string;
  category_color: string;
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
  include_in_focus_mode: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>;

interface NewTaskData {
  description: string;
  status?: 'to-do' | 'completed' | 'skipped' | 'archived';
  recurring_type?: 'none' | 'daily' | 'weekly' | 'monthly';
  category: string;
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

const getUTCStartOfDay = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

interface UseTasksProps {
  currentDate?: Date;
  setCurrentDate?: React.Dispatch<React.SetStateAction<Date>>;
  viewMode?: 'daily' | 'archive' | 'focus';
}

export const useTasks = ({ currentDate, setCurrentDate, viewMode = 'daily' }: UseTasksProps = {}) => {
  const HOOK_VERSION = "2024-07-30-15";
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  console.log(`useTasks hook version: ${HOOK_VERSION}`);
  console.log('useTasks: Re-rendering. Current viewMode:', viewMode, 'Current date received:', currentDate?.toISOString());

  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<'priority' | 'due_date' | 'created_at' | 'order'>('order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [categoriesMap, setCategoriesMap] = useState<Map<string, string>>(new Map());

  const [searchFilter, setSearchFilter] = useState(() => getInitialFilter('search', ''));
  const [statusFilter, setStatusFilter] = useState(() => getInitialFilter('status', 'all'));
  const [categoryFilter, setCategoryFilter] = useState(() => getInitialFilter('category', 'all'));
  const [priorityFilter, setPriorityFilter] = useState(() => getInitialFilter('priority', 'all'));
  const [sectionFilter, setSectionFilter] = useState(() => getInitialFilter('section', 'all'));

  const remindedTaskIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (viewMode === 'daily') {
      localStorage.setItem('task_filter_search', searchFilter);
      localStorage.setItem('task_filter_status', statusFilter);
      localStorage.setItem('task_filter_category', categoryFilter);
      localStorage.setItem('task_filter_priority', priorityFilter);
      localStorage.setItem('task_filter_section', sectionFilter);
    }
  }, [searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter, viewMode]);

  useEffect(() => {
    if (viewMode === 'daily') {
      setSelectedTaskIds([]);
      console.log('Cleared selectedTaskIds due to currentDate change.');
    }
  }, [currentDate, viewMode]);

  const fetchDataAndSections = useCallback(async () => {
    console.trace('fetchDataAndSections called');
    setLoading(true);

    try {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('task_sections')
        .select('*, include_in_focus_mode')
        .eq('user_id', userId)
        .order('order', { ascending: true })
        .order('name', { ascending: true });
      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);
      console.log('useTasks useEffect: Sections fetched.');

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('task_categories')
        .select('id, name, color, user_id, created_at')
        .eq('user_id', userId);
      if (categoriesError) throw categoriesError;
      
      let fetchedCategories: Category[] = categoriesData || [];
      let generalCategory: Category | undefined = fetchedCategories.find(cat => cat.name.toLowerCase() === 'general');

      if (!generalCategory) {
        const { data: newGeneralCat, error: insertCatError } = await supabase
          .from('task_categories')
          .insert({ name: 'General', color: 'gray', user_id: userId })
          .select('id, name, color, user_id, created_at')
          .single();
        if (insertCatError) throw insertCatError;
        fetchedCategories = [...fetchedCategories, newGeneralCat];
        generalCategory = newGeneralCat;
        console.log('Created default "General" category:', newGeneralCat);
      }
      
      setAllCategories(fetchedCategories);
      const newCategoriesMap = new Map<string, string>();
      fetchedCategories.forEach(cat => newCategoriesMap.set(cat.id, cat.color));
      setCategoriesMap(newCategoriesMap);
      console.log('useTasks: categoriesMap after population:', Array.from(newCategoriesMap.entries()));

      const { data: initialTasksFromDB, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;
      console.log('fetchTasks: Initial tasks fetched from DB:', initialTasksFromDB);

      const mappedTasks: Task[] = initialTasksFromDB.map((task: any) => ({
        ...task,
        category_color: newCategoriesMap.get(task.category) || 'gray',
      }));

      // --- NEW LOGIC: Normalize task orders on fetch ---
      const tasksToNormalize: Task[] = [];
      const tasksById = new Map<string, Task>();
      mappedTasks.forEach(task => {
        tasksById.set(task.id, task);
        if (task.parent_task_id === null) { // Only normalize top-level tasks
          tasksToNormalize.push(task);
        }
      });

      const groupedBySection: { [key: string]: Task[] } = { 'no-section': [] };
      sectionsData.forEach(sec => groupedBySection[sec.id] = []);

      tasksToNormalize.forEach(task => {
        const sectionKey = task.section_id || 'no-section';
        if (groupedBySection[sectionKey]) {
          groupedBySection[sectionKey].push(task);
        } else {
          // Should not happen if sectionsData is comprehensive, but as a fallback
          groupedBySection['no-section'].push(task);
        }
      });

      const updatesForDb: any[] = [];
      
      for (const sectionKey in groupedBySection) {
        const sectionTasks = groupedBySection[sectionKey];
        // Sort by existing order, then by created_at as a tie-breaker for initial consistency
        sectionTasks.sort((a, b) => {
          const orderA = a.order ?? Infinity;
          const orderB = b.order ?? Infinity;
          if (orderA !== orderB) return orderA - orderB;
          return parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime();
        });

        sectionTasks.forEach((task, index) => {
          if (task.order !== index) { // Only update if order needs correction
            // Create the payload for the database upsert
            const dbUpdatePayload = {
              id: task.id,
              description: task.description, // Include all non-nullable fields
              status: task.status,
              recurring_type: task.recurring_type,
              created_at: task.created_at,
              category: task.category,
              priority: task.priority,
              due_date: task.due_date,
              notes: task.notes,
              remind_at: task.remind_at,
              section_id: task.section_id,
              parent_task_id: task.parent_task_id,
              original_task_id: task.original_task_id, // Include original_task_id for DB
              order: index, // The field we are actually updating
              user_id: userId, // Include user_id for RLS
            };
            updatesForDb.push(dbUpdatePayload);

            // Create the object for local state update (must conform to Task interface)
            const localTaskStateUpdate: Task = {
              ...task, // Start with existing task to retain all properties
              order: index, // Apply the new order
            };
            tasksById.set(task.id, localTaskStateUpdate); // Update the task in the map with new order
          }
        });
      }

      // Reconstruct the full tasks array with updated orders
      const finalTasksState = mappedTasks.map(task => tasksById.get(task.id) || task);
      setTasks(finalTasksState);
      console.log('useTasks: Mapped tasks with normalized orders:', finalTasksState.map(t => ({ id: t.id, description: t.description, order: t.order })));

      // Send updates to DB if any orders were changed
      if (updatesForDb.length > 0) {
        console.log('useTasks: Sending order normalization updates to DB:', updatesForDb.map(u => ({ id: u.id, order: u.order })));
        const { error: upsertError } = await supabase
          .from('tasks')
          .upsert(updatesForDb, { onConflict: 'id' });
        if (upsertError) {
          console.error('useTasks: Error normalizing task orders in DB:', upsertError);
          showError('Failed to synchronize task orders.');
        } else {
          console.log('useTasks: Task orders normalized in DB.');
        }
      }
      // --- END NEW LOGIC ---
      
    } catch (error: any) {
      console.error('Error in fetchDataAndSections:', error);
      showError('An unexpected error occurred while loading data.');
    } finally {
      setLoading(false);
      console.log('fetchTasks: Fetch process completed.');
    }
  }, [userId, viewMode]);

  const createRecurringTaskInstance = useCallback(async (templateTask: Task, targetDate: Date, rootOriginalTaskId: string): Promise<Task | null> => {
    console.log(`createRecurringTaskInstance: Attempting to create instance for original task "${templateTask.description}" on ${format(targetDate, 'yyyy-MM-dd')}`);
    if (templateTask.recurring_type === 'none' || !userId) return null;

    const targetDateUTC = getUTCStartOfDay(targetDate);

    // Check if an instance for this original task (root) already exists for the target date
    // This check is crucial to prevent duplicates based on the root original_task_id and created_at date
    const existingInstance = tasks.find(t =>
      (t.original_task_id === rootOriginalTaskId || t.id === rootOriginalTaskId) && // Check against the root original_task_id
      isSameDay(getUTCStartOfDay(parseISO(t.created_at)), targetDateUTC) &&
      t.status !== 'archived'
    );

    if (existingInstance) {
      console.log(`createRecurringTaskInstance: Skipping creation: Instance for root "${rootOriginalTaskId}" on ${format(targetDate, 'yyyy-MM-dd')} already exists in state with status: ${existingInstance.status}.`);
      return null;
    }

    const newInstanceDataForDb = {
      id: uuidv4(),
      user_id: userId, // Use current userId
      description: templateTask.description, // Copy from templateTask
      status: 'to-do', // New instances are always 'to-do'
      recurring_type: templateTask.recurring_type, // Copy from templateTask
      created_at: targetDateUTC.toISOString(),
      category: templateTask.category, // Copy from templateTask
      priority: templateTask.priority, // Copy from templateTask
      due_date: templateTask.due_date, // Copy from templateTask
      notes: templateTask.notes, // Copy from templateTask
      remind_at: templateTask.remind_at, // Copy from templateTask
      section_id: templateTask.section_id, // Copy from templateTask
      order: templateTask.order, // Copy from templateTask
      original_task_id: rootOriginalTaskId, // This points to the root recurring task
      parent_task_id: null, // Recurring instances are top-level, not subtasks
    };

    console.log('createRecurringTaskInstance: New instance data prepared for DB:', newInstanceDataForDb);

    const { data, error: insertError } = await supabase
      .from('tasks')
      .insert(newInstanceDataForDb)
      .select()
      .single();

    if (insertError) {
      console.error('createRecurringTaskInstance: Error creating recurring task instance:', insertError);
      showError('Failed to create the next instance of the recurring task.');
      return null;
    }
    // Ensure category_color is added back for local state consistency after DB insert
    return { ...data, category_color: categoriesMap.get(data.category) || 'gray' };
  }, [userId, tasks, categoriesMap]); // Added tasks and categoriesMap to deps

  const syncRecurringTasks = useCallback(async () => {
    if (viewMode !== 'daily' || !userId || loading || !currentDate) {
      console.log('syncRecurringTasks: Skipping sync - not daily view, no user, or still loading initial data.');
      return;
    }

    console.log(`syncRecurringTasks: Running for date ${currentDate.toISOString()}`);
    const effectiveCurrentDateUTC = getUTCStartOfDay(currentDate);
    let newTasksAdded: Task[] = [];

    const originalRecurringTasks = tasks.filter(t => t.recurring_type !== 'none' && t.original_task_id === null);

    for (const originalTask of originalRecurringTasks) { // originalTask here is the root task (original_task_id is null)
        const originalTaskCreatedAtUTC = getUTCStartOfDay(parseISO(originalTask.created_at));

        // Find all instances of this recurring task, including the original itself
        const allInstancesOfThisRecurringTask = tasks.filter(t =>
            t.original_task_id === originalTask.id || t.id === originalTask.id
        );

        // Sort by created_at descending to find the latest relevant instance
        const sortedInstances = [...allInstancesOfThisRecurringTask]
            .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime());

        // Find the latest non-archived instance to use as a template
        // This could be the original task itself if no instances exist yet,
        // or the most recent instance that isn't archived.
        const latestRelevantInstance = sortedInstances.find(t => t.status !== 'archived') || originalTask;

        // Check if an instance for the current day already exists
        const instanceForCurrentDay = allInstancesOfThisRecurringTask.find(t =>
            isSameDay(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status !== 'archived'
        );

        if (instanceForCurrentDay) {
            console.log(`syncRecurringTasks: For original ${originalTask.id}, found instance for current date (${format(effectiveCurrentDateUTC, 'yyyy-MM-dd')}) with status: ${instanceForCurrentDay.status}. No new instance needed.`);
            continue; // Skip if an instance for today already exists
        }

        // Determine if a new instance should be created based on the latest relevant instance's status
        let shouldCreateNewInstance = false;
        if (isSameDay(originalTaskCreatedAtUTC, effectiveCurrentDateUTC)) {
            // If the original task was created today, and no instance exists for today, create it.
            shouldCreateNewInstance = true;
            console.log(`syncRecurringTasks: Original task "${originalTask.description}" created today. Creating first instance.`);
        } else if (isBefore(originalTaskCreatedAtUTC, effectiveCurrentDateUTC)) {
            // If the original task was created before today, check the latest previous instance
            const latestPreviousInstance = allInstancesOfThisRecurringTask
                .filter(t => isBefore(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status === 'to-do')
                .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())[0];

            if (latestPreviousInstance) {
                if (latestPreviousInstance.status === 'completed' || latestPreviousInstance.status === 'skipped') {
                    shouldCreateNewInstance = true;
                    console.log(`syncRecurringTasks: Latest previous instance (${latestPreviousInstance.id}) was completed/skipped. Creating new 'to-do' instance for today.`);
                } else if (latestPreviousInstance.status === 'to-do') {
                    console.log(`syncRecurringTasks: Latest previous instance (${latestPreviousInstance.id}) was 'to-do'. It should carry over. No new instance needed.`);
                }
            } else {
                // This case should ideally not happen if originalTaskCreatedAtUTC is before effectiveCurrentDateUTC
                // and no instances exist. It implies a gap. We should create one.
                shouldCreateNewInstance = true;
                console.warn(`syncRecurringTasks: No previous instance found for "${originalTask.description}" before ${format(effectiveCurrentDateUTC, 'yyyy-MM-dd')}. Creating an instance for today.`);
            }
        }

        if (shouldCreateNewInstance) {
            const createdTask = await createRecurringTaskInstance(latestRelevantInstance, effectiveCurrentDateUTC, originalTask.id);
            if (createdTask) {
                newTasksAdded.push(createdTask);
            }
        }
    }

    if (newTasksAdded.length > 0) {
      setTasks(prevTasks => [...prevTasks, ...newTasksAdded]);
      console.log('syncRecurringTasks: Added new recurring task instances to state:', newTasksAdded.map(t => t.id));
    }
  }, [userId, tasks, currentDate, createRecurringTaskInstance, loading, viewMode]);

  useEffect(() => {
    if (!authLoading && userId) {
      fetchDataAndSections();
    } else if (!authLoading && !userId) {
      setTasks([]);
      setSections([]);
      setAllCategories([]);
      setLoading(false);
      console.log('useTasks useEffect: Auth loaded, no user ID, clearing tasks and sections.');
    } else if (authLoading) {
      setTasks([]);
      setSections([]);
      setAllCategories([]);
      setLoading(true);
      console.log('useTasks useEffect: Auth still loading, clearing tasks and setting loading true.');
    }
  }, [userId, authLoading, fetchDataAndSections]);

  useEffect(() => {
    if (!loading && userId && viewMode === 'daily') {
      syncRecurringTasks();
    }
  }, [loading, userId, currentDate, syncRecurringTasks, viewMode]);

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

      const targetSectionTasks = tasks.filter(t => t.parent_task_id === null && t.section_id === (newTaskData.section_id || null));
      const newOrder = targetSectionTasks.length;

      // Construct the task object for local state update (includes category_color)
      newTask = {
        id: uuidv4(),
        user_id: userId,
        created_at: (currentDate || new Date()).toISOString(),
        status: newTaskData.status || 'to-do',
        recurring_type: newTaskData.recurring_type || 'none',
        category: newTaskData.category,
        category_color: categoryColor, // Include for local state
        priority: newTaskData.priority || 'medium',
        due_date: newTaskData.due_date ? newTaskData.due_date.toISOString() : null,
        notes: newTaskData.notes || null,
        remind_at: newTaskData.remind_at ? newTaskData.remind_at.toISOString() : null,
        section_id: newTaskData.section_id || null,
        order: newOrder,
        original_task_id: null,
        parent_task_id: newTaskData.parent_task_id || null,
        description: newTaskData.description,
      };
      setTasks(prev => [...prev, newTask]);

      // Construct the payload for database insert (EXCLUDE category_color)
      const dbInsertPayload = {
        id: newTask.id,
        user_id: newTask.user_id,
        created_at: newTask.created_at,
        status: newTask.status,
        recurring_type: newTask.recurring_type,
        category: newTask.category,
        priority: newTask.priority,
        due_date: newTask.due_date,
        notes: newTask.notes,
        remind_at: newTask.remind_at,
        section_id: newTask.section_id,
        order: newTask.order,
        original_task_id: newTask.original_task_id,
        parent_task_id: newTask.parent_task_id,
        description: newTask.description,
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(dbInsertPayload)
        .select()
        .single();

      if (error) throw error;
      
      // Update local state with data returned from DB (which won't have category_color, so re-add it)
      setTasks(prev => prev.map(t => t.id === data.id ? { ...data, category_color: categoriesMap.get(data.category) || 'gray' } : t));

      showSuccess('Task added successfully!');
      return true;
    } catch (error: any) {
      console.error('Error adding task:', error);
      showError('Failed to add task.');
      setTasks(prev => prev.filter(task => task.id !== newTask.id));
      return false;
    }
  }, [userId, currentDate, categoriesMap, tasks]);

  const updateTask = useCallback(async (taskId: string, updates: TaskUpdate) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }

    let updatedCategoryColor: string | undefined;
    if (updates.category) {
      updatedCategoryColor = categoriesMap.get(updates.category) || 'gray';
    }

    setTasks(prevTasks => prevTasks.map(task =>
      task.id === taskId ? { ...task, ...updates, ...(updatedCategoryColor && { category_color: updatedCategoryColor }) } : task
    ));

    try {
      // Exclude category_color from the updates sent to DB
      const dbUpdates = { ...updates };
      if ('category_color' in dbUpdates) {
        delete dbUpdates.category_color;
      }

      const { error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Task updated successfully!');

    } catch (error: any) {
      console.error('Error updating task:', error);
      showError('Failed to update task.');
      // No manual refetch here, rely on real-time subscription
    }
  }, [userId, categoriesMap]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    let taskToDelete: Task | undefined;
    try {
      taskToDelete = tasks.find(t => t.id === taskId);
      if (!taskToDelete) return;

      let idsToDelete = [taskId];
      const subtaskIds = tasks.filter(t => t.parent_task_id === taskId).map(t => t.id);
      idsToDelete = [...idsToDelete, ...subtaskIds];

      if (taskToDelete.recurring_type !== 'none' && taskToDelete.original_task_id === null) {
        const recurringInstanceIds = tasks.filter(t => t.original_task_id === taskId).map(t => t.id);
        idsToDelete = [...idsToDelete, ...recurringInstanceIds];
      }

      setTasks(prev => prev.filter(task => !idsToDelete.includes(task.id)));

      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', idsToDelete)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Task(s) deleted successfully!');
    }
    catch (error: any) {
      console.error('Error deleting task:', error);
      showError('Failed to delete task.');
      // No manual refetch here, rely on real-time subscription
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

    let updatedCategoryColor: string | undefined;
    if (updates.category) {
      updatedCategoryColor = categoriesMap.get(updates.category) || 'gray';
    }

    setTasks(prev => prev.map(task => 
      ids.includes(task.id) ? { ...task, ...updates, ...(updatedCategoryColor && { category_color: updatedCategoryColor }) } : task
    ));

    try {
      // Exclude category_color from the updates sent to DB
      const dbUpdates = { ...updates };
      if ('category_color' in dbUpdates) {
        delete dbUpdates.category_color;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .in('id', ids)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      showSuccess(`${ids.length} tasks updated successfully!`);
      clearSelectedTasks();
      
      // No manual refetch here, rely on real-time subscription
    } catch (error: any) {
      console.error('Error bulk updating tasks:', error);
      showError('Failed to update tasks in bulk.');
      // No manual refetch here, rely on real-time subscription
    }
  }, [userId, selectedTaskIds, clearSelectedTasks, categoriesMap]);

  const markAllTasksInSectionCompleted = useCallback(async (sectionId: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }

    const taskIdsToComplete = tasks
      .filter(task => task.section_id === sectionId && task.status !== 'completed')
      .map(task => task.id);

    if (taskIdsToComplete.length === 0) {
      showSuccess('No incomplete tasks found in this section.');
      return;
    }

    try {
      setTasks(prev => prev.map(task => 
        taskIdsToComplete.includes(task.id) ? { ...task, status: 'completed' } : task
      ));

      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .in('id', taskIdsToComplete)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess(`${taskIdsToComplete.length} tasks in section marked as completed!`);
      // No manual refetch here, rely on real-time subscription
    } catch (error: any) {
      console.error('Error marking all tasks in section as completed:', error);
      showError('Failed to mark tasks as completed.');
      // No manual refetch here, rely on real-time subscription
    }
  }, [userId, tasks]);

  const createSection = useCallback(async (name: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      const newOrder = sections.length;

      const { data, error } = await supabase
        .from('task_sections')
        .insert({ name, user_id: userId, order: newOrder, include_in_focus_mode: true })
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

  const updateSectionIncludeInFocusMode = useCallback(async (sectionId: string, include: boolean) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      const { error } = await supabase
        .from('task_sections')
        .update({ include_in_focus_mode: include })
        .eq('id', sectionId)
        .eq('user_id', userId);
      if (error) throw error;
      setSections(prev => prev.map(s => (s.id === sectionId ? { ...s, include_in_focus_mode: include } : s)));
      showSuccess(`Section "${sections.find(s => s.id === sectionId)?.name}" focus mode setting updated!`);
    } catch (error: any) {
      console.error('Error updating section focus mode setting:', error);
      showError('Failed to update section focus mode setting.');
    }
  }, [userId, sections]);

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

  const reorderTasksInSameSection = useCallback(async (sectionId: string | null, activeId: string, overId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }

    const originalTasks = [...tasks]; // Capture current state for potential rollback

    const tasksInCurrentSection = tasks.filter(t => t.parent_task_id === null && t.section_id === sectionId)
                                      .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));
    const activeIndex = tasksInCurrentSection.findIndex(t => t.id === activeId);
    const overIndex = tasksInCurrentSection.findIndex(t => t.id === overId);

    if (activeIndex === -1 || overIndex === -1) return;

    const newOrderedTasksInSection = arrayMove(tasksInCurrentSection, activeIndex, overIndex);

    const updates = newOrderedTasksInSection.map((task, index) => ({
      id: task.id,
      description: task.description, // Include all non-nullable fields
      status: task.status,
      recurring_type: task.recurring_type,
      created_at: task.created_at,
      category: task.category,
      priority: task.priority,
      due_date: task.due_date,
      notes: task.notes,
      remind_at: task.remind_at,
      section_id: task.section_id,
      parent_task_id: task.parent_task_id,
      order: index, // The field we are actually updating
      user_id: userId, // Include user_id for RLS
    }));

    // Optimistic update
    setTasks(prevTasks => {
      const updatedTasksMap = new Map(updates.map(u => [u.id, u])); // Map full updated task objects
      const newTasksState = prevTasks.map(task => {
        if (updatedTasksMap.has(task.id)) {
          return { ...task, ...updatedTasksMap.get(task.id) }; // Apply full updated object
        }
        return task;
      });
      // Re-sort the entire tasks array to maintain consistency
      return newTasksState.sort((a, b) => {
        const aSectionOrder = sections.find(s => s.id === a.section_id)?.order ?? Infinity;
        const bSectionOrder = sections.find(s => s.id === b.section_id)?.order ?? Infinity;
        if (aSectionOrder !== bSectionOrder) return aSectionOrder - bSectionOrder;
        return (a.order || Infinity) - (b.order || Infinity);
      });
    });

    try {
      // Persist to DB
      const { error } = await supabase
        .from('tasks')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        throw error; // Trigger catch block
      }
      showSuccess('Task reordered successfully!');
    }
    catch (error: any) {
      console.error('Error reordering tasks:', error);
      showError('Failed to reorder task.');
      setTasks(originalTasks); // Revert to original state on error
    }
  }, [userId, tasks, sections]); // Added sections to dependencies

  const moveTaskToNewSection = useCallback(async (activeId: string, oldSectionId: string | null, newSectionId: string | null, overId: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }

    const originalTasks = [...tasks]; // Capture current state for potential rollback

    let taskToMove: Task | undefined;
    const tasksInOldSection = tasks.filter(t => t.section_id === oldSectionId && t.parent_task_id === null)
                                   .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));
    const tasksInNewSection = tasks.filter(t => t.section_id === newSectionId && t.parent_task_id === null)
                                   .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));

    taskToMove = tasks.find(t => t.id === activeId);
    if (!taskToMove) return;

    // Remove task from old section's list for re-indexing
    const oldSectionTasksAfterRemoval = tasksInOldSection.filter(t => t.id !== activeId);
    const updatesForOldSection = oldSectionTasksAfterRemoval.map((task, index) => ({
      id: task.id,
      description: task.description, // Include all non-nullable fields
      status: task.status,
      recurring_type: task.recurring_type,
      created_at: task.created_at,
      category: task.category,
      priority: task.priority,
      due_date: task.due_date,
      notes: task.notes,
      remind_at: task.remind_at,
      section_id: task.section_id,
      parent_task_id: task.parent_task_id,
      order: index,
      user_id: userId,
    }));

    // Add task to new section's list at the correct position for re-indexing
    let newSectionTasksWithMoved = [...tasksInNewSection];
    if (overId) {
      const overIndex = newSectionTasksWithMoved.findIndex(t => t.id === overId);
      if (overIndex !== -1) {
        newSectionTasksWithMoved.splice(overIndex, 0, { ...taskToMove, section_id: newSectionId });
      } else {
        newSectionTasksWithMoved.push({ ...taskToMove, section_id: newSectionId }); // Fallback to end if overId not found
      }
    } else {
      newSectionTasksWithMoved.push({ ...taskToMove, section_id: newSectionId }); // Add to end if no overId
    }

    const updatesForNewSection = newSectionTasksWithMoved.map((task, index) => ({
      id: task.id,
      description: task.description, // Include all non-nullable fields
      status: task.status,
      recurring_type: task.recurring_type,
      created_at: task.created_at,
      category: task.category,
      priority: task.priority,
      due_date: task.due_date,
      notes: task.notes,
      remind_at: task.remind_at,
      section_id: newSectionId, // Ensure section_id is set for the moved task
      parent_task_id: task.parent_task_id,
      order: index,
      user_id: userId,
    }));

    const allUpdatesForDb = [
      ...updatesForOldSection,
      ...updatesForNewSection,
    ];

    // Optimistic update
    setTasks(prevTasks => {
      const updatedTasksMap = new Map(allUpdatesForDb.map(u => [u.id, u]));
      const newTasksState = prevTasks.map(task => {
        if (updatedTasksMap.has(task.id)) {
          return { ...task, ...updatedTasksMap.get(task.id) };
        }
        return task;
      });
      // Re-sort the entire tasks array to maintain consistency
      return newTasksState.sort((a, b) => {
        const aSectionOrder = sections.find(s => s.id === a.section_id)?.order ?? Infinity;
        const bSectionOrder = sections.find(s => s.id === b.section_id)?.order ?? Infinity;
        if (aSectionOrder !== bSectionOrder) return aSectionOrder - bSectionOrder;
        return (a.order || Infinity) - (b.order || Infinity);
      });
    });

    try {
      const { error } = await supabase
        .from('tasks')
        .upsert(allUpdatesForDb, { onConflict: 'id' });

      if (error) {
        throw error;
      }
      showSuccess('Task moved successfully!');
    }
    catch (error: any) {
      console.error('Error moving task:', error);
      showError('Failed to move task.');
      setTasks(originalTasks); // Revert to original state on error
    }
  }, [userId, tasks, sections]); // Added sections to dependencies

  const reorderSections = useCallback(async (activeId: string, overId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }

    const originalSections = [...sections]; // Capture current state for potential rollback

    const activeIndex = sections.findIndex(s => s.id === activeId);
    const overIndex = sections.findIndex(s => s.id === overId);

    if (activeIndex === -1 || overIndex === -1) return;

    const newOrderedSections = arrayMove(sections, activeIndex, overIndex);

    const updates = newOrderedSections.map((section, index) => ({
      id: section.id,
      name: section.name, // Include non-nullable fields
      user_id: userId, // Include non-nullable fields
      include_in_focus_mode: section.include_in_focus_mode, // Include non-nullable fields
      order: index, // The field we are actually updating
    }));

    // Optimistic update
    setSections(prevSections => {
      const updatedSectionsMap = new Map(updates.map(u => [u.id, u.order]));
      return prevSections.map(section => {
        if (updatedSectionsMap.has(section.id)) {
          return { ...section, order: updatedSectionsMap.get(section.id) };
        }
        return section;
      });
    });

    try {
      const { error } = await supabase
        .from('task_sections')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        throw error;
      }
      showSuccess('Sections reordered successfully!');
    }
    catch (error: any) {
      console.error('Error reordering sections:', error);
      showError('Failed to reorder sections.');
      setSections(originalSections); // Revert to original state on error
    }
  }, [userId, sections]);

  const moveTask = useCallback(async (taskId: string, direction: 'up' | 'down') => {
    if (!userId) {
      showError('User not authenticated.');
      console.error('moveTask: User not authenticated.');
      return;
    }

    console.log(`moveTask: Attempting to move task ${taskId} in direction: ${direction}`); // Added direction log

    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove) {
      showError('Task not found.');
      console.error(`moveTask: Task with ID ${taskId} not found.`);
      return;
    }
    console.log(`moveTask: Task to move details:`, taskToMove);
    if (taskToMove.parent_task_id !== null) {
      showError('Cannot reorder sub-tasks directly.');
      console.error(`moveTask: Attempted to reorder sub-task ${taskId}.`);
      return;
    }

    const currentSectionId = taskToMove.section_id;
    console.log(`moveTask: Task ${taskId} is in section ${currentSectionId || 'No Section'}`);

    const tasksInCurrentSection = tasks
      .filter(t => t.section_id === currentSectionId && t.parent_task_id === null)
      .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));

    console.log('moveTask: Tasks in current section (after filter and sort):', tasksInCurrentSection.map(t => ({ id: t.id, order: t.order, description: t.description })));

    const currentIndex = tasksInCurrentSection.findIndex(t => t.id === taskId);

    console.log(`moveTask: tasksInCurrentSection length: ${tasksInCurrentSection.length}, currentIndex: ${currentIndex}`);

    if (currentIndex === -1) {
      console.error(`moveTask: Task ${taskId} not found in its filtered section list.`);
      return;
    }

    let newIndex = currentIndex;
    if (direction === 'up') {
      if (currentIndex === 0) {
        console.log(`moveTask: Logic check - Attempted to move UP from top. Current index: ${currentIndex}, Length: ${tasksInCurrentSection.length}`);
        showError('Task is already at the top.');
        console.log('moveTask: Task already at top.');
        return;
      }
      newIndex = currentIndex - 1;
    } else { // direction === 'down'
      if (currentIndex === tasksInCurrentSection.length - 1) {
        console.log(`moveTask: Logic check - Attempted to move DOWN from bottom. Current index: ${currentIndex}, Length: ${tasksInCurrentSection.length}`);
        showError('Task is already at the bottom.');
        console.log('moveTask: Task already at bottom.');
        return;
      }
      newIndex = currentIndex + 1;
    }

    console.log(`moveTask: Moving from index ${currentIndex} to ${newIndex}`);

    const newOrderedTasksInSection = arrayMove(tasksInCurrentSection, currentIndex, newIndex);

    console.log('moveTask: Tasks in current section (after arrayMove):', newOrderedTasksInSection.map(t => ({ id: t.id, order: t.order, description: t.description })));

    const updates = newOrderedTasksInSection.map((task, index) => ({
      id: task.id,
      description: task.description, // Include all non-nullable fields
      status: task.status,
      recurring_type: task.recurring_type,
      created_at: task.created_at,
      category: task.category,
      priority: task.priority,
      due_date: task.due_date,
      notes: task.notes,
      remind_at: task.remind_at,
      section_id: task.section_id,
      parent_task_id: task.parent_task_id,
      order: index, // The field we are actually updating
      user_id: userId, // Include user_id for RLS
    }));

    console.log('moveTask: Updates payload for Supabase:', updates.map(u => ({id: u.id, order: u.order})));

    // Optimistic update
    setTasks(prevTasks => {
      const updatedTasksMap = new Map(updates.map(u => [u.id, u]));
      const newTasksState = prevTasks.map(task => {
        if (updatedTasksMap.has(task.id)) {
          return { ...task, ...updatedTasksMap.get(task.id) };
        }
        return task;
      });
      // Re-sort the entire tasks array to maintain consistency
      return newTasksState.sort((a, b) => {
        const aSectionOrder = sections.find(s => s.id === a.section_id)?.order ?? Infinity;
        const bSectionOrder = sections.find(s => s.id === b.section_id)?.order ?? Infinity;
        if (aSectionOrder !== bSectionOrder) return aSectionOrder - bSectionOrder;
        return (a.order || Infinity) - (b.order || Infinity);
      });
    });
    console.log('moveTask: Optimistic update applied and tasks state re-sorted.');

    try {
      const { error } = await supabase
        .from('tasks')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        console.error('moveTask: Supabase upsert error:', error);
        throw error;
      }
      showSuccess('Task reordered successfully!');
      console.log('moveTask: Supabase upsert successful.');
    } catch (error: any) {
      console.error('moveTask: Caught error during reordering:', error);
      showError('Failed to reorder task.');
      // No manual refetch here, rely on real-time subscription
    }
  }, [userId, tasks, sections]);

  const { finalFilteredTasks, nextAvailableTask, focusModeTasksForDailyStreak } = useMemo(() => {
    console.log('filteredTasks/nextAvailableTask: --- START FILTERING ---');
    console.log('filteredTasks/nextAvailableTask: Current viewMode:', viewMode);
    console.log('filteredTasks/nextAvailableTask: Raw tasks state at start of memo:', tasks.map(t => ({
      id: t.id,
      description: t.description,
      status: t.status,
      created_at: t.created_at,
      original_task_id: t.original_task_id,
      recurring_type: t.recurring_type,
      parent_task_id: t.parent_task_id,
      category: t.category,
      category_color: t.category_color
    })));

    let relevantTasks: Task[] = [];

    if (viewMode === 'archive') {
      relevantTasks = tasks.filter(task => task.status === 'archived');
      console.log('filteredTasks/nextAvailableTask: Archive mode - relevantTasks (archived only):', relevantTasks.map(t => t.id));
    } else {
      const effectiveCurrentDateUTC = currentDate ? getUTCStartOfDay(currentDate) : getUTCStartOfDay(new Date());
      console.log('filteredTasks/nextAvailableTask: Daily mode - Current Date (UTC):', effectiveCurrentDateUTC.toISOString());
      const processedOriginalIds = new Set<string>(); // To ensure only one instance per recurring series per day

      const topLevelTasks = tasks.filter(task => task.parent_task_id === null);

      topLevelTasks.forEach(task => {
        const originalId = task.original_task_id || task.id;

        if (processedOriginalIds.has(originalId)) {
            console.log(`filteredTasks/nextAvailableTask: Skipping already processed originalId: ${originalId}`);
            return; // Already processed this recurring series for today
        }

        if (task.recurring_type !== 'none') {
            const allInstancesOfThisRecurringTask = tasks.filter(t =>
                t.original_task_id === originalId || t.id === originalId
            );

            let taskToDisplay: Task | null = null;

            // 1. Look for an instance created specifically for the current day
            const instanceForCurrentDay = allInstancesOfThisRecurringTask.find(t =>
                isSameDay(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status !== 'archived'
            );

            if (instanceForCurrentDay) {
                taskToDisplay = instanceForCurrentDay;
            } else {
                // 2. If no instance for today, look for the latest 'to-do' carry-over from a previous day
                const carryOverTask = allInstancesOfThisRecurringTask
                    .filter(t => isBefore(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status === 'to-do')
                    .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())[0]; // Latest one

                if (carryOverTask) {
                    taskToDisplay = carryOverTask;
                }
            }

            if (taskToDisplay) {
                relevantTasks.push(taskToDisplay);
                processedOriginalIds.add(originalId); // Mark as processed for this recurring series
            }
        } else { // Non-recurring task
            const taskCreatedAtUTC = getUTCStartOfDay(parseISO(task.created_at));
            const isTaskCreatedOnCurrentDate = isSameDay(taskCreatedAtUTC, effectiveCurrentDateUTC);

            if (isTaskCreatedOnCurrentDate && task.status !== 'archived') {
                console.log(`filteredTasks/nextAvailableTask: Pushing non-recurring task created on current date: ${task.id}, ${task.description}`);
                relevantTasks.push(task);
            } else if (isBefore(taskCreatedAtUTC, effectiveCurrentDateUTC) && task.status === 'to-do') {
                console.log(`filteredTasks/nextAvailableTask: Pushing non-recurring carry-over task: ${task.id}, ${task.description}`);
                relevantTasks.push(task);
            } else {
                console.log(`filteredTasks/nextAvailableTask: Skipping non-recurring task: ${task.id}, ${task.description} (not created today, not to-do carry-over, or archived)`);
            }
        }
      });
    }

    // Calculate focusModeSectionIds once
    const focusModeSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));

    // This is the set of tasks that would be shown in Focus Mode, regardless of current viewMode
    let tasksForFocusModeDisplay = relevantTasks.filter(task => 
      task.section_id === null || focusModeSectionIds.has(task.section_id)
    );

    // Now, apply the viewMode specific filtering for finalFilteredTasks
    let currentViewFilteredTasks = relevantTasks; // Start with tasks relevant for the day/archive

    if (viewMode === 'daily') {
      if (statusFilter !== 'all') {
        currentViewFilteredTasks = currentViewFilteredTasks.filter(task => task.status === statusFilter);
      } else {
        currentViewFilteredTasks = currentViewFilteredTasks.filter(task => task.status !== 'archived');
      }
    } else if (viewMode === 'focus') { // This block was already there, but now it's explicit
      currentViewFilteredTasks = tasksForFocusModeDisplay; // If in focus mode, use the focus-filtered set
    }
    // Apply search, category, priority, section filters to currentViewFilteredTasks
    if (searchFilter) {
      currentViewFilteredTasks = currentViewFilteredTasks.filter(task =>
        task.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }
    if (categoryFilter && categoryFilter !== 'all') {
      currentViewFilteredTasks = currentViewFilteredTasks.filter(task => task.category === categoryFilter);
    }
    if (priorityFilter && priorityFilter !== 'all') {
      currentViewFilteredTasks = currentViewFilteredTasks.filter(task => task.priority === priorityFilter);
    }
    if (sectionFilter && sectionFilter !== 'all') {
      currentViewFilteredTasks = currentViewFilteredTasks.filter(task => {
        if (sectionFilter === 'no-section') {
          return task.section_id === null;
        }
        return task.section_id === sectionFilter;
      });
    }

    currentViewFilteredTasks.sort((a, b) => {
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

    let nextAvailableTask: Task | null = null;
    if (viewMode === 'daily') {
      nextAvailableTask = currentViewFilteredTasks.find(task => 
        task.status === 'to-do' && task.parent_task_id === null
      ) || null;
    }

    // The `DailyStreak` needs `tasksForFocusModeDisplay` (or a subset of it)
    // Let's ensure `focusModeTasksForDailyStreak` is also filtered by status 'to-do' or 'completed'
    // and is not archived, as DailyStreak is about progress.
    const dailyStreakRelevantFocusTasks = tasksForFocusModeDisplay.filter(task => task.status !== 'archived');


    console.log('filteredTasks/nextAvailableTask: Final tasks AFTER all filters and sorting:', currentViewFilteredTasks.map(t => ({
      id: t.id,
      description: t.description,
      status: t.status,
      created_at: t.created_at,
      original_task_id: t.original_task_id,
      recurring_type: t.recurring_type,
      parent_task_id: t.parent_task_id,
      category: t.category,
      category_color: t.category_color
    })));
    console.log('filteredTasks/nextAvailableTask: Next available task:', nextAvailableTask ? nextAvailableTask.description : 'None');
    console.log('filteredTasks/nextAvailableTask: Focus mode tasks for DailyStreak:', dailyStreakRelevantFocusTasks.map(t => ({id: t.id, description: t.description, section_id: t.section_id, status: t.status})));
    console.log('filteredTasks/nextAvailableTask: --- END FILTERING ---');
    return { 
      finalFilteredTasks: currentViewFilteredTasks, 
      nextAvailableTask, 
      focusModeTasksForDailyStreak: dailyStreakRelevantFocusTasks 
    };
  }, [tasks, currentDate, searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter, sections, viewMode]);

  return {
    tasks,
    filteredTasks: finalFilteredTasks,
    nextAvailableTask,
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
    markAllTasksInSectionCompleted,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    sections,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    reorderTasksInSameSection,
    moveTaskToNewSection,
    reorderSections,
    moveTask, // Expose the new moveTask function
    fetchDataAndSections,
    allCategories,
    focusModeTasksForDailyStreak, // New return value
  };
};