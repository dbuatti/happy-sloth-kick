import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { useReminders } from '@/context/ReminderContext';
import { v4 as uuidv4 } from 'uuid';
import { isSameDay, isPast, startOfDay as fnsStartOfDay, parseISO, format, isAfter, isBefore, addDays, addWeeks, addMonths, isValid } from 'date-fns'; // Added isValid
import { getCategoryColorProps } from '@/lib/categoryColors';
import { arrayMove } from '@dnd-kit/sortable';

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
  link: string | null; // Added link field
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
  link?: string | null; // Added link field
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
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const { addReminder, dismissReminder, clearAllReminders } = useReminders();

  const [tasks, setTasks] = useState<Task[]>([]);

  const [loading, setLoading] = useState(true);

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
    }
  }, [currentDate, viewMode]);

  const fetchDataAndSections = useCallback(async () => {
    console.log('[useTasks] fetchDataAndSections: Starting fetch for user:', userId);
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
      console.log('[useTasks] Fetched sections:', sectionsData);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('task_categories')
        .select('id, name, color, user_id, created_at')
        .eq('user_id', userId);
      if (categoriesError) throw categoriesError;
      
      let fetchedCategories: Category[] = categoriesData || [];
      let generalCategory: Category | undefined = fetchedCategories.find(cat => cat.name.toLowerCase() === 'general');

      if (!generalCategory) {
        console.log('[useTasks] "General" category not found, creating it.');
        const { data: newGeneralCat, error: insertCatError } = await supabase
          .from('task_categories')
          .insert({ name: 'General', color: 'gray', user_id: userId })
          .select('id, name, color, user_id, created_at')
          .single();
        if (insertCatError) throw insertCatError;
        fetchedCategories = [...fetchedCategories, newGeneralCat];
        generalCategory = newGeneralCat;
        console.log('[useTasks] Created "General" category:', newGeneralCat);
      }
      
      setAllCategories(fetchedCategories);
      const newCategoriesMap = new Map<string, string>();
      fetchedCategories.forEach(cat => newCategoriesMap.set(cat.id, cat.color));
      setCategoriesMap(newCategoriesMap);
      console.log('[useTasks] Fetched categories and built map.');

      const { data: initialTasksFromDB, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;
      console.log('[useTasks] Fetched initial tasks from DB:', initialTasksFromDB);

      const mappedTasks: Task[] = initialTasksFromDB.map((task: any) => {
        const categoryColor = newCategoriesMap.get(task.category) || 'gray';
        console.log(`[useTasks] Mapping task ${task.id}: remind_at=${task.remind_at}, isValid(remind_at)=${isValid(parseISO(task.remind_at))}`);
        return {
          ...task,
          category_color: categoryColor,
        };
      });

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
          if (orderA !== orderB) return orderA - b.order;
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
              original_task_id: task.original_task_id,
              link: task.link, // Include link
              order: index,
              user_id: userId,
            };
            updatesForDb.push(dbUpdatePayload);

            // Create the object for local state update (must conform to Task interface)
            const localTaskStateUpdate: Task = {
              ...task,
              order: index,
            };
            tasksById.set(task.id, localTaskStateUpdate);
          }
        });
      }

      // Reconstruct the full tasks array with updated orders
      const finalTasksState = mappedTasks.map(task => tasksById.get(task.id) || task);
      setTasks(finalTasksState);
      console.log('[useTasks] fetchDataAndSections: Tasks state set. Total tasks:', finalTasksState.length);

      // Send updates to DB if any orders were changed
      if (updatesForDb.length > 0) {
        console.log('[useTasks] fetchDataAndSections: Sending DB upsert for order normalization:', updatesForDb);
        const { error: upsertError } = await supabase
          .from('tasks')
          .upsert(updatesForDb, { onConflict: 'id' });
        if (upsertError) {
          console.error('useTasks: Error normalizing task orders in DB:', upsertError);
          showError('Failed to synchronize task orders.');
        }
      }
      
    } catch (error: any) {
      console.error('[useTasks] Error in fetchDataAndSections:', error);
      showError('An unexpected error occurred while loading data.');
    } finally {
      setLoading(false);
      console.log('[useTasks] fetchDataAndSections: Finished.');
    }
  }, [userId]);

  const createRecurringTaskInstance = useCallback(async (templateTask: Task, targetDate: Date, rootOriginalTaskId: string, currentTasks: Task[]): Promise<Task | null> => {
    console.log('[useTasks] createRecurringTaskInstance: Called for template:', templateTask.id, 'targetDate:', targetDate);
    if (templateTask.recurring_type === 'none' || !userId) {
      console.log('[useTasks] createRecurringTaskInstance: Skipping (not recurring or no user).');
      return null;
    }

    const targetDateUTC = getUTCStartOfDay(targetDate);

    const existingInstance = currentTasks.find(t =>
      (t.original_task_id === rootOriginalTaskId || t.id === rootOriginalTaskId) &&
      isSameDay(getUTCStartOfDay(parseISO(t.created_at)), targetDateUTC) &&
      t.status !== 'archived'
    );

    if (existingInstance) {
      console.log('[useTasks] createRecurringTaskInstance: Existing instance found, skipping creation.');
      return null;
    }

    const newInstanceDataForDb = {
      id: uuidv4(),
      user_id: userId,
      description: templateTask.description,
      status: 'to-do',
      recurring_type: templateTask.recurring_type,
      created_at: targetDateUTC.toISOString(),
      category: templateTask.category,
      priority: templateTask.priority,
      due_date: templateTask.due_date,
      notes: templateTask.notes,
      remind_at: templateTask.remind_at,
      section_id: templateTask.section_id,
      order: templateTask.order,
      original_task_id: rootOriginalTaskId,
      parent_task_id: null,
      link: templateTask.link, // Include link
    };
    console.log('[useTasks] createRecurringTaskInstance: New instance payload:', newInstanceDataForDb);

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
    console.log('[useTasks] createRecurringTaskInstance: Successfully created instance:', data);
    return { ...data, category_color: categoriesMap.get(data.category) || 'gray' };
  }, [userId, categoriesMap]);

  const syncRecurringTasks = useCallback(async () => {
    console.log('[useTasks] syncRecurringTasks: Starting sync for viewMode:', viewMode, 'userId:', userId);
    if (viewMode !== 'daily' || !userId) {
      console.log('[useTasks] syncRecurringTasks: Skipping (not daily view or no user).');
      return;
    }

    const effectiveCurrentDateUTC = currentDate ? getUTCStartOfDay(currentDate) : getUTCStartOfDay(new Date());
    let newTasksAdded: Task[] = [];

    const { data: currentTasksFromDB, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('syncRecurringTasks: Error fetching tasks for sync:', fetchError);
      return;
    }
    const currentTasks = currentTasksFromDB.map((task: any) => ({
      ...task,
      category_color: categoriesMap.get(task.category) || 'gray',
    }));
    console.log('[useTasks] syncRecurringTasks: Fetched current tasks for sync:', currentTasks);

    const originalRecurringTasks = currentTasks.filter(t => t.recurring_type !== 'none' && t.original_task_id === null);
    console.log('[useTasks] syncRecurringTasks: Original recurring tasks found:', originalRecurringTasks.length);

    for (const originalTask of originalRecurringTasks) {
        const originalTaskCreatedAtUTC = getUTCStartOfDay(parseISO(originalTask.created_at));
        console.log(`[useTasks] Syncing recurring task "${originalTask.description}" (ID: ${originalTask.id})`);

        const allInstancesOfThisRecurringTask = currentTasks.filter(t =>
            t.original_task_id === originalTask.id || t.id === originalTask.id
        );
        console.log('[useTasks] All instances:', allInstancesOfThisRecurringTask.length);

        const sortedInstances = [...allInstancesOfThisRecurringTask]
            .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime());

        const latestRelevantInstance = sortedInstances.find(t => t.status !== 'archived') || originalTask;
        console.log('[useTasks] Latest relevant instance:', latestRelevantInstance.id);

        const instanceForCurrentDay = allInstancesOfThisRecurringTask.find(t =>
            isSameDay(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status !== 'archived'
        );

        if (instanceForCurrentDay) {
            console.log('[useTasks] Instance already exists for current day, skipping.');
            continue;
        }

        let shouldCreateNewInstance = false;
        if (isSameDay(originalTaskCreatedAtUTC, effectiveCurrentDateUTC)) {
            shouldCreateNewInstance = true;
            console.log('[useTasks] Original task created today, creating instance.');
        } else if (isBefore(originalTaskCreatedAtUTC, effectiveCurrentDateUTC)) {
            const latestPreviousInstance = allInstancesOfThisRecurringTask
                .filter(t => isBefore(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status === 'to-do')
                .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())[0];

            if (latestPreviousInstance) {
                if (latestPreviousInstance.status === 'completed' || latestPreviousInstance.status === 'skipped') {
                    shouldCreateNewInstance = true;
                    console.log('[useTasks] Latest previous instance completed/skipped, creating new instance.');
                } else {
                    console.log('[useTasks] Latest previous instance is still "to-do", not creating new instance.');
                }
            } else {
                shouldCreateNewInstance = true;
                console.warn(`[useTasks] No previous instance found for "${originalTask.description}" before ${format(effectiveCurrentDateUTC, 'yyyy-MM-dd')}. Creating an instance for today.`);
            }
        }

        if (shouldCreateNewInstance) {
            const createdTask = await createRecurringTaskInstance(latestRelevantInstance, effectiveCurrentDateUTC, originalTask.id, currentTasks);
            if (createdTask) {
                newTasksAdded.push(createdTask);
            }
        }
    }

    if (newTasksAdded.length > 0) {
      setTasks(prevTasks => [...prevTasks, ...newTasksAdded]);
      console.log('[useTasks] syncRecurringTasks: Added new recurring task instances:', newTasksAdded.length);
    }
    console.log('[useTasks] syncRecurringTasks: Finished.');
  }, [userId, currentDate, createRecurringTaskInstance, viewMode, categoriesMap]);

  useEffect(() => {
    console.log('[useTasks] Effect: userId or authLoading changed. userId:', userId, 'authLoading:', authLoading);
    if (!authLoading && userId) {
      fetchDataAndSections();
    } else if (!authLoading && !userId) {
      console.log('[useTasks] Effect: Not authenticated, clearing tasks/sections.');
      setTasks([]);
      setSections([]);
      setAllCategories([]);
      setLoading(false);
    } else if (authLoading) {
      console.log('[useTasks] Effect: Auth loading, setting loading state.');
      setTasks([]);
      setSections([]);
      setAllCategories([]);
      setLoading(true);
    }
  }, [userId, authLoading, fetchDataAndSections]);

  useEffect(() => {
    console.log('[useTasks] Effect: userId, currentDate, or syncRecurringTasks changed. Triggering sync.');
    if (userId && viewMode === 'daily') {
      syncRecurringTasks();
    }
  }, [userId, currentDate, syncRecurringTasks, viewMode]);

  useEffect(() => {
    console.log('[useTasks] Effect: tasks or reminder functions changed. Updating reminders.');
    if (!userId) {
      console.log('[useTasks] No user, clearing all reminders.');
      clearAllReminders();
      return;
    }

    clearAllReminders(); // Clear all existing reminders to re-evaluate

    tasks.forEach(task => {
      if (task.remind_at && task.status === 'to-do') {
        const reminderTime = parseISO(task.remind_at);
        console.log(`[useTasks] Evaluating reminder for task ${task.id}: remind_at=${task.remind_at}, parsedDate=${reminderTime}, isValid=${isValid(reminderTime)}`);
        if (isValid(reminderTime) && reminderTime > new Date(new Date().getTime() - 60 * 1000)) { // Added isValid check
          console.log(`[useTasks] Adding reminder for task ${task.id}: "${task.description}" at ${reminderTime.toISOString()}`);
          addReminder(task.id, `Reminder: ${task.description}`, reminderTime);
        } else {
          console.log(`[useTasks] Not adding reminder for task ${task.id}: Invalid date or already past. Dismissing if exists.`);
          dismissReminder(task.id);
        }
      } else {
        console.log(`[useTasks] Task ${task.id} does not need reminder (no remind_at or not to-do). Dismissing if exists.`);
        dismissReminder(task.id);
      }
    });
  }, [userId, tasks, addReminder, dismissReminder, clearAllReminders]);

  const handleAddTask = useCallback(async (newTaskData: NewTaskData) => {
    console.log('[useTasks] handleAddTask: Called with data:', newTaskData);
    if (!userId) {
      showError('User not authenticated.');
      console.error('[useTasks] handleAddTask: User not authenticated.');
      return false;
    }
    let newTask: Task;
    try {
      const categoryColor = categoriesMap.get(newTaskData.category) || 'gray';
      console.log('[useTasks] handleAddTask: Category color resolved:', categoryColor);

      const targetSectionTasks = tasks.filter(t => t.parent_task_id === null && t.section_id === (newTaskData.section_id || null));
      const newOrder = targetSectionTasks.length;
      console.log('[useTasks] handleAddTask: New order for task:', newOrder);

      newTask = {
        id: uuidv4(),
        user_id: userId,
        created_at: (currentDate || new Date()).toISOString(),
        status: newTaskData.status || 'to-do',
        recurring_type: newTaskData.recurring_type || 'none',
        category: newTaskData.category,
        category_color: categoryColor,
        priority: newTaskData.priority || 'medium',
        due_date: newTaskData.due_date ? newTaskData.due_date.toISOString() : null,
        notes: newTaskData.notes || null,
        remind_at: newTaskData.remind_at ? newTaskData.remind_at.toISOString() : null,
        section_id: newTaskData.section_id || null,
        order: newOrder,
        original_task_id: null,
        parent_task_id: newTaskData.parent_task_id || null,
        description: newTaskData.description,
        link: newTaskData.link || null, // Include link
      };
      console.log('[useTasks] handleAddTask: New task object created for local state:', newTask);
      setTasks(prev => [...prev, newTask]);

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
        link: newTask.link, // Include link
      };
      console.log('[useTasks] handleAddTask: DB insert payload:', dbInsertPayload);

      const { data, error } = await supabase
        .from('tasks')
        .insert(dbInsertPayload)
        .select()
        .single();

      if (error) throw error;
      console.log('[useTasks] handleAddTask: DB insert successful. Returned data:', data);
      
      setTasks(prev => prev.map(t => t.id === data.id ? { ...data, category_color: categoriesMap.get(data.category) || 'gray' } : t));

      showSuccess('Task added successfully!');
      // Check if remind_at is a valid string before parsing and adding reminder
      if (newTask.remind_at && typeof newTask.remind_at === 'string') {
        const reminderDate = parseISO(newTask.remind_at);
        console.log(`[useTasks] handleAddTask: Checking reminder for new task. remind_at: ${newTask.remind_at}, parsedDate: ${reminderDate}, isValid: ${isValid(reminderDate)}`);
        if (isValid(reminderDate)) { // Ensure it's a valid date object
          addReminder(newTask.id, `Reminder: ${newTask.description}`, reminderDate);
        } else {
          console.error('[useTasks] handleAddTask: Invalid reminder date for new task, not adding reminder.');
        }
      }
      return true;
    } catch (error: any) {
      console.error('[useTasks] handleAddTask: Error adding task:', error);
      showError('Failed to add task.');
      setTasks(prev => prev.filter(task => task.id !== newTask.id)); // Revert local state
      return false;
    }
  }, [userId, currentDate, categoriesMap, tasks, addReminder]);

  const updateTask = useCallback(async (taskId: string, updates: TaskUpdate) => {
    console.log('[useTasks] updateTask: Called for task ID:', taskId, 'with updates:', updates);
    if (!userId) {
      showError('User not authenticated.');
      console.error('[useTasks] updateTask: User not authenticated.');
      return;
    }

    let updatedCategoryColor: string | undefined;
    if (updates.category) {
      updatedCategoryColor = categoriesMap.get(updates.category) || 'gray';
      console.log('[useTasks] updateTask: Category color resolved:', updatedCategoryColor);
    }

    setTasks(prevTasks => prevTasks.map(task =>
      task.id === taskId ? { ...task, ...updates, ...(updatedCategoryColor && { category_color: updatedCategoryColor }) } : task
    ));
    console.log('[useTasks] updateTask: Local state updated for task ID:', taskId);

    try {
      const dbUpdates = { ...updates };
      if ('category_color' in dbUpdates) {
        delete dbUpdates.category_color;
      }
      console.log('[useTasks] updateTask: DB update payload:', dbUpdates);

      const { error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', taskId)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      showSuccess('Task updated successfully!');
      console.log('[useTasks] updateTask: DB update successful for task ID:', taskId);

      const updatedTask = tasks.find(t => t.id === taskId);
      if (updatedTask) {
        console.log(`[useTasks] updateTask: Checking reminder for updated task ${updatedTask.id}. remind_at: ${updates.remind_at}, status: ${updates.status}`);
        // Check if remind_at is a valid string before parsing and adding reminder
        if (updates.remind_at && typeof updates.remind_at === 'string') {
          const reminderDate = parseISO(updates.remind_at);
          console.log(`[useTasks] updateTask: Parsed reminder date: ${reminderDate}, isValid: ${isValid(reminderDate)}`);
          if (isValid(reminderDate) && updatedTask.status === 'to-do') { // Ensure it's a valid date object and task is 'to-do'
            addReminder(updatedTask.id, `Reminder: ${updatedTask.description}`, reminderDate);
            console.log(`[useTasks] updateTask: Reminder added/updated for task ${updatedTask.id}.`);
          } else {
            console.log(`[useTasks] updateTask: Invalid reminder date or status not 'to-do'. Dismissing reminder for task ${updatedTask.id}.`);
            dismissReminder(updatedTask.id);
          }
        } else if (updates.status === 'completed' || updates.status === 'archived' || updates.remind_at === null) {
          console.log(`[useTasks] updateTask: Status is completed/archived or remind_at is null. Dismissing reminder for task ${updatedTask.id}.`);
          dismissReminder(updatedTask.id);
        }
      }

    } catch (error: any) {
      console.error('[useTasks] updateTask: Error updating task:', error);
      showError('Failed to update task.');
    }
  }, [userId, categoriesMap, tasks, addReminder, dismissReminder]);

  const deleteTask = useCallback(async (taskId: string) => {
    console.log('[useTasks] deleteTask: Called for task ID:', taskId);
    if (!userId) {
      showError('User not authenticated.');
      console.error('[useTasks] deleteTask: User not authenticated.');
      return;
    }
    let taskToDelete: Task | undefined;
    try {
      taskToDelete = tasks.find(t => t.id === taskId);
      if (!taskToDelete) {
        console.warn('[useTasks] deleteTask: Task not found in local state:', taskId);
        return;
      }

      let idsToDelete = [taskId];
      const subtaskIds = tasks.filter(t => t.parent_task_id === taskId).map(t => t.id);
      idsToDelete = [...idsToDelete, ...subtaskIds];
      console.log('[useTasks] deleteTask: IDs to delete (including subtasks):', idsToDelete);

      if (taskToDelete.recurring_type !== 'none' && taskToDelete.original_task_id === null) {
        const recurringInstanceIds = tasks.filter(t => t.original_task_id === taskId).map(t => t.id);
        idsToDelete = [...idsToDelete, ...recurringInstanceIds];
        console.log('[useTasks] deleteTask: Also deleting recurring instances:', recurringInstanceIds);
      }

      setTasks(prev => prev.filter(task => !idsToDelete.includes(task.id)));
      console.log('[useTasks] deleteTask: Local state updated, tasks filtered out.');

      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', idsToDelete)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Task(s) deleted successfully!');
      console.log('[useTasks] deleteTask: DB delete successful.');
      idsToDelete.forEach(id => dismissReminder(id));
    }
    catch (error: any) {
      console.error('[useTasks] deleteTask: Error deleting task:', error);
      showError('Failed to delete task.');
    }
  }, [userId, tasks, dismissReminder]);

  const toggleTaskSelection = useCallback((taskId: string, checked: boolean) => {
    console.log('[useTasks] toggleTaskSelection: Task ID:', taskId, 'Checked:', checked);
    setSelectedTaskIds(prev =>
      checked ? [...prev, taskId] : prev.filter(id => id !== taskId)
    );
  }, []);

  const clearSelectedTasks = useCallback(() => {
    console.log('[useTasks] clearSelectedTasks: Clearing selected tasks.');
    setSelectedTaskIds([]);
  }, []);

  const bulkUpdateTasks = useCallback(async (updates: Partial<Task>, ids: string[] = selectedTaskIds) => {
    console.log('[useTasks] bulkUpdateTasks: Called with updates:', updates, 'for IDs:', ids);
    if (!userId) {
      showError('User not authenticated.');
      console.error('[useTasks] bulkUpdateTasks: User not authenticated.');
      return;
    }
    if (ids.length === 0) {
      console.log('[useTasks] bulkUpdateTasks: No IDs to update.');
      return;
    }

    let updatedCategoryColor: string | undefined;
    if (updates.category) {
      updatedCategoryColor = categoriesMap.get(updates.category) || 'gray';
      console.log('[useTasks] bulkUpdateTasks: Category color resolved:', updatedCategoryColor);
    }

    setTasks(prev => prev.map(task => 
      ids.includes(task.id) ? { ...task, ...updates, ...(updatedCategoryColor && { category_color: updatedCategoryColor }) } : task
    ));
    console.log('[useTasks] bulkUpdateTasks: Local state updated for selected tasks.');

    try {
      const dbUpdates = { ...updates };
      if ('category_color' in dbUpdates) {
        delete dbUpdates.category_color;
      }
      console.log('[useTasks] bulkUpdateTasks: DB update payload:', dbUpdates);

      const { data, error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .in('id', ids)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      showSuccess(`${ids.length} tasks updated successfully!`);
      console.log('[useTasks] bulkUpdateTasks: DB update successful.');
      clearSelectedTasks();
      
      ids.forEach(id => {
        const updatedTask = tasks.find(t => t.id === id);
        if (updatedTask) {
          console.log(`[useTasks] bulkUpdateTasks: Checking reminder for task ${updatedTask.id}. remind_at: ${updatedTask.remind_at}, status: ${updatedTask.status}`);
          if (updates.status === 'completed' || updates.status === 'archived' || updates.remind_at === null) {
            console.log(`[useTasks] bulkUpdateTasks: Status is completed/archived or remind_at is null. Dismissing reminder for task ${updatedTask.id}.`);
            dismissReminder(updatedTask.id);
          } else if (updatedTask.remind_at && typeof updatedTask.remind_at === 'string') { // Added type check
            const reminderDate = parseISO(updatedTask.remind_at);
            console.log(`[useTasks] bulkUpdateTasks: Parsed reminder date: ${reminderDate}, isValid: ${isValid(reminderDate)}`);
            if (isValid(reminderDate)) { // Added isValid check
              addReminder(updatedTask.id, `Reminder: ${updatedTask.description}`, reminderDate);
              console.log(`[useTasks] bulkUpdateTasks: Reminder added/updated for task ${updatedTask.id}.`);
            } else {
              console.error(`[useTasks] bulkUpdateTasks: Invalid reminder date for task ${updatedTask.id}, not adding reminder.`);
            }
          }
        }
      });

    } catch (error: any) {
      console.error('[useTasks] bulkUpdateTasks: Error bulk updating tasks:', error);
      showError('Failed to update tasks in bulk.');
    }
  }, [userId, selectedTaskIds, clearSelectedTasks, categoriesMap, tasks, addReminder, dismissReminder]);

  const markAllTasksInSectionCompleted = useCallback(async (sectionId: string | null) => {
    console.log('[useTasks] markAllTasksInSectionCompleted: Called for section ID:', sectionId);
    if (!userId) {
      showError('User not authenticated.');
      console.error('[useTasks] markAllTasksInSectionCompleted: User not authenticated.');
      return;
    }

    const taskIdsToComplete = tasks
      .filter(task => task.section_id === sectionId && task.status !== 'completed')
      .map(task => task.id);
    console.log('[useTasks] markAllTasksInSectionCompleted: Task IDs to complete:', taskIdsToComplete);

    if (taskIdsToComplete.length === 0) {
      showSuccess('No incomplete tasks found in this section.');
      console.log('[useTasks] markAllTasksInSectionCompleted: No incomplete tasks.');
      return;
    }

    try {
      setTasks(prev => prev.map(task => 
        taskIdsToComplete.includes(task.id) ? { ...task, status: 'completed' } : task
      ));
      console.log('[useTasks] markAllTasksInSectionCompleted: Local state updated.');

      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .in('id', taskIdsToComplete)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess(`${taskIdsToComplete.length} tasks in section marked as completed!`);
      console.log('[useTasks] markAllTasksInSectionCompleted: DB update successful.');
      taskIdsToComplete.forEach(id => dismissReminder(id));
    } catch (error: any) {
      console.error('[useTasks] markAllTasksInSectionCompleted: Error marking all tasks in section as completed:', error);
      showError('Failed to mark tasks as completed.');
    }
  }, [userId, tasks, dismissReminder]);

  const createSection = useCallback(async (name: string) => {
    console.log('[useTasks] createSection: Called with name:', name);
    if (!userId) {
      showError('User not authenticated.');
      console.error('[useTasks] createSection: User not authenticated.');
      return;
    }
    try {
      const newOrder = sections.length;
      console.log('[useTasks] createSection: New section order:', newOrder);

      const { data, error } = await supabase
        .from('task_sections')
        .insert({ name, user_id: userId, order: newOrder, include_in_focus_mode: true })
        .select()
        .single();

      if (error) throw error;
      setSections(prev => [...prev, data]);
      showSuccess('Section created successfully!');
      console.log('[useTasks] createSection: Section created:', data);
    } catch (error: any) {
      console.error('[useTasks] createSection: Error creating section:', error);
      showError('Failed to create section.');
    }
  }, [userId, sections.length]);

  const updateSection = useCallback(async (sectionId: string, newName: string) => {
    console.log('[useTasks] updateSection: Called for section ID:', sectionId, 'newName:', newName);
    if (!userId) {
      showError('User not authenticated.');
      console.error('[useTasks] updateSection: User not authenticated.');
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
      console.log('[useTasks] updateSection: Section updated:', data);
    }
    catch (error: any) {
      console.error('[useTasks] updateSection: Error updating section:', error);
      showError('Failed to update section.');
    }
  }, [userId]);

  const updateSectionIncludeInFocusMode = useCallback(async (sectionId: string, include: boolean) => {
    console.log('[useTasks] updateSectionIncludeInFocusMode: Called for section ID:', sectionId, 'include:', include);
    if (!userId) {
      showError('User not authenticated.');
      console.error('[useTasks] updateSectionIncludeInFocusMode: User not authenticated.');
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
      console.log('[useTasks] updateSectionIncludeInFocusMode: Section focus mode updated for ID:', sectionId);
    } catch (error: any) {
      console.error('[useTasks] updateSectionIncludeInFocusMode: Error updating section focus mode setting:', error);
      showError('Failed to update section focus mode setting.');
    }
  }, [userId, sections]);

  const deleteSection = useCallback(async (sectionId: string) => {
    console.log('[useTasks] deleteSection: Called for section ID:', sectionId);
    if (!userId) {
      showError('User not authenticated.');
      console.error('[useTasks] deleteSection: User not authenticated.');
      return;
    }
    try {
      console.log('[useTasks] deleteSection: Moving tasks from section to null.');
      await supabase
        .from('tasks')
        .update({ section_id: null })
        .eq('section_id', sectionId)
        .eq('user_id', userId);

      console.log('[useTasks] deleteSection: Deleting section from DB.');
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
      console.log('[useTasks] deleteSection: Section deleted and local state updated.');
    }
    catch (error: any) {
      showError('Failed to delete section.');
      console.error('[useTasks] deleteSection: Error deleting section:', error);
    }
  }, [userId]);

  const reorderTasksInSameSection = useCallback(async (sectionId: string | null, activeId: string, overId: string) => {
    console.log('[useTasks] reorderTasksInSameSection: sectionId:', sectionId, 'activeId:', activeId, 'overId:', overId);
    if (!userId) {
      showError('User not authenticated.');
      console.error('[useTasks] reorderTasksInSameSection: User not authenticated.');
      return;
    }

    const originalTasks = [...tasks];

    const tasksInCurrentSection = tasks.filter(t => t.parent_task_id === null && t.section_id === sectionId)
                                      .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));
    const activeIndex = tasksInCurrentSection.findIndex(t => t.id === activeId);
    const overIndex = tasksInCurrentSection.findIndex(t => t.id === overId);

    if (activeIndex === -1 || overIndex === -1) {
      console.warn('[useTasks] reorderTasksInSameSection: Active or over task not found in section.');
      return;
    }

    const newOrderedTasksInSection = arrayMove(tasksInCurrentSection, activeIndex, overIndex);
    console.log('[useTasks] reorderTasksInSameSection: New ordered tasks in section (local):', newOrderedTasksInSection.map(t => ({id: t.id, order: t.order})));

    const updates = newOrderedTasksInSection.map((task, index) => ({
      id: task.id,
      description: task.description,
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
      link: task.link, // Include link
      order: index,
      user_id: userId,
    }));
    console.log('[useTasks] reorderTasksInSameSection: DB update payload:', updates.map(u => ({id: u.id, order: u.order})));

    setTasks(prevTasks => {
      const updatedTasksMap = new Map(updates.map(u => [u.id, u]));
      const newTasksState = prevTasks.map(task => {
        if (updatedTasksMap.has(task.id)) {
          return { ...task, ...updatedTasksMap.get(task.id) };
        }
        return task;
      });
      const finalSortedState = newTasksState.sort((a, b) => {
        const aSectionOrder = sections.find(s => s.id === a.section_id)?.order ?? Infinity;
        const bSectionOrder = sections.find(s => s.id === b.section_id)?.order ?? Infinity;
        if (aSectionOrder !== bSectionOrder) return aSectionOrder - bSectionOrder;
        return (a.order || Infinity) - (b.order || Infinity);
      });
      console.log('[useTasks] reorderTasksInSameSection: Final local tasks state after reorder:', finalSortedState.map(t => ({id: t.id, order: t.order, section_id: t.section_id})));
      return finalSortedState;
    });

    try {
      const { error } = await supabase
        .from('tasks')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        throw error;
      }
      showSuccess('Task reordered successfully!');
      console.log('[useTasks] reorderTasksInSameSection: DB upsert successful.');
    }
    catch (error: any) {
      console.error('[useTasks] reorderTasksInSameSection: Error reordering tasks:', error);
      showError('Failed to reorder task.');
      setTasks(originalTasks); // Revert local state on error
    }
  }, [userId, sections, tasks]);

  const moveTaskToNewSection = useCallback(async (activeId: string, oldSectionId: string | null, newSectionId: string | null, overId: string | null) => {
    console.log('[useTasks] moveTaskToNewSection: activeId:', activeId, 'oldSectionId:', oldSectionId, 'newSectionId:', newSectionId, 'overId:', overId);
    if (!userId) {
      showError('User not authenticated.');
      console.error('[useTasks] moveTaskToNewSection: User not authenticated.');
      return;
    }

    const originalTasks = [...tasks];

    let taskToMove: Task | undefined;
    const tasksInOldSection = tasks.filter(t => t.section_id === oldSectionId && t.parent_task_id === null)
                                   .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));
    const tasksInNewSection = tasks.filter(t => t.section_id === newSectionId && t.parent_task_id === null)
                                   .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));

    taskToMove = tasks.find(t => t.id === activeId);
    if (!taskToMove) {
      console.warn('[useTasks] moveTaskToNewSection: Task to move not found.');
      return;
    }

    const oldSectionTasksAfterRemoval = tasksInOldSection.filter(t => t.id !== activeId);
    const updatesForOldSection = oldSectionTasksAfterRemoval.map((task, index) => ({
      id: task.id,
      description: task.description,
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
      link: task.link, // Include link
      order: index,
      user_id: userId,
    }));
    console.log('[useTasks] moveTaskToNewSection: Updates for old section:', updatesForOldSection.map(u => ({id: u.id, order: u.order})));

    let newSectionTasksWithMoved = [...tasksInNewSection];
    if (overId) {
      const overIndex = newSectionTasksWithMoved.findIndex(t => t.id === overId);
      if (overIndex !== -1) {
        newSectionTasksWithMoved.splice(overIndex, 0, { ...taskToMove, section_id: newSectionId });
        console.log('[useTasks] moveTaskToNewSection: Inserted into new section at specific index.');
      } else {
        newSectionTasksWithMoved.push({ ...taskToMove, section_id: newSectionId });
        console.log('[useTasks] moveTaskToNewSection: Appended to new section (overId not found).');
      }
    } else {
      newSectionTasksWithMoved.push({ ...taskToMove, section_id: newSectionId });
      console.log('[useTasks] moveTaskToNewSection: Appended to new section (no overId).');
    }

    const updatesForNewSection = newSectionTasksWithMoved.map((task, index) => ({
      id: task.id,
      description: task.description,
      status: task.status,
      recurring_type: task.recurring_type,
      created_at: task.created_at,
      category: task.category,
      priority: task.priority,
      due_date: task.due_date,
      notes: task.notes,
      remind_at: task.remind_at,
      section_id: newSectionId,
      parent_task_id: task.parent_task_id,
      link: task.link, // Include link
      order: index,
      user_id: userId,
    }));
    console.log('[useTasks] moveTaskToNewSection: Updates for new section:', updatesForNewSection.map(u => ({id: u.id, order: u.order, section_id: u.section_id})));

    const allUpdatesForDb = [
      ...updatesForOldSection,
      ...updatesForNewSection,
    ];
    console.log('[useTasks] moveTaskToNewSection: All updates for DB:', allUpdatesForDb.map(u => ({id: u.id, order: u.order, section_id: u.section_id})));

    setTasks(prevTasks => {
      const updatedTasksMap = new Map(allUpdatesForDb.map(u => [u.id, u]));
      const newTasksState = prevTasks.map(task => {
        if (updatedTasksMap.has(task.id)) {
          return { ...task, ...updatedTasksMap.get(task.id) };
        }
        return task;
      });
      const finalSortedState = newTasksState.sort((a, b) => {
        const aSectionOrder = sections.find(s => s.id === a.section_id)?.order ?? Infinity;
        const bSectionOrder = sections.find(s => s.id === b.section_id)?.order ?? Infinity;
        if (aSectionOrder !== bSectionOrder) return aSectionOrder - bSectionOrder;
        return (a.order || Infinity) - (b.order || Infinity);
      });
      console.log('[useTasks] moveTaskToNewSection: Final local tasks state after move:', finalSortedState.map(t => ({id: t.id, order: t.order, section_id: t.section_id})));
      return finalSortedState;
    });

    try {
      const { error } = await supabase
        .from('tasks')
        .upsert(allUpdatesForDb, { onConflict: 'id' });

      if (error) {
        throw error;
      }
      showSuccess('Task moved successfully!');
      console.log('[useTasks] moveTaskToNewSection: DB upsert successful.');
    }
    catch (error: any) {
      console.error('[useTasks] moveTaskToNewSection: Error moving task:', error);
      showError('Failed to move task.');
      setTasks(originalTasks); // Revert local state on error
    }
  }, [userId, sections, tasks]);

  const reorderSections = useCallback(async (activeId: string, overId: string) => {
    console.log('[useTasks] reorderSections: activeId:', activeId, 'overId:', overId);
    if (!userId) {
      showError('User not authenticated.');
      console.error('[useTasks] reorderSections: User not authenticated.');
      return;
    }

    const originalSections = [...sections];

    const activeIndex = sections.findIndex(s => s.id === activeId);
    const overIndex = sections.findIndex(s => s.id === overId);

    if (activeIndex === -1 || overIndex === -1) {
      console.warn('[useTasks] reorderSections: Active or over section not found.');
      return;
    }

    const newOrderedSections = arrayMove(sections, activeIndex, overIndex);
    console.log('[useTasks] reorderSections: New ordered sections (local):', newOrderedSections.map(s => ({id: s.id, order: s.order})));

    const updates = newOrderedSections.map((section, index) => ({
      id: section.id,
      name: section.name,
      user_id: userId,
      include_in_focus_mode: section.include_in_focus_mode,
      order: index,
    }));
    console.log('[useTasks] reorderSections: DB update payload:', updates.map(u => ({id: u.id, order: u.order})));

    setSections(prevSections => {
      const updatedSectionsMap = new Map(updates.map(u => [u.id, u.order]));
      const finalSortedState = prevSections.map(section => {
        if (updatedSectionsMap.has(section.id)) {
          return { ...section, order: updatedSectionsMap.get(section.id) };
        }
        return section;
      }).sort((a, b) => (a.order || Infinity) - (b.order || Infinity));
      console.log('[useTasks] reorderSections: Final local sections state after reorder:', finalSortedState.map(s => ({id: s.id, order: s.order})));
      return finalSortedState;
    });

    try {
      const { error } = await supabase
        .from('task_sections')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        throw error;
      }
      showSuccess('Sections reordered successfully!');
      console.log('[useTasks] reorderSections: DB upsert successful.');
    }
    catch (error: any) {
      console.error('[useTasks] reorderSections: Error reordering sections:', error);
      showError('Failed to reorder sections.');
      setSections(originalSections); // Revert local state on error
    }
  }, [userId, sections]);

  const moveTask = useCallback(async (taskId: string, direction: 'up' | 'down') => {
    console.log('[useTasks] moveTask: Called for task ID:', taskId, 'direction:', direction);
    if (!userId) {
      showError('User not authenticated.');
      console.error('[useTasks] moveTask: User not authenticated.');
      return;
    }

    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove) {
      showError('Task not found.');
      console.warn('[useTasks] moveTask: Task not found in local state:', taskId);
      return;
    }
    if (taskToMove.parent_task_id !== null) {
      showError('Cannot reorder sub-tasks directly.');
      console.warn('[useTasks] moveTask: Attempted to reorder a sub-task.');
      return;
    }

    const currentSectionId = taskToMove.section_id;

    const tasksInCurrentSection = tasks
      .filter(t => t.section_id === currentSectionId && t.parent_task_id === null)
      .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));
    console.log('[useTasks] moveTask: Tasks in current section:', tasksInCurrentSection.map(t => ({id: t.id, order: t.order})));

    const currentIndex = tasksInCurrentSection.findIndex(t => t.id === taskId);
    
    if (currentIndex === -1) {
      showError('Internal error: Task not found in section list.');
      console.error('[useTasks] moveTask: Task not found in filtered section list, this should not happen.');
      return;
    }

    let newIndex = currentIndex;
    if (direction === 'up') {
      if (currentIndex === 0) {
        showError('Task is already at the top.');
        console.log('[useTasks] moveTask: Task already at top.');
        return;
      }
      newIndex = currentIndex - 1;
    } else { // direction === 'down'
      if (currentIndex === tasksInCurrentSection.length - 1) {
        showError('Task is already at the bottom.');
        console.log('[useTasks] moveTask: Task already at bottom.');
        return;
      }
      newIndex = currentIndex + 1;
    }
    console.log(`[useTasks] moveTask: Moving from index ${currentIndex} to ${newIndex}.`);

    const newOrderedTasksInSection = arrayMove(tasksInCurrentSection, currentIndex, newIndex);
    console.log('[useTasks] moveTask: New ordered tasks in section (local):', newOrderedTasksInSection.map(t => ({id: t.id, order: t.order})));

    const updates = newOrderedTasksInSection.map((task, index) => ({
      id: task.id,
      description: task.description,
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
      link: task.link, // Include link
      order: index,
      user_id: userId,
    }));
    console.log('[useTasks] moveTask: DB update payload:', updates.map(u => ({id: u.id, order: u.order})));

    setTasks(prevTasks => {
      const updatedTasksMap = new Map(updates.map(u => [u.id, u]));
      const newTasksState = prevTasks.map(task => {
        if (updatedTasksMap.has(task.id)) {
          return { ...task, ...updatedTasksMap.get(task.id) };
        }
        return task;
      });
      const finalSortedState = newTasksState.sort((a, b) => {
        const aSectionOrder = sections.find(s => s.id === a.section_id)?.order ?? Infinity;
        const bSectionOrder = sections.find(s => s.id === b.section_id)?.order ?? Infinity;
        if (aSectionOrder !== bSectionOrder) return aSectionOrder - bSectionOrder;
        return (a.order || Infinity) - (b.order || Infinity);
      });
      console.log('[useTasks] moveTask: Final local tasks state after move:', finalSortedState.map(t => ({id: t.id, order: t.order, section_id: t.section_id})));
      return finalSortedState;
    });

    try {
      const { error } = await supabase
        .from('tasks')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        throw error;
      }
      showSuccess('Task reordered successfully!');
      console.log('[useTasks] moveTask: DB upsert successful.');
    } catch (error: any) {
      console.error('[useTasks] moveTask: Error reordering task:', error);
      showError('Failed to reorder task.');
    }
  }, [userId, sections, tasks]);

  const { finalFilteredTasks, nextAvailableTask } = useMemo(() => {
    console.log('[useTasks] useMemo: Recalculating filtered tasks and next available task.');
    
    let relevantTasks: Task[] = [];
    const focusModeSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));
    console.log('[useTasks] useMemo: Focus mode sections:', Array.from(focusModeSectionIds));

    if (viewMode === 'archive') {
      relevantTasks = tasks.filter(task => task.status === 'archived');
      console.log('[useTasks] useMemo: View mode is archive. Relevant tasks count:', relevantTasks.length);
    } else if (viewMode === 'focus') {
      relevantTasks = tasks.filter(task => 
        (task.section_id === null || focusModeSectionIds.has(task.section_id)) &&
        task.status === 'to-do' &&
        task.parent_task_id === null
      );
      console.log('[useTasks] useMemo: View mode is focus. Relevant tasks count:', relevantTasks.length);
    }
    else {
      const effectiveCurrentDateUTC = currentDate ? getUTCStartOfDay(currentDate) : getUTCStartOfDay(new Date());
      const processedOriginalIds = new Set<string>();
      console.log('[useTasks] useMemo: View mode is daily. Effective current date:', effectiveCurrentDateUTC.toISOString());

      const topLevelTasks = tasks.filter(task => task.parent_task_id === null);
      console.log('[useTasks] useMemo: Top level tasks count:', topLevelTasks.length);

      topLevelTasks.forEach(task => {
        const originalId = task.original_task_id || task.id;

        if (processedOriginalIds.has(originalId)) {
            return;
        }

        if (task.recurring_type !== 'none') {
            const allInstancesOfThisRecurringTask = tasks.filter(t =>
                t.original_task_id === originalId || t.id === originalId
            );
            console.log(`[useTasks] useMemo: Processing recurring task ${task.id}. Instances found: ${allInstancesOfThisRecurringTask.length}`);

            let taskToDisplay: Task | null = null;

            const instanceForCurrentDay = allInstancesOfThisRecurringTask.find(t =>
                isSameDay(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status !== 'archived'
            );

            if (instanceForCurrentDay) {
                taskToDisplay = instanceForCurrentDay;
                console.log('[useTasks] useMemo: Found instance for current day.');
            } else {
                const carryOverTask = allInstancesOfThisRecurringTask
                    .filter(t => isBefore(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status === 'to-do')
                    .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())[0];

                if (carryOverTask) {
                    taskToDisplay = carryOverTask;
                    console.log('[useTasks] useMemo: Found carry-over task.');
                }
            }

            if (taskToDisplay) {
                relevantTasks.push(taskToDisplay);
                processedOriginalIds.add(originalId);
            }
        } else {
            const taskCreatedAtUTC = getUTCStartOfDay(parseISO(task.created_at));
            const isTaskCreatedOnCurrentDate = isSameDay(taskCreatedAtUTC, effectiveCurrentDateUTC);
            console.log(`[useTasks] useMemo: Processing non-recurring task ${task.id}. Created at: ${taskCreatedAtUTC.toISOString()}, Is created today: ${isTaskCreatedOnCurrentDate}`);

            if (isTaskCreatedOnCurrentDate && task.status !== 'archived') {
                relevantTasks.push(task);
            } else if (isBefore(taskCreatedAtUTC, effectiveCurrentDateUTC) && task.status === 'to-do') {
                relevantTasks.push(task);
            }
        }
      });
      console.log('[useTasks] useMemo: Daily view relevant tasks count:', relevantTasks.length);
    }

    let currentViewFilteredTasks = relevantTasks;
    console.log('[useTasks] useMemo: Applying filters...');

    if (viewMode === 'daily') {
      if (statusFilter !== 'all') {
        currentViewFilteredTasks = currentViewFilteredTasks.filter(task => task.status === statusFilter);
        console.log('[useTasks] useMemo: After status filter:', currentViewFilteredTasks.length);
      } else {
        currentViewFilteredTasks = currentViewFilteredTasks.filter(task => task.status !== 'archived');
        console.log('[useTasks] useMemo: After default (non-archived) filter:', currentViewFilteredTasks.length);
      }
      if (searchFilter) {
        currentViewFilteredTasks = currentViewFilteredTasks.filter(task =>
          task.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
          task.notes?.toLowerCase().includes(searchFilter.toLowerCase())
        );
        console.log('[useTasks] useMemo: After search filter:', currentViewFilteredTasks.length);
      }
      if (categoryFilter && categoryFilter !== 'all') {
        currentViewFilteredTasks = currentViewFilteredTasks.filter(task => task.category === categoryFilter);
        console.log('[useTasks] useMemo: After category filter:', currentViewFilteredTasks.length);
      }
      if (priorityFilter && priorityFilter !== 'all') {
        currentViewFilteredTasks = currentViewFilteredTasks.filter(task => task.priority === priorityFilter);
        console.log('[useTasks] useMemo: After priority filter:', currentViewFilteredTasks.length);
      }
      if (sectionFilter && sectionFilter !== 'all') {
        currentViewFilteredTasks = currentViewFilteredTasks.filter(task => {
          if (sectionFilter === 'no-section') {
            return task.section_id === null;
          }
          return task.section_id === sectionFilter;
        });
        console.log('[useTasks] useMemo: After section filter:', currentViewFilteredTasks.length);
      }
    }

    console.log('[useTasks] useMemo: Sorting filtered tasks...');
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
    console.log('[useTasks] useMemo: Final sorted filtered tasks (first 5):', currentViewFilteredTasks.slice(0,5).map(t => ({id: t.id, description: t.description, status: t.status, section_id: t.section_id, order: t.order})));


    let nextAvailableTask: Task | null = null;
    if (viewMode === 'daily' || viewMode === 'focus') {
      nextAvailableTask = currentViewFilteredTasks.find(task => 
        task.status === 'to-do' && task.parent_task_id === null
      ) || null;
      console.log('[useTasks] useMemo: Next available task:', nextAvailableTask?.id || 'None');
    }

    return { 
      finalFilteredTasks: currentViewFilteredTasks, 
      nextAvailableTask, 
    };
  }, [tasks, sections, viewMode, currentDate, statusFilter, searchFilter, categoryFilter, priorityFilter, sectionFilter]);

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
    moveTask,
    fetchDataAndSections,
    allCategories,
  };
};