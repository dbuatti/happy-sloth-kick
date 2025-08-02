"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { useReminders } from '@/context/ReminderContext';
import { v4 as uuidv4 } from 'uuid';
import { isSameDay, parseISO, isValid, isBefore, format, setHours, setMinutes, getHours, getMinutes } from 'date-fns';
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
  priority: 'low' | 'medium' | 'high' | 'urgent' | string;
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
  status?: Task['status'];
  recurring_type?: Task['recurring_type'];
  category: string;
  priority?: Task['priority'];
  due_date?: string | null;
  notes?: string | null;
  remind_at?: string | null;
  section_id?: string | null;
  parent_task_id?: string | null;
  link?: string | null;
}

const getUTCStartOfDay = (date: Date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

const cleanTaskForDb = (task: Partial<Task>): Partial<Omit<Task, 'category_color'>> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { category_color, ...rest } = task as any;
  return rest;
};

interface UseTasksProps {
  currentDate?: Date; // Make optional, as it might be managed internally for 'daily' view
  viewMode?: 'daily' | 'archive' | 'focus';
}

export const useTasks = ({ currentDate: propCurrentDate, viewMode = 'daily' }: UseTasksProps = {}) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const { addReminder, dismissReminder } = useReminders();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const isReorderingRef = useRef(false);

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  // Manage currentDate internally if in 'daily' view and not provided externally
  const [internalCurrentDate, setInternalCurrentDate] = useState(() => getUTCStartOfDay(new Date()));
  const effectiveCurrentDate = viewMode === 'daily' ? internalCurrentDate : (propCurrentDate || new Date());

  const categoriesMap = useMemo(() => {
    const map = new Map<string, string>();
    allCategories.forEach(c => map.set(c.id, c.color));
    return map;
  }, [allCategories]);

  const allCategoriesRef = useRef(allCategories);
  useEffect(() => {
    allCategoriesRef.current = allCategories;
  }, [allCategories]);

  const categoriesMapRef = useRef(categoriesMap);
  useEffect(() => {
    categoriesMapRef.current = categoriesMap;
  }, [categoriesMap]);

  const fetchDataAndSections = useCallback(async (currentUserId: string) => {
    setLoading(true);
    try {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('task_sections')
        .select('id, name, user_id, order, include_in_focus_mode')
        .eq('user_id', currentUserId)
        .order('order', { ascending: true })
        .order('name', { ascending: true });
      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('task_categories')
        .select('id, name, color, user_id, created_at')
        .eq('user_id', currentUserId);
      if (categoriesError) throw categoriesError;
      setAllCategories(categoriesData || []);

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, description, status, recurring_type, created_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link')
        .eq('user_id', currentUserId)
        .order('section_id', { ascending: true, nullsFirst: true })
        .order('order', { ascending: true });
      if (tasksError) throw tasksError;

      const mappedTasks = (tasksData || []).map((t: any) => ({
        ...t,
        category_color: categoriesMapRef.current.get(t.category) || 'gray',
      })) as Task[];

      setTasks(mappedTasks);
    } catch (e: any) {
      console.error('useTasks: Error in fetchDataAndSections:', e.message);
      showError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && userId) fetchDataAndSections(userId);
    if (!authLoading && !userId) {
      setTasks([]);
      setSections([]);
      setAllCategories([]);
      setLoading(false);
    }
  }, [authLoading, userId, fetchDataAndSections]);

  useEffect(() => {
    if (!userId) return;

    const tasksChannel = supabase
      .channel('tasks_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (isReorderingRef.current) return; // Ignore real-time updates during reordering
          const newOrOldTask = (payload.new || payload.old) as Task;
          const categoryColor = categoriesMapRef.current.get(newOrOldTask.category) || 'gray';

          if (payload.eventType === 'INSERT') {
            setTasks(prev => [...prev, { ...newOrOldTask, category_color: categoryColor }]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => t.id === newOrOldTask.id ? { ...newOrOldTask, category_color: categoryColor } : t));
            if (newOrOldTask.remind_at && newOrOldTask.status === 'to-do') {
              const d = parseISO(newOrOldTask.remind_at);
              if (isValid(d)) addReminder(newOrOldTask.id, `Reminder: ${newOrOldTask.description}`, d);
            } else if (newOrOldTask.status === 'completed' || newOrOldTask.status === 'archived' || newOrOldTask.remind_at === null) {
              dismissReminder(newOrOldTask.id);
            }
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== newOrOldTask.id));
            dismissReminder(newOrOldTask.id);
          }
        }
      )
      .subscribe();

    const sectionsChannel = supabase
      .channel('sections_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_sections', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (isReorderingRef.current) return; // Ignore real-time updates during reordering
          const newOrOldSection = (payload.new || payload.old) as TaskSection;
          if (payload.eventType === 'INSERT') {
            setSections(prev => [...prev, newOrOldSection].sort((a, b) => (a.order || 0) - (b.order || 0)));
          } else if (payload.eventType === 'UPDATE') {
            setSections(prev => prev.map(s => s.id === newOrOldSection.id ? newOrOldSection : s).sort((a, b) => (a.order || 0) - (b.order || 0)));
          } else if (payload.eventType === 'DELETE') {
            setSections(prev => prev.filter(s => s.id !== newOrOldSection.id));
            setTasks(prev => prev.map(t => t.section_id === newOrOldSection.id ? { ...t, section_id: null } : t));
          }
        }
      )
      .subscribe();

    const categoriesChannel = supabase
      .channel('categories_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_categories', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (isReorderingRef.current) return; // Ignore real-time updates during reordering
          const newOrOldCategory = (payload.new || payload.old) as Category;

          if (payload.eventType === 'INSERT') {
            setAllCategories(prev => [...prev, newOrOldCategory]);
          } else if (payload.eventType === 'UPDATE') {
            setAllCategories(prev => prev.map(c => c.id === newOrOldCategory.id ? newOrOldCategory : c));
          } else if (payload.eventType === 'DELETE') {
            setAllCategories(prev => prev.filter(c => c.id !== newOrOldCategory.id));
            setTasks(prev => prev.map(t => t.category === newOrOldCategory.id ? { ...t, category: allCategoriesRef.current.find(cat => cat.name.toLowerCase() === 'general')?.id || allCategoriesRef.current[0]?.id || '' } : t));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(sectionsChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, [userId, addReminder, dismissReminder]);

  const todayStart = getUTCStartOfDay(effectiveCurrentDate);

  const processedTasks = useMemo(() => {
    const allProcessedTasks: Task[] = [];
    const processedSeriesKeys = new Set<string>(); // Tracks original_task_id or id for templates
    const categoriesMapLocal = new Map<string, string>();
    allCategories.forEach(c => categoriesMapLocal.set(c.id, c.color));

    const taskSeriesMap = new Map<string, Task[]>();
    tasks.forEach(task => {
      const seriesKey = task.original_task_id || task.id;
      if (!taskSeriesMap.has(seriesKey)) {
        taskSeriesMap.set(seriesKey, []);
      }
      taskSeriesMap.get(seriesKey)!.push(task);
    });

    taskSeriesMap.forEach((seriesInstances, seriesKey) => {
      if (processedSeriesKeys.has(seriesKey)) return;
      processedSeriesKeys.add(seriesKey);

      const templateTask: Task | undefined = tasks.find(t => t.id === seriesKey); // Explicitly type as Task | undefined

      // Handle orphaned instances (tasks with original_task_id but no matching template)
      if (!templateTask) {
        seriesInstances.forEach(orphanTask => {
          // Only include if it's a 'to-do' task from today or earlier, or if it's an archived task (for archive view)
          const taskCreatedAt = getUTCStartOfDay(parseISO(orphanTask.created_at));
          const isRelevantForDaily = isSameDay(taskCreatedAt, todayStart) || (isBefore(taskCreatedAt, todayStart) && orphanTask.status === 'to-do');
          const isRelevantForArchive = orphanTask.status === 'archived'; // Always include archived for archive view

          if (isRelevantForDaily || isRelevantForArchive) {
            allProcessedTasks.push({ ...orphanTask, category_color: categoriesMapLocal.get(orphanTask.category) || 'gray' });
          }
        });
        return;
      }

      // Process based on templateTask's recurring_type
      if (templateTask.recurring_type === 'none') {
        const taskCreatedAt = getUTCStartOfDay(parseISO(templateTask.created_at));
        const isRelevantForDaily = isSameDay(taskCreatedAt, todayStart) || (isBefore(taskCreatedAt, todayStart) && templateTask.status === 'to-do');
        const isRelevantForArchive = templateTask.status === 'archived';

        if (isRelevantForDaily || isRelevantForArchive) {
          allProcessedTasks.push({ ...templateTask, category_color: categoriesMapLocal.get(templateTask.category) || 'gray' });
        }
      } else {
        // Recurring tasks logic
        const sortedInstances = [...seriesInstances].sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime());

        // Find the single relevant instance for today's view or for archive view
        let relevantInstance: Task | null = null;

        // Priority 1: An instance created *on* the current date (any status, including archived, for later filtering)
        relevantInstance = sortedInstances.find(t =>
          isSameDay(getUTCStartOfDay(parseISO(t.created_at)), todayStart)
        ) || null; // Ensure null if not found

        // Priority 2: If no instance created today, look for a 'to-do' instance from a previous day (carry-over)
        if (!relevantInstance) {
          relevantInstance = sortedInstances.find(t =>
            isBefore(getUTCStartOfDay(parseISO(t.created_at)), todayStart) && t.status === 'to-do'
          ) || null; // Ensure null if not found
        }

        // Priority 3: If no real instance found, and the template is set to recur today, create a virtual one
        if (!relevantInstance) {
          const templateCreatedAt = parseISO(templateTask.created_at);
          const isDailyMatch = templateTask.recurring_type === 'daily';
          const isWeeklyMatch = templateTask.recurring_type === 'weekly' && todayStart.getUTCDay() === templateCreatedAt.getUTCDay();
          const isMonthlyMatch = templateTask.recurring_type === 'monthly' && todayStart.getUTCDate() === templateCreatedAt.getUTCDate();

          // Only create virtual if template is NOT archived and it matches recurrence pattern for today
          if ((isDailyMatch || isWeeklyMatch || isMonthlyMatch) && templateTask.status !== 'archived') {
            const virtualTask: Task = {
              ...templateTask,
              id: uuidv4(),
              created_at: todayStart.toISOString(),
              status: 'to-do',
              original_task_id: templateTask.id,
              notes: null,
              remind_at: templateTask.remind_at ? format(setHours(setMinutes(todayStart, getMinutes(parseISO(templateTask.remind_at))), getHours(parseISO(templateTask.remind_at))), 'yyyy-MM-ddTHH:mm:ssZ') : null,
              due_date: templateTask.due_date ? todayStart.toISOString() : null,
              category_color: categoriesMapLocal.get(templateTask.category) || 'gray',
            };
            allProcessedTasks.push(virtualTask);
          }
        } else {
          // If a relevant instance was found, add it (regardless of its status, viewMode will filter later)
          allProcessedTasks.push({ ...relevantInstance, category_color: categoriesMapLocal.get(relevantInstance.category) || 'gray' });
        }
      }
    });
    return allProcessedTasks;
  }, [tasks, effectiveCurrentDate, allCategories]); // Depend on effectiveCurrentDate

  const handleAddTask = useCallback(async (newTaskData: NewTaskData) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    const categoryColor = allCategoriesRef.current.find(cat => cat.id === newTaskData.category)?.color || 'gray';
    const parentId = newTaskData.parent_task_id || null;

    const siblings = tasks
      .filter(t =>
        (parentId === null && t.parent_task_id === null && (t.section_id === newTaskData.section_id || (t.section_id === null && newTaskData.section_id === null))) ||
        (parentId !== null && t.parent_task_id === parentId)
      )
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const newOrder = siblings.length;

    const newTask: Task = {
      id: uuidv4(),
      user_id: userId,
      created_at: effectiveCurrentDate.toISOString(), // Use effectiveCurrentDate
      status: newTaskData.status || 'to-do',
      recurring_type: newTaskData.recurring_type || 'none',
      category: newTaskData.category,
      category_color: categoryColor,
      priority: (newTaskData.priority || 'medium') as Task['priority'],
      due_date: newTaskData.due_date || null,
      notes: newTaskData.notes || null,
      remind_at: newTaskData.remind_at || null,
      section_id: newTaskData.section_id || null,
      order: newOrder,
      original_task_id: null,
      parent_task_id: parentId,
      description: newTaskData.description,
      link: newTaskData.link || null,
    };

    setTasks(prev => [...prev, newTask]);

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert(cleanTaskForDb(newTask))
        .select('id, description, status, recurring_type, created_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link')
        .single();

      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === newTask.id ? { ...data, category_color: allCategoriesRef.current.find(cat => cat.id === data.category)?.color || 'gray' } : t));
      showSuccess('Task added successfully!');

      if (newTask.remind_at) {
        const d = parseISO(newTask.remind_at);
        if (isValid(d)) addReminder(newTask.id, `Reminder: ${newTask.description}`, d);
      }
      return true;
    } catch (e: any) {
      showError('Failed to add task.');
      setTasks(prev => prev.filter(t => t.id !== newTask.id));
      return false;
    }
  }, [userId, effectiveCurrentDate, tasks, addReminder]); // Depend on effectiveCurrentDate

  const updateTask = useCallback(async (taskId: string, updates: TaskUpdate) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    let color: string | undefined;
    if (updates.category) color = allCategoriesRef.current.find(cat => cat.id === updates.category)?.color || 'gray';

    const originalTask: Task | undefined = tasks.find(t => t.id === taskId); // Explicitly type as Task | undefined
    if (!originalTask) return;

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates, ...(color && { category_color: color }) } : t));

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(cleanTaskForDb(updates))
        .eq('id', taskId)
        .eq('user_id', userId)
        .select('id, description, status, recurring_type, created_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link')
        .single();

      if (error) throw error;

      setTasks(prev => prev.map(t => t.id === taskId ? { ...data, category_color: allCategoriesRef.current.find(cat => cat.id === data.category)?.color || 'gray' } : t));
      showSuccess('Task updated!');

      if (updates.remind_at) {
        const d = parseISO(updates.remind_at as string);
        if (isValid(d) && (updates.status === undefined || updates.status === 'to-do')) addReminder(taskId, `Reminder: ${originalTask.description}`, d);
      }
      if (updates.status === 'completed' || updates.status === 'archived' || updates.remind_at === null) {
        dismissReminder(taskId);
      }
    } catch (e: any) {
      showError('Failed to update task.');
      setTasks(prev => prev.map(t => t.id === taskId ? originalTask : t));
    }
  }, [userId, tasks, addReminder, dismissReminder]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const taskToDelete: Task | undefined = tasks.find(t => t.id === taskId); // Explicitly type as Task | undefined
    if (!taskToDelete) return;

    let idsToDelete = [taskId];
    const subIds = tasks.filter(t => t.parent_task_id === taskId).map(t => t.id);
    idsToDelete = [...idsToDelete, ...subIds];
    if (taskToDelete.recurring_type !== 'none' && taskToDelete.original_task_id === null) {
      const inst = tasks.filter(t => t.original_task_id === taskId).map(t => t.id);
      idsToDelete = [...idsToDelete, ...inst];
    }

    const originalTasks = [...tasks];
    setTasks(prev => prev.filter(t => !idsToDelete.includes(t.id)));

    try {
      const { error } = await supabase.from('tasks').delete().in('id', idsToDelete).eq('user_id', userId).select('id');
      if (error) throw error;
      showSuccess('Task(s) deleted!');
      idsToDelete.forEach(dismissReminder);
    } catch (e: any) {
      showError('Failed to delete task.');
      setTasks(originalTasks);
    }
  }, [userId, tasks, dismissReminder]);

  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const toggleTaskSelection = useCallback((taskId: string, checked: boolean) => {
    setSelectedTaskIds(prev =>
      checked ? [...prev, taskId] : prev.filter(id => id !== taskId)
    );
  }, []);

  const clearSelectedTasks = useCallback(() => {
    setSelectedTaskIds([]);
  }, []);

  const bulkUpdateTasks = useCallback(async (updates: Partial<Task>, ids?: string[]) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const targetIds = ids || selectedTaskIds;
    if (targetIds.length === 0) {
      return;
    }

    const original = [...tasks];
    setTasks(prev =>
      prev.map(t => (targetIds.includes(t.id) ? { ...t, ...updates } : t))
    );

    try {
      const { error } = await supabase
        .from('tasks')
        .update(cleanTaskForDb(updates))
        .in('id', targetIds)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Tasks updated!');
      clearSelectedTasks();
    } catch (e: any) {
      showError('Failed to update tasks.');
      setTasks(original);
    }
  }, [tasks, userId, selectedTaskIds, clearSelectedTasks]);

  const markAllTasksInSectionCompleted = useCallback(async (sectionId: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const tasksToComplete = tasks.filter(t =>
      t.status === 'to-do' &&
      t.parent_task_id === null && // Only mark top-level tasks
      (sectionId === null ? t.section_id === null : t.section_id === sectionId)
    ).map(t => t.id);

    if (tasksToComplete.length === 0) {
      showSuccess('No pending tasks in this section to complete!');
      return;
    }

    await bulkUpdateTasks({ status: 'completed' }, tasksToComplete);
  }, [tasks, userId, bulkUpdateTasks]);

  const createSection = useCallback(async (name: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const newOrder = sections.length;
    try {
      const { error } = await supabase
        .from('task_sections')
        .insert({ name, user_id: userId, order: newOrder, include_in_focus_mode: true })
        .select()
        .single();
      if (error) throw error;
      showSuccess('Section created!');
    } catch (e: any) {
      showError('Failed to create section.');
    }
  }, [userId, sections.length]);

  const updateSection = useCallback(async (sectionId: string, newName: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    // Optimistic update
    const originalSections = [...sections];
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, name: newName } : s));

    try {
      const { error } = await supabase
        .from('task_sections')
        .update({ name: newName })
        .eq('id', sectionId)
        .eq('user_id', userId);
      if (error) throw error;
      showSuccess('Section updated!');
    } catch (e: any) {
      showError('Failed to update section.');
      setSections(originalSections); // Revert on error
    }
  }, [userId, sections]);

  const deleteSection = useCallback(async (sectionId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      // First, update tasks in this section to have no section
      await supabase
        .from('tasks')
        .update({ section_id: null })
        .eq('section_id', sectionId)
        .eq('user_id', userId);

      // Then delete the section
      const { error } = await supabase
        .from('task_sections')
        .delete()
        .eq('id', sectionId)
        .eq('user_id', userId);
      if (error) throw error;
      showSuccess('Section deleted!');
    } catch (e: any) {
      showError('Failed to delete section.');
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
      showSuccess('Focus mode setting updated!');
    } catch (e: any) {
      showError('Failed to update focus mode setting.');
    }
  }, [userId]);

  const reorderSections = useCallback(async (activeId: string, overId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const oldIndex = sections.findIndex(s => s.id === activeId);
    const newIndex = sections.findIndex(s => s.id === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedSections = arrayMove(sections, oldIndex, newIndex);
    const updates = newOrderedSections.map((s, i) => ({
      id: s.id,
      order: i,
      user_id: userId,
    }));

    setSections(newOrderedSections); // Optimistic update

    isReorderingRef.current = true;
    try {
      const { error } = await supabase.from('task_sections').upsert(updates, { onConflict: 'id' });
      if (error) throw error;
      showSuccess('Sections reordered!');
    } catch (e: any) {
      showError('Failed to reorder sections.');
      setSections(sections); // Revert optimistic update
    } finally {
      isReorderingRef.current = false;
    }
  }, [userId, sections]);

  // Renamed from refreshGroup to refetchAllTasks for clarity and broader scope
  const refetchAllTasks = useCallback(async () => {
    if (!userId) return;
    setLoading(true); // Set loading true during refetch
    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, description, status, recurring_type, created_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link')
        .eq('user_id', userId)
        .order('section_id', { ascending: true, nullsFirst: true })
        .order('order', { ascending: true });
      if (tasksError) throw tasksError;

      const mappedTasks = (tasksData || []).map((t: any) => ({
        ...t,
        category_color: categoriesMapRef.current.get(t.category) || 'gray',
      })) as Task[];
      setTasks(mappedTasks);
    } catch (e: any) {
      console.error('Error refetching all tasks:', e.message);
      showError('Failed to refresh tasks.');
    } finally {
      setLoading(false); // Set loading false after refetch
    }
  }, [userId]);

  const moveTask = useCallback(async (taskId: string, direction: 'up' | 'down') => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove) return;

    const siblings = tasks
      .filter(t =>
        (taskToMove.parent_task_id === null
          ? t.parent_task_id === null && (t.section_id === taskToMove.section_id || (t.section_id === null && taskToMove.section_id === null))
          : t.parent_task_id === taskToMove.parent_task_id)
      )
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const currentIndex = siblings.findIndex(t => t.id === taskId);
    if (currentIndex === -1) return;

    let newIndex = currentIndex;
    if (direction === 'up' && currentIndex > 0) newIndex = currentIndex - 1;
    if (direction === 'down' && currentIndex < siblings.length - 1) newIndex = currentIndex + 1;
    if (newIndex === currentIndex) return;

    // Optimistic update
    isReorderingRef.current = true; // Set flag before optimistic update
    const newOrdered = arrayMove(siblings, currentIndex, newIndex);
    newOrdered.forEach((t, idx) => { t.order = idx; });

    const updatesMap = new Map<string, Task>(); // Store full Task objects
    newOrdered.forEach(s => {
      const currentFullTask = tasks.find(t => t.id === s.id);
      if (currentFullTask) {
        updatesMap.set(s.id, { ...currentFullTask, order: s.order!, parent_task_id: s.parent_task_id, section_id: s.section_id });
      }
    });

    const originalTasks = [...tasks];
    setTasks(prev => prev.map(t => updatesMap.has(t.id) ? { ...t, ...(updatesMap.get(t.id) as any) } : t));

    try {
      const payload = Array.from(updatesMap.values()).map(u => cleanTaskForDb(u));
      const { error } = await supabase.from('tasks').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      showSuccess('Task reordered!');
      await refetchAllTasks(); // Full refresh after successful move
    } catch (e: any) {
      showError('Failed to reorder task.');
      setTasks(originalTasks); // Revert optimistic update on error
    } finally {
      isReorderingRef.current = false;
    }
  }, [userId, tasks, refetchAllTasks]);

  const updateTaskParentAndOrder = useCallback(async (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }

    const taskToMove = tasks.find(t => t.id === activeId);
    if (!taskToMove) return;

    let targetTasks: Task[] = [];
    if (newParentId) {
      // Moving to be a subtask of newParentId
      targetTasks = tasks.filter(t => t.parent_task_id === newParentId).sort((a, b) => (a.order || 0) - (b.order || 0));
    } else if (newSectionId !== undefined) {
      // Moving to a new section (top-level task)
      targetTasks = tasks.filter(t => t.parent_task_id === null && t.section_id === newSectionId).sort((a, b) => (a.order || 0) - (b.order || 0));
    } else {
      // Moving within its current parent/section (top-level task)
      targetTasks = tasks.filter(t => t.parent_task_id === taskToMove.parent_task_id && t.section_id === taskToMove.section_id).sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    let newOrder = targetTasks.length; // Default to end if no overId

    if (overId) {
      const overTaskIndex = targetTasks.findIndex(t => t.id === overId);
      if (overTaskIndex !== -1) {
        newOrder = overTaskIndex;
      }
    }

    const updatedTasksInGroup = [...targetTasks.filter(t => t.id !== activeId)];
    updatedTasksInGroup.splice(newOrder, 0, { ...taskToMove, parent_task_id: newParentId, section_id: newSectionId });

    const updatesToApply = updatedTasksInGroup.map((t, index) => ({
      id: t.id,
      order: index,
      parent_task_id: t.parent_task_id,
      section_id: t.section_id,
      user_id: userId,
    }));

    // Optimistic update
    isReorderingRef.current = true;
    setTasks(prev => prev.map(t => {
      const update = updatesToApply.find(u => u.id === t.id);
      return update ? { ...t, order: update.order, parent_task_id: update.parent_task_id, section_id: update.section_id } : t;
    }));

    try {
      const { error } = await supabase.from('tasks').upsert(updatesToApply, { onConflict: 'id' });
      if (error) throw error;
      showSuccess('Task reordered!');
      await refetchAllTasks(); // Full refresh to ensure consistency
    } catch (e: any) {
      showError('Failed to reorder task.');
      await refetchAllTasks(); // Revert by fetching fresh data
    } finally {
      isReorderingRef.current = false;
    }
  }, [userId, tasks, sections, refetchAllTasks]);

  const finalFilteredTasks = useMemo(() => {
    let filtered = processedTasks;

    // Apply search filter
    if (searchFilter) {
      filtered = filtered.filter(task =>
        task.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.link?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    // Apply status filter
    if (viewMode === 'archive') {
      filtered = filtered.filter(task => task.status === 'archived');
    } else { // 'daily' or 'focus' view
      if (statusFilter !== 'all') {
        filtered = filtered.filter(task => task.status === statusFilter);
      } else {
        // In daily/focus view, by default, don't show archived tasks unless explicitly filtered for
        filtered = filtered.filter(task => task.status !== 'archived');
      }
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(task => task.category === categoryFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Apply section filter
    if (sectionFilter !== 'all') {
      if (sectionFilter === 'no-section') {
        filtered = filtered.filter(task => task.section_id === null);
      } else {
        filtered = filtered.filter(task => task.section_id === sectionFilter);
      }
    }

    // For 'daily' and 'focus' view, filter by date relevance
    if (viewMode === 'daily' || viewMode === 'focus') {
      filtered = filtered.filter(task => {
        const taskCreatedAt = getUTCStartOfDay(parseISO(task.created_at));
        const isTaskCreatedOnCurrentDate = isSameDay(taskCreatedAt, effectiveCurrentDate);
        const isCarryOverTodo = isBefore(taskCreatedAt, effectiveCurrentDate) && task.status === 'to-do';

        // Include tasks created today (any status) or carry-over 'to-do' tasks
        return isTaskCreatedOnCurrentDate || isCarryOverTodo;
      });
    }

    return filtered;
  }, [
    processedTasks,
    searchFilter,
    statusFilter,
    categoryFilter,
    priorityFilter,
    sectionFilter,
    viewMode,
    effectiveCurrentDate,
  ]);

  const nextAvailableTask = useMemo(() => {
    // Removed focusModeSectionIds filtering to include ALL tasks
    const relevantTasks = finalFilteredTasks.filter(task =>
      task.status === 'to-do' &&
      task.parent_task_id === null // Only consider top-level tasks
    );

    // Sort by priority (urgent > high > medium > low), then by due date (earliest first), then by order
    const sortedTasks = [...relevantTasks].sort((a, b) => {
      const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3 };
      const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 99;
      const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 99;

      if (priorityA !== priorityB) return priorityA - priorityB;

      const dueDateA = a.due_date ? parseISO(a.due_date).getTime() : Infinity;
      const dueDateB = b.due_date ? parseISO(b.due_date).getTime() : Infinity;
      if (dueDateA !== dueDateB) return dueDateA - dueDateB;

      return (a.order || 0) - (b.order || 0);
    });

    return sortedTasks.length > 0 ? sortedTasks[0] : null;
  }, [finalFilteredTasks]);


  return {
    tasks,
    filteredTasks: finalFilteredTasks,
    nextAvailableTask,
    loading,
    currentDate: effectiveCurrentDate, // Expose effectiveCurrentDate
    setCurrentDate: setInternalCurrentDate, // Expose setter for external control in 'daily' mode
    userId,
    handleAddTask,
    updateTask,
    deleteTask,
    searchFilter,
    setSearchFilter,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    sectionFilter,
    setSectionFilter,
    sections,
    allCategories,
    updateTaskParentAndOrder,
    moveTask,
    selectedTaskIds,
    toggleTaskSelection,
    clearSelectedTasks,
    bulkUpdateTasks,
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    reorderSections,
  };
};