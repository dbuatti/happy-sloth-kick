import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { useReminders } from '@/context/ReminderContext';
import { v4 as uuidv4 } from 'uuid';
import { isSameDay, isPast, startOfDay as fnsStartOfDay, parseISO, format, isAfter, isBefore, addDays, addWeeks, addMonths, isValid } from 'date-fns';
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
  link: string | null;
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
  due_date?: string | null; // Changed from Date | null to string | null
  notes?: string | null;
  remind_at?: string | null; // Changed from Date | null to string | null
  section_id?: string | null;
  parent_task_id?: string | null;
  link?: string | null;
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

  // Declaring filter state variables
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
      }
      
      setAllCategories(fetchedCategories);
      const newCategoriesMap = new Map<string, string>();
      fetchedCategories.forEach(cat => newCategoriesMap.set(cat.id, cat.color));
      setCategoriesMap(newCategoriesMap);

      const { data: initialTasksFromDB, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

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
              link: task.link,
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

      // Send updates to DB if any orders were changed
      if (updatesForDb.length > 0) {
        const { error: upsertError } = await supabase
          .from('tasks')
          .upsert(updatesForDb, { onConflict: 'id' });
        if (upsertError) {
          console.error('useTasks: Error normalizing task orders in DB:', upsertError);
          showError('Failed to synchronize task orders.');
        }
      }
      
    } catch (error: any) {
      console.error('Error in fetchDataAndSections:', error);
      showError('An unexpected error occurred while loading data.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createRecurringTaskInstance = useCallback(async (templateTask: Task, targetDate: Date, rootOriginalTaskId: string, currentTasks: Task[]): Promise<Task | null> => {
    if (templateTask.recurring_type === 'none' || !userId) return null;

    const targetDateUTC = getUTCStartOfDay(targetDate);

    const existingInstance = currentTasks.find(t =>
      (t.original_task_id === rootOriginalTaskId || t.id === rootOriginalTaskId) &&
      isSameDay(getUTCStartOfDay(parseISO(t.created_at)), targetDateUTC) &&
      t.status !== 'archived'
    );

    if (existingInstance) {
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
      link: templateTask.link,
    };

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
    return { ...data, category_color: categoriesMap.get(data.category) || 'gray' };
  }, [userId, categoriesMap]);

  const syncRecurringTasks = useCallback(async () => {
    if (viewMode !== 'daily' || !userId) {
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

    const originalRecurringTasks = currentTasks.filter(t => t.recurring_type !== 'none' && t.original_task_id === null);

    for (const originalTask of originalRecurringTasks) {
        const originalTaskCreatedAtUTC = getUTCStartOfDay(parseISO(originalTask.created_at));

        const allInstancesOfThisRecurringTask = currentTasks.filter(t =>
            t.original_task_id === originalTask.id || t.id === originalTask.id
        );

        const sortedInstances = [...allInstancesOfThisRecurringTask]
            .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime());

        const latestRelevantInstance = sortedInstances.find(t => t.status !== 'archived') || originalTask;

        const instanceForCurrentDay = allInstancesOfThisRecurringTask.find(t =>
            isSameDay(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status !== 'archived'
        );

        if (instanceForCurrentDay) {
            continue;
        }

        let shouldCreateNewInstance = false;
        if (isSameDay(originalTaskCreatedAtUTC, effectiveCurrentDateUTC)) {
            shouldCreateNewInstance = true;
        } else if (isBefore(originalTaskCreatedAtUTC, effectiveCurrentDateUTC)) {
            const latestPreviousInstance = allInstancesOfThisRecurringTask
                .filter(t => isBefore(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status === 'to-do')
                .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())[0];

                // If there's a previous 'to-do' instance, we don't create a new one for today.
                // We only create a new instance if the latest previous instance was completed/skipped,
                // or if there are no previous instances at all (meaning it's the first time this recurring task is due).
                if (latestPreviousInstance) {
                    if (latestPreviousInstance.status === 'completed' || latestPreviousInstance.status === 'skipped') {
                        shouldCreateNewInstance = true;
                    }
                } else {
                    // If no previous instance exists, and the original task was created before today,
                    // then we should create an instance for today.
                    shouldCreateNewInstance = true;
                    console.warn(`syncRecurringTasks: No previous instance found for "${originalTask.description}" before ${format(effectiveCurrentDateUTC, 'yyyy-MM-dd')}. Creating an instance for today.`);
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
    }
  }, [userId, currentDate, createRecurringTaskInstance, viewMode, categoriesMap]);

  useEffect(() => {
    if (!authLoading && userId) {
      fetchDataAndSections();
    } else if (!authLoading && !userId) {
      setTasks([]);
      setSections([]);
      setAllCategories([]);
      setLoading(false);
    } else if (authLoading) {
      setTasks([]);
      setSections([]);
      setAllCategories([]);
      setLoading(true);
    }
  }, [userId, authLoading, fetchDataAndSections]);

  useEffect(() => {
    if (userId && viewMode === 'daily') {
      syncRecurringTasks();
    }
  }, [userId, currentDate, syncRecurringTasks, viewMode]);

  useEffect(() => {
    if (!userId) return;

    tasks.forEach(task => {
      if (task.remind_at && task.status === 'to-do') {
        const reminderTime = parseISO(task.remind_at);
        if (isValid(reminderTime) && reminderTime > new Date(new Date().getTime() - 60 * 1000)) {
          addReminder(task.id, `Reminder: ${task.description}`, reminderTime);
        }
      } else {
        dismissReminder(task.id);
      }
    });
  }, [userId, tasks, addReminder, dismissReminder]);

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

      newTask = {
        id: uuidv4(),
        user_id: userId,
        created_at: (currentDate || new Date()).toISOString(),
        status: newTaskData.status || 'to-do',
        recurring_type: newTaskData.recurring_type || 'none',
        category: newTaskData.category,
        category_color: categoryColor,
        priority: newTaskData.priority || 'medium',
        due_date: newTaskData.due_date,
        notes: newTaskData.notes || null,
        remind_at: newTaskData.remind_at,
        section_id: newTaskData.section_id || null,
        order: newOrder,
        original_task_id: null,
        parent_task_id: newTaskData.parent_task_id || null,
        description: newTaskData.description,
        link: newTaskData.link || null,
      };
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
        link: newTask.link,
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(dbInsertPayload)
        .select()
        .single();

      if (error) throw error;
      
      setTasks(prev => prev.map(t => t.id === data.id ? { ...data, category_color: categoriesMap.get(data.category) || 'gray' } : t));

      showSuccess('Task added successfully!');
      if (newTask.remind_at && typeof newTask.remind_at === 'string') {
        const reminderDate = parseISO(newTask.remind_at);
        if (isValid(reminderDate)) {
          addReminder(newTask.id, `Reminder: ${newTask.description}`, reminderDate);
        }
      }
      return true;
    } catch (error: any) {
      console.error('Error adding task:', error);
      showError('Failed to add task.');
      setTasks(prev => prev.filter(task => task.id !== newTask.id));
      return false;
    }
  }, [userId, currentDate, categoriesMap, tasks, addReminder]);

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
      const dbUpdates = { ...updates };
      if ('category_color' in dbUpdates) {
        delete dbUpdates.category_color;
      }

      const { error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', taskId)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      showSuccess('Task updated successfully!');

      const updatedTask = tasks.find(t => t.id === taskId);
      if (updatedTask) {
        if (updates.remind_at && typeof updates.remind_at === 'string') {
          const reminderDate = parseISO(updates.remind_at);
          if (isValid(reminderDate) && updatedTask.status === 'to-do') {
            addReminder(updatedTask.id, `Reminder: ${updatedTask.description}`, reminderDate);
          }
        } else if (updates.status === 'completed' || updates.status === 'archived' || updates.remind_at === null) {
          dismissReminder(updatedTask.id);
        }
      }

    } catch (error: any) {
      console.error('Error updating task:', error);
      showError('Failed to update task.');
    }
  }, [userId, categoriesMap, tasks, addReminder, dismissReminder]);

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
      idsToDelete.forEach(id => dismissReminder(id));
    }
    catch (error: any) {
      console.error('Error deleting task:', error);
      showError('Failed to delete task.');
    }
  }, [userId, tasks, dismissReminder]);

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
      
      ids.forEach(id => {
        const updatedTask = tasks.find(t => t.id === id);
        if (updatedTask) {
          if (updates.status === 'completed' || updates.status === 'archived' || updates.remind_at === null) {
            dismissReminder(updatedTask.id);
          } else if (updatedTask.remind_at && typeof updatedTask.remind_at === 'string') {
            const reminderDate = parseISO(updatedTask.remind_at);
            if (isValid(reminderDate)) {
              addReminder(updatedTask.id, `Reminder: ${updatedTask.description}`, reminderDate);
            }
          }
        }
      });

    } catch (error: any) {
      console.error('Error bulk updating tasks:', error);
      showError('Failed to update tasks in bulk.');
    }
  }, [userId, selectedTaskIds, clearSelectedTasks, categoriesMap, tasks, addReminder, dismissReminder]);

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
      taskIdsToComplete.forEach(id => dismissReminder(id));
    } catch (error: any) {
      console.error('Error marking all tasks in section as completed:', error);
      showError('Failed to mark tasks as completed.');
    }
  }, [userId, tasks, dismissReminder]);

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

    const originalTasks = [...tasks];

    const tasksInCurrentSection = tasks.filter(t => t.parent_task_id === null && t.section_id === sectionId)
                                      .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));
    const activeIndex = tasksInCurrentSection.findIndex(t => t.id === activeId);
    const overIndex = tasksInCurrentSection.findIndex(t => t.id === overId);

    if (activeIndex === -1 || overIndex === -1) return;

    const newOrderedTasksInSection = arrayMove(tasksInCurrentSection, activeIndex, overIndex);

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
      link: task.link,
      order: index,
      user_id: userId,
    }));

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
    }
    catch (error: any) {
      console.error('Error reordering tasks:', error);
      showError('Failed to reorder task.');
      setTasks(originalTasks);
    }
  }, [userId, sections, tasks]);

  const moveTaskToNewSection = useCallback(async (activeId: string, oldSectionId: string | null, newSectionId: string | null, overId: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }

    const originalTasks = [...tasks];

    let taskToMove: Task | undefined;
    const tasksInOldSection = tasks.filter(t => t.section_id === oldSectionId && t.parent_task_id === null)
                                   .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));
    const tasksInNewSection = tasks.filter(t => t.section_id === newSectionId && t.parent_task_id === null)
                                   .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));

    taskToMove = tasks.find(t => t.id === activeId);
    if (!taskToMove) return;

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
      link: task.link,
      order: index,
      user_id: userId,
    }));

    let newSectionTasksWithMoved = [...tasksInNewSection];
    if (overId) {
      const overIndex = newSectionTasksWithMoved.findIndex(t => t.id === overId);
      if (overIndex !== -1) {
        newSectionTasksWithMoved.splice(overIndex, 0, { ...taskToMove, section_id: newSectionId });
      } else {
        newSectionTasksWithMoved.push({ ...taskToMove, section_id: newSectionId });
      }
    } else {
      newSectionTasksWithMoved.push({ ...taskToMove, section_id: newSectionId });
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
      link: task.link,
      order: index,
      user_id: userId,
    }));

    const allUpdatesForDb = [
      ...updatesForOldSection,
      ...updatesForNewSection,
    ];

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
    }
    catch (error: any) {
      console.error('Error moving task:', error);
      showError('Failed to move task.');
      setTasks(originalTasks);
    }
  }, [userId, sections, tasks]);

  const reorderSections = useCallback(async (activeId: string, overId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }

    const originalSections = [...sections];

    const activeIndex = sections.findIndex(s => s.id === activeId);
    const overIndex = sections.findIndex(s => s.id === overId);

    if (activeIndex === -1 || overIndex === -1) return;

    const newOrderedSections = arrayMove(sections, activeIndex, overIndex);

    const updates = newOrderedSections.map((section, index) => ({
      id: section.id,
      name: section.name,
      user_id: userId,
      include_in_focus_mode: section.include_in_focus_mode,
      order: index,
    }));

    setSections(prevSections => {
      const updatedSectionsMap = new Map(updates.map(u => [u.id, u.order]));
      const finalSortedState = prevSections.map(section => {
        if (updatedSectionsMap.has(section.id)) {
          return { ...section, order: updatedSectionsMap.get(section.id) };
        }
        return section;
      }).sort((a, b) => (a.order || Infinity) - (b.order || Infinity));
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
    }
    catch (error: any) {
      console.error('Error reordering sections:', error);
      showError('Failed to reorder sections.');
      setSections(originalSections);
    }
  }, [userId, sections]);

  const moveTask = useCallback(async (taskId: string, direction: 'up' | 'down') => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }

    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove) {
      showError('Task not found.');
      return;
    }
    if (taskToMove.parent_task_id !== null) {
      showError('Cannot reorder sub-tasks directly.');
      return;
    }

    const currentSectionId = taskToMove.section_id;

    const tasksInCurrentSection = tasks
      .filter(t => t.section_id === currentSectionId && t.parent_task_id === null)
      .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));

    const currentIndex = tasksInCurrentSection.findIndex(t => t.id === taskId);
    
    if (currentIndex === -1) {
      showError('Internal error: Task not found in section list.');
      return;
    }

    let newIndex = currentIndex;
    if (direction === 'up') {
      if (currentIndex === 0) {
        showError('Task is already at the top.');
        return;
      }
      newIndex = currentIndex - 1;
    } else { // direction === 'down'
      if (currentIndex === tasksInCurrentSection.length - 1) {
        showError('Task is already at the bottom.');
        return;
      }
      newIndex = currentIndex + 1;
    }

    const newOrderedTasksInSection = arrayMove(tasksInCurrentSection, currentIndex, newIndex);

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
      link: task.link,
      order: index,
      user_id: userId,
    }));

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
    } catch (error: any) {
      console.error('Error reordering task:', error);
      showError('Failed to reorder task.');
    }
  }, [userId, sections, tasks]);

  const { finalFilteredTasks, nextAvailableTask } = useMemo(() => {
    let relevantTasks: Task[] = [];
    const focusModeSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));

    if (viewMode === 'archive') {
      relevantTasks = tasks.filter(task => task.status === 'archived');
    } else if (viewMode === 'focus') {
      relevantTasks = tasks.filter(task => 
        (task.section_id === null || focusModeSectionIds.has(task.section_id)) &&
        task.status === 'to-do' &&
        task.parent_task_id === null
      );
    }
    else {
      const effectiveCurrentDateUTC = currentDate ? getUTCStartOfDay(currentDate) : getUTCStartOfDay(new Date());
      const processedOriginalIds = new Set<string>();

      const topLevelTasks = tasks.filter(task => task.parent_task_id === null);

      topLevelTasks.forEach(task => {
        const originalId = task.original_task_id || task.id;

        if (processedOriginalIds.has(originalId)) {
            return;
        }

        if (task.recurring_type !== 'none') {
            const allInstancesOfThisRecurringTask = tasks.filter(t =>
                t.original_task_id === originalId || t.id === originalId
            );

            let taskToDisplay: Task | null = null;

            const instanceForCurrentDay = allInstancesOfThisRecurringTask.find(t =>
                isSameDay(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status !== 'archived'
            );

            if (instanceForCurrentDay) {
                taskToDisplay = instanceForCurrentDay;
            } else {
                const carryOverTask = allInstancesOfThisRecurringTask
                    .filter(t => isBefore(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status === 'to-do')
                    .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())[0];

                if (carryOverTask) {
                    taskToDisplay = carryOverTask;
                }
            }

            if (taskToDisplay) {
                relevantTasks.push(taskToDisplay);
                processedOriginalIds.add(originalId);
            }
        } else {
            const taskCreatedAtUTC = getUTCStartOfDay(parseISO(task.created_at));
            const isTaskCreatedOnCurrentDate = isSameDay(taskCreatedAtUTC, effectiveCurrentDateUTC);

            if (isTaskCreatedOnCurrentDate && task.status !== 'archived') {
                relevantTasks.push(task);
            } else if (isBefore(taskCreatedAtUTC, effectiveCurrentDateUTC) && task.status === 'to-do') {
                relevantTasks.push(task);
            }
        }
      });
    }

    let currentViewFilteredTasks = relevantTasks;

    if (viewMode === 'daily') {
      if (statusFilter !== 'all') {
        currentViewFilteredTasks = currentViewFilteredTasks.filter(task => task.status === statusFilter);
      } else {
        currentViewFilteredTasks = currentViewFilteredTasks.filter(task => task.status !== 'archived');
      }
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
    if (viewMode === 'daily' || viewMode === 'focus') {
      nextAvailableTask = currentViewFilteredTasks.find(task => 
        task.status === 'to-do' && task.parent_task_id === null
      ) || null;
    }

    return { 
      finalFilteredTasks: currentViewFilteredTasks, 
      nextAvailableTask, 
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
    moveTask,
    fetchDataAndSections,
    allCategories,
  };
};