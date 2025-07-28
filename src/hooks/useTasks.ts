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

      setTasks(mappedTasks || []);
      console.log('useTasks: Mapped tasks with category_color:', mappedTasks.map(t => ({ id: t.id, description: t.description, category: t.category, category_color: t.category_color })));
      
    } catch (error: any) {
      console.error('Error in fetchDataAndSections:', error);
      showError('An unexpected error occurred while loading data.');
    } finally {
      setLoading(false);
      console.log('fetchTasks: Fetch process completed.');
    }
  }, [userId, viewMode]);

  const createRecurringTaskInstance = useCallback(async (originalTask: Task, targetDate: Date): Promise<boolean> => {
    console.log(`createRecurringTaskInstance: Attempting to create instance for original task "${originalTask.description}" on ${format(targetDate, 'yyyy-MM-dd')}`);
    if (originalTask.recurring_type === 'none' || !userId) return false;

    const targetDateUTC = getUTCStartOfDay(targetDate);

    const existingInstance = tasks.find(t =>
      (t.original_task_id === originalTask.id || t.id === originalTask.id) &&
      isSameDay(getUTCStartOfDay(parseISO(t.created_at)), targetDateUTC)
    );

    if (existingInstance) {
      console.log(`createRecurringTaskInstance: Skipping creation: Instance for "${originalTask.description}" on ${format(targetDate, 'yyyy-MM-dd')} already exists in state with status: ${existingInstance.status}.`);
      return false;
    }

    const newInstanceDataForDb = {
      id: uuidv4(),
      user_id: originalTask.user_id,
      description: originalTask.description,
      status: 'to-do',
      recurring_type: originalTask.recurring_type,
      created_at: targetDateUTC.toISOString(),
      category: originalTask.category,
      priority: originalTask.priority,
      due_date: null,
      notes: originalTask.notes,
      remind_at: null,
      section_id: originalTask.section_id,
      order: originalTask.order,
      original_task_id: originalTask.id,
      parent_task_id: originalTask.parent_task_id,
    };

    console.log('createRecurringTaskInstance: New instance data prepared for DB:', newInstanceDataForDb);

    const { error: insertError } = await supabase
      .from('tasks')
      .insert(newInstanceDataForDb);

    if (insertError) {
      console.error('createRecurringTaskInstance: Error creating recurring task instance:', insertError);
      showError('Failed to create the next instance of the recurring task.');
      return false;
    }
    showSuccess(`Recurring task "${originalTask.description}" created for ${format(targetDate, 'MMM d')}.`);
    return true;
  }, [userId, tasks]);

  const syncRecurringTasks = useCallback(async () => {
    if (viewMode !== 'daily' || !userId || loading || !currentDate) {
      console.log('syncRecurringTasks: Skipping sync - not daily view, no user, or still loading initial data.');
      return;
    }

    console.log(`syncRecurringTasks: Running for date ${currentDate.toISOString()}`);
    const effectiveCurrentDateUTC = getUTCStartOfDay(currentDate);
    let tasksWereModified = false;

    const originalRecurringTasks = tasks.filter(t => t.recurring_type !== 'none' && t.original_task_id === null);

    for (const originalTask of originalRecurringTasks) {
      const originalTaskCreatedAtUTC = getUTCStartOfDay(parseISO(originalTask.created_at));

      if (isAfter(originalTaskCreatedAtUTC, effectiveCurrentDateUTC)) {
        console.log(`syncRecurringTasks: Skipping "${originalTask.description}" - original creation date (${format(originalTaskCreatedAtUTC, 'yyyy-MM-dd')}) is after current date (${format(effectiveCurrentDateUTC, 'yyyy-MM-dd')}).`);
        continue;
      }

      const allInstancesOfThisRecurringTask = tasks.filter(t =>
        t.original_task_id === originalTask.id || t.id === originalTask.id
      );
      console.log(`syncRecurringTasks: For originalId ${originalTask.id} ("${originalTask.description}"), all instances:`, allInstancesOfThisRecurringTask.map(t => ({id: t.id, created_at: t.created_at, status: t.status})));

      const instanceForCurrentDay = allInstancesOfThisRecurringTask.find(t =>
        isSameDay(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status !== 'archived'
      );
      
      if (instanceForCurrentDay) {
        console.log(`syncRecurringTasks: For original ${originalTask.id}, found instance for current date (${format(effectiveCurrentDateUTC, 'yyyy-MM-dd')}) with status: ${instanceForCurrentDay.status}. No new instance needed.`);
        continue;
      }

      let shouldCreate = false;

      if (isSameDay(originalTaskCreatedAtUTC, effectiveCurrentDateUTC)) {
        shouldCreate = true;
        console.log(`syncRecurringTasks: Original task "${originalTask.description}" created today. Creating first instance.`);
      } else {
        const latestPreviousInstance = allInstancesOfThisRecurringTask
          .filter(t => isBefore(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status === 'to-do')
          .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())[0];

        if (latestPreviousInstance) {
          console.log(`syncRecurringTasks: Latest previous instance for "${originalTask.description}" is ID: ${latestPreviousInstance.id}, Created At: ${format(parseISO(latestPreviousInstance.created_at), 'yyyy-MM-dd')}, Status: ${latestPreviousInstance.status}`);
          if (latestPreviousInstance.status === 'completed' || latestPreviousInstance.status === 'skipped') {
            shouldCreate = true;
            console.log(`syncRecurringTasks: Latest previous instance was completed/skipped. Creating new 'to-do' instance for today.`);
          } else if (latestPreviousInstance.status === 'to-do') {
            console.log(`syncRecurringTasks: Latest previous instance was 'to-do'. It should carry over. No new instance needed.`);
          }
        } else {
          shouldCreate = true;
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
  }, [userId, tasks, currentDate, createRecurringTaskInstance, fetchDataAndSections, loading, viewMode]);

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
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(dbInsertPayload)
        .select()
        .single();

      if (error) throw error;
      
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
      fetchDataAndSections();
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
      if (taskToDelete) {
        fetchDataAndSections();
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
      
      await fetchDataAndSections(); 
    } catch (error: any) {
      console.error('Error bulk updating tasks:', error);
      showError('Failed to update tasks in bulk.');
      fetchDataAndSections();
    }
  }, [userId, selectedTaskIds, clearSelectedTasks, fetchDataAndSections, categoriesMap]);

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
      await fetchDataAndSections();
    } catch (error: any) {
      console.error('Error marking all tasks in section as completed:', error);
      showError('Failed to mark tasks as completed.');
      fetchDataAndSections();
    }
  }, [userId, tasks, fetchDataAndSections]);

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
    setTasks(prevTasks => {
      const tasksInSection = prevTasks.filter(t => t.section_id === sectionId && t.parent_task_id === null);
      const activeIndex = tasksInSection.findIndex(t => t.id === activeId);
      const overIndex = tasksInSection.findIndex(t => t.id === overId);

      if (activeIndex === -1 || overIndex === -1) return prevTasks;

      const newOrderedTasks = arrayMove(tasksInSection, activeIndex, overIndex);

      // Update local state with new order
      const updatedTasks = prevTasks.map(task => {
        const newIndex = newOrderedTasks.findIndex(t => t.id === task.id);
        return newIndex !== -1 ? { ...task, order: newIndex } : task;
      });
      return updatedTasks;
    });

    try {
      // Optimistic update, then persist to DB
      const tasksToUpdate = tasks.filter(t => t.section_id === sectionId && t.parent_task_id === null);
      const activeTask = tasksToUpdate.find(t => t.id === activeId);
      const overTask = tasksToUpdate.find(t => t.id === overId);

      if (!activeTask || !overTask) return;

      const activeIndex = tasksToUpdate.findIndex(t => t.id === activeId);
      const overIndex = tasksToUpdate.findIndex(t => t.id === overId);
      const newOrderedTasks = arrayMove(tasksToUpdate, activeIndex, overIndex);

      const updates = newOrderedTasks.map((task, index) => ({
        id: task.id,
        order: index,
      }));

      const { error } = await supabase
        .from('tasks')
        .upsert(updates, { onConflict: 'id' });

      if (error) throw error;
      showSuccess('Task reordered successfully!');
    } catch (error: any) {
      console.error('Error reordering tasks:', error);
      showError('Failed to reorder task.');
      fetchDataAndSections(); // Revert to server state on error
    }
  }, [userId, tasks, fetchDataAndSections]);

  const moveTaskToNewSection = useCallback(async (activeId: string, oldSectionId: string | null, newSectionId: string | null, overId: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }

    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(task => {
        if (task.id === activeId) {
          return { ...task, section_id: newSectionId, order: null }; // Temporarily set order to null, will be re-indexed
        }
        return task;
      });

      // Re-index tasks in old section
      const oldSectionTasks = updatedTasks
        .filter(t => t.section_id === oldSectionId && t.parent_task_id === null)
        .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));
      oldSectionTasks.forEach((task, index) => {
        const originalTaskIndex = updatedTasks.findIndex(t => t.id === task.id);
        if (originalTaskIndex !== -1) {
          updatedTasks[originalTaskIndex] = { ...task, order: index };
        }
      });

      // Re-index tasks in new section, inserting at correct position if overId is a task
      let newSectionTasks = updatedTasks
        .filter(t => t.section_id === newSectionId && t.parent_task_id === null)
        .sort((a, b) => (a.order || Infinity) - (b.order || Infinity));

      const activeTask = updatedTasks.find(t => t.id === activeId);
      if (activeTask) {
        newSectionTasks = newSectionTasks.filter(t => t.id !== activeId); // Remove the task from its old position in the new section's temp list
        if (overId) {
          const overIndex = newSectionTasks.findIndex(t => t.id === overId);
          if (overIndex !== -1) {
            newSectionTasks.splice(overIndex, 0, activeTask);
          } else {
            newSectionTasks.push(activeTask); // If overId not found, add to end
          }
        } else {
          newSectionTasks.push(activeTask); // If no overId, add to end
        }
      }

      newSectionTasks.forEach((task, index) => {
        const originalTaskIndex = updatedTasks.findIndex(t => t.id === task.id);
        if (originalTaskIndex !== -1) {
          updatedTasks[originalTaskIndex] = { ...task, order: index };
        }
      });

      return updatedTasks;
    });

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ section_id: newSectionId })
        .eq('id', activeId)
        .eq('user_id', userId);

      if (error) throw error;

      // Re-fetch all tasks and sections to ensure correct ordering after move
      // This is a simpler approach than complex re-indexing logic on the client
      await fetchDataAndSections();
      showSuccess('Task moved successfully!');
    } catch (error: any) {
      console.error('Error moving task:', error);
      showError('Failed to move task.');
      fetchDataAndSections(); // Revert to server state on error
    }
  }, [userId, tasks, fetchDataAndSections]);

  const reorderSections = useCallback(async (activeId: string, overId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    setSections(prevSections => {
      const activeIndex = prevSections.findIndex(s => s.id === activeId);
      const overIndex = prevSections.findIndex(s => s.id === overId);
      const newOrderedSections = arrayMove(prevSections, activeIndex, overIndex);
      return newOrderedSections.map((section, index) => ({ ...section, order: index }));
    });

    try {
      const sectionsToUpdate = sections.map((section, index) => ({
        id: section.id,
        order: index, // This order is based on the current state before arrayMove
      }));

      const activeIndex = sectionsToUpdate.findIndex(s => s.id === activeId);
      const overIndex = sectionsToUpdate.findIndex(s => s.id === overId);
      const newOrderedSections = arrayMove(sectionsToUpdate, activeIndex, overIndex);

      const updates = newOrderedSections.map((section, index) => ({
        id: section.id,
        order: index,
      }));

      const { error } = await supabase
        .from('task_sections')
        .upsert(updates, { onConflict: 'id' });

      if (error) throw error;
      showSuccess('Sections reordered successfully!');
    } catch (error: any) {
      console.error('Error reordering sections:', error);
      showError('Failed to reorder sections.');
      fetchDataAndSections(); // Revert to server state on error
    }
  }, [userId, sections, fetchDataAndSections]);

  const { finalFilteredTasks, nextAvailableTask } = useMemo(() => {
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
      const processedOriginalIds = new Set<string>();

      const topLevelTasks = tasks.filter(task => task.parent_task_id === null);

      topLevelTasks.forEach(task => {
        const taskCreatedAtUTC = getUTCStartOfDay(parseISO(task.created_at));
        const originalId = task.original_task_id || task.id;

        if (task.recurring_type !== 'none') {
          if (processedOriginalIds.has(originalId)) {
            console.log(`filteredTasks/nextAvailableTask: Skipping already processed originalId: ${originalId}`);
            return;
          }

          const allInstancesOfThisRecurringTask = tasks.filter(t =>
            t.original_task_id === originalId || t.id === originalId
          );
          console.log(`filteredTasks/nextAvailableTask: For originalId ${originalId} ("${task.description}"), all instances:`, allInstancesOfThisRecurringTask.map(t => ({id: t.id, created_at: t.created_at, status: t.status})));

          let taskToDisplay: Task | null = null;

          const instanceForCurrentDay = allInstancesOfThisRecurringTask.find(t =>
            isSameDay(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status !== 'archived'
          );
          
          if (instanceForCurrentDay) {
            taskToDisplay = instanceForCurrentDay;
            console.log(`filteredTasks/nextAvailableTask: For original ${originalId}, found instance for current date (${format(effectiveCurrentDateUTC, 'yyyy-MM-dd')}) with status: ${instanceForCurrentDay.status}. Pushing this.`);
          } else {
            const carryOverTask = allInstancesOfThisRecurringTask
              .filter(t => isBefore(getUTCStartOfDay(parseISO(t.created_at)), effectiveCurrentDateUTC) && t.status === 'to-do')
              .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())[0];

            if (carryOverTask) {
              taskToDisplay = carryOverTask;
              console.log(`filteredTasks/nextAvailableTask: For original ${originalId}, no instance for current date. Found carry-over from ${format(parseISO(carryOverTask.created_at), 'yyyy-MM-dd')} with status: ${carryOverTask.status}. Pushing this.`);
            } else {
              console.log(`filteredTasks/nextAvailableTask: For original ${originalId}, no relevant instance found for current date or carry-over.`);
            }
          }
          
          if (taskToDisplay) {
            relevantTasks.push(taskToDisplay);
          }
          processedOriginalIds.add(originalId);
        } else {
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

      // Apply focus mode section filter ONLY if viewMode is 'focus'
      if (viewMode === 'focus') {
        const focusModeSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));
        relevantTasks = relevantTasks.filter(task => 
          task.section_id === null || focusModeSectionIds.has(task.section_id)
        );
        console.log('filteredTasks/nextAvailableTask: After focus mode section filter (because viewMode is focus):', relevantTasks.map(t => t.id));
      } else {
        console.log('filteredTasks/nextAvailableTask: Skipping focus mode section filter (because viewMode is not focus).');
      }
    }

    let finalFilteredTasks = relevantTasks;

    if (viewMode === 'daily') {
      if (statusFilter !== 'all') {
        finalFilteredTasks = finalFilteredTasks.filter(task => task.status === statusFilter);
      } else {
        finalFilteredTasks = finalFilteredTasks.filter(task => task.status !== 'archived');
      }
    }

    if (searchFilter) {
      finalFilteredTasks = finalFilteredTasks.filter(task =>
        task.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }
    if (categoryFilter && categoryFilter !== 'all') {
      finalFilteredTasks = finalFilteredTasks.filter(task => task.category === categoryFilter);
    }
    if (priorityFilter && priorityFilter !== 'all') {
      finalFilteredTasks = finalFilteredTasks.filter(task => task.priority === priorityFilter);
    }
    if (sectionFilter && sectionFilter !== 'all') {
      finalFilteredTasks = finalFilteredTasks.filter(task => {
        if (sectionFilter === 'no-section') {
          return task.section_id === null;
        }
        return task.section_id === sectionFilter;
      });
    }

    finalFilteredTasks.sort((a, b) => {
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
      nextAvailableTask = finalFilteredTasks.find(task => 
        task.status === 'to-do' && task.parent_task_id === null
      ) || null;
    }

    console.log('filteredTasks/nextAvailableTask: Final tasks AFTER all filters and sorting:', finalFilteredTasks.map(t => ({
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
    console.log('filteredTasks/nextAvailableTask: --- END FILTERING ---');
    return { finalFilteredTasks, nextAvailableTask };
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
    reorderTasksInSameSection, // Added
    moveTaskToNewSection,       // Added
    reorderSections,            // Added
    fetchDataAndSections,
    allCategories,
  };
};