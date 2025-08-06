"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { useReminders } from '@/context/ReminderContext';
import { v4 as uuidv4 } from 'uuid';
import { isSameDay, parseISO, isValid, isBefore, format, setHours, setMinutes, getHours, getMinutes, isAfter, startOfDay } from 'date-fns';
import { arrayMove } from '@dnd-kit/sortable';
import { useSettings } from '@/context/SettingsContext';

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
  original_task_id?: string | null; // Added for new instance creation
  created_at?: string; // Added for new instance creation
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
  const { settings: userSettings, updateSettings } = useSettings();
  const { addReminder, dismissReminder } = useReminders();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [doTodayOffIds, setDoTodayOffIds] = useState<Set<string>>(new Set());

  const inFlightUpdatesRef = useRef(new Set<string>());

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const [internalCurrentDate, setInternalCurrentDate] = useState(() => getUTCStartOfDay(new Date()));
  const effectiveCurrentDate = viewMode === 'daily' ? internalCurrentDate : (propCurrentDate || internalCurrentDate);

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

  const fetchDoTodayOffLog = useCallback(async (date: Date, currentUserId: string) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const { data: offLogData, error: offLogError } = await supabase
      .from('do_today_off_log')
      .select('task_id')
      .eq('user_id', currentUserId)
      .eq('off_date', formattedDate);
    if (offLogError) {
        showError("Could not load 'Do Today' settings.");
        console.error(offLogError);
        return new Set<string>();
    }
    return new Set(offLogData?.map(item => item.task_id) || []);
  }, []);

  const fetchDataAndSettings = useCallback(async (currentUserId: string) => {
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

      const offIds = await fetchDoTodayOffLog(effectiveCurrentDate, currentUserId);
      setDoTodayOffIds(offIds);

    } catch (e: any) {
      console.error('useTasks: Error in fetchDataAndSettings:', e.message);
      showError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [effectiveCurrentDate, fetchDoTodayOffLog]);

  useEffect(() => {
    if (userId) {
        fetchDoTodayOffLog(effectiveCurrentDate, userId).then(setDoTodayOffIds);
    }
  }, [userId, effectiveCurrentDate, fetchDoTodayOffLog]);

  useEffect(() => {
    if (!authLoading && userId) fetchDataAndSettings(userId);
    if (!authLoading && !userId) {
      setTasks([]);
      setSections([]);
      setAllCategories([]);
      setLoading(false);
    }
  }, [authLoading, userId, fetchDataAndSettings]);

  useEffect(() => {
    if (!userId) return;

    const tasksChannel = supabase
      .channel('tasks_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newOrOldTask = (payload.new || payload.old) as Task;
          if (inFlightUpdatesRef.current.has(newOrOldTask.id)) return;

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
          const newOrOldSection = (payload.new || payload.old) as TaskSection;
          if (inFlightUpdatesRef.current.has(newOrOldSection.id)) return;

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
          const newOrOldCategory = (payload.new || payload.old) as Category;
          if (inFlightUpdatesRef.current.has(newOrOldCategory.id)) return;

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
    const processedSeriesKeys = new Set<string>();
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

      const templateTask: Task | undefined = tasks.find(t => t.id === seriesKey);

      if (!templateTask) {
        seriesInstances.forEach(orphanTask => {
            allProcessedTasks.push({ ...orphanTask, category_color: categoriesMapLocal.get(orphanTask.category) || 'gray' });
        });
        return;
      }

      if (templateTask.recurring_type === 'none') {
        allProcessedTasks.push({ ...templateTask, category_color: categoriesMapLocal.get(templateTask.category) || 'gray' });
      } else {
        const sortedInstances = [...seriesInstances].sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime());
        let relevantInstance: Task | null = sortedInstances.find(t => isSameDay(getUTCStartOfDay(parseISO(t.created_at)), todayStart)) || null;

        if (!relevantInstance) {
          relevantInstance = sortedInstances.find(t => isBefore(getUTCStartOfDay(parseISO(t.created_at)), todayStart) && t.status === 'to-do') || null;
        }

        if (!relevantInstance) {
          const templateCreatedAt = parseISO(templateTask.created_at);
          const isDailyMatch = templateTask.recurring_type === 'daily';
          const isWeeklyMatch = templateTask.recurring_type === 'weekly' && todayStart.getUTCDay() === templateCreatedAt.getUTCDay();
          const isMonthlyMatch = templateTask.recurring_type === 'monthly' && todayStart.getUTCDate() === templateCreatedAt.getUTCDate();

          if ((isDailyMatch || isWeeklyMatch || isMonthlyMatch) && templateTask.status !== 'archived') {
            const virtualTask: Task = {
              ...templateTask,
              id: `virtual-${templateTask.id}-${format(todayStart, 'yyyy-MM-dd')}`,
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
          allProcessedTasks.push({ ...relevantInstance, category_color: categoriesMapLocal.get(relevantInstance.category) || 'gray' });
        }
      }
    });
    return allProcessedTasks;
  }, [tasks, effectiveCurrentDate, allCategories]);

  const dailyProgress = useMemo(() => {
    if (viewMode !== 'daily') {
      return { totalCount: 0, completedCount: 0, overdueCount: 0 };
    }

    const tasksForToday = processedTasks.filter(task => {
      const taskDueDate = task.due_date ? getUTCStartOfDay(parseISO(task.due_date)) : null;
      const taskCreatedAt = getUTCStartOfDay(parseISO(task.created_at));
      const isCreatedOnThisDay = isSameDay(taskCreatedAt, effectiveCurrentDate);
      
      if (taskDueDate) {
        const isDueOnThisDay = isSameDay(taskDueDate, effectiveCurrentDate);
        const isOverdue = isBefore(taskDueDate, effectiveCurrentDate) && task.status === 'to-do';
        return isCreatedOnThisDay || isDueOnThisDay || isOverdue;
      } else {
        const isCarryOver = isBefore(taskCreatedAt, effectiveCurrentDate) && task.status === 'to-do';
        return isCreatedOnThisDay || isCarryOver;
      }
    });

    const focusModeSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));

    const focusTasks = tasksForToday.filter(t => {
      if (t.parent_task_id !== null) return false; // Only top-level tasks

      const isInFocusArea = t.section_id === null || focusModeSectionIds.has(t.section_id);
      const isDoToday = t.recurring_type !== 'none' || !doTodayOffIds.has(t.original_task_id || t.id);

      return isInFocusArea && isDoToday;
    });

    const completedCount = focusTasks.filter(t => t.status === 'completed' || t.status === 'archived').length;
    const totalCount = focusTasks.filter(t => t.status !== 'skipped').length;
    
    const overdueCount = focusTasks.filter(t => {
      if (!t.due_date || t.status === 'completed' || t.status === 'archived') return false;
      const due = parseISO(t.due_date);
      return isValid(due) && isBefore(startOfDay(due), startOfDay(effectiveCurrentDate));
    }).length;

    return { totalCount, completedCount, overdueCount };
  }, [processedTasks, viewMode, sections, doTodayOffIds, effectiveCurrentDate]);

  const handleAddTask = useCallback(async (newTaskData: NewTaskData) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    const newTaskClientSideId = uuidv4();
    inFlightUpdatesRef.current.add(newTaskClientSideId);
    try {
      const categoryColor = allCategoriesRef.current.find(cat => cat.id === newTaskData.category)?.color || 'gray';
      const parentId = newTaskData.parent_task_id || null;

      const siblings = tasks
        .filter(t =>
          (parentId === null && t.parent_task_id === null && (t.section_id === newTaskData.section_id || (t.section_id === null && newTaskData.section_id === null))) ||
          (parentId !== null && t.parent_task_id === parentId)
        )
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const newOrder = siblings.length;

      const newTaskForUI: Task = {
        id: newTaskClientSideId,
        user_id: userId,
        created_at: new Date().toISOString(),
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

      setTasks(prev => [...prev, newTaskForUI]);

      const { data, error } = await supabase
        .from('tasks')
        .insert(cleanTaskForDb(newTaskForUI))
        .select('id, description, status, recurring_type, created_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link')
        .single();

      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === newTaskForUI.id ? { ...data, category_color: allCategoriesRef.current.find(cat => cat.id === data.category)?.color || 'gray' } : t));
      showSuccess('Task added successfully!');

      if (newTaskForUI.remind_at) {
        const d = parseISO(newTaskForUI.remind_at);
        if (isValid(d)) addReminder(newTaskForUI.id, `Reminder: ${newTaskForUI.description}`, d);
      }
      return true;
    } catch (e: any) {
      showError('Failed to add task.');
      console.error('useTasks: Error adding task to DB:', e.message);
      return false;
    } finally {
      inFlightUpdatesRef.current.delete(newTaskClientSideId);
    }
  }, [userId, tasks, addReminder]);

  const updateTask = useCallback(async (taskId: string, updates: TaskUpdate): Promise<string | null> => {
    if (!userId) {
      showError('User not authenticated.');
      return null;
    }
    let idToTrack = taskId;
    let originalTaskState: Task | undefined;
    
    try {
      let color: string | undefined;
      if (updates.category) color = allCategoriesRef.current.find(cat => cat.id === updates.category)?.color || 'gray';

      originalTaskState = tasks.find(t => t.id === taskId);
      
      if (!originalTaskState) {
        const virtualTask = processedTasks.find(t => t.id === taskId);
        if (!virtualTask || !taskId.toString().startsWith('virtual-')) {
            return null;
        }

        const newInstanceId = uuidv4();
        idToTrack = newInstanceId;
        inFlightUpdatesRef.current.add(idToTrack);

        const newInstanceDataForUI: Omit<Task, 'category_color'> = {
            id: newInstanceId,
            user_id: userId,
            description: updates.description ?? virtualTask.description,
            status: updates.status ?? 'to-do',
            recurring_type: 'none',
            created_at: new Date().toISOString(),
            category: updates.category ?? virtualTask.category,
            priority: updates.priority ?? virtualTask.priority,
            due_date: updates.due_date !== undefined ? updates.due_date : virtualTask.due_date,
            notes: updates.notes !== undefined ? updates.notes : virtualTask.notes,
            remind_at: updates.remind_at !== undefined ? updates.remind_at : virtualTask.remind_at,
            section_id: updates.section_id !== undefined ? updates.section_id : virtualTask.section_id,
            order: virtualTask.order,
            original_task_id: virtualTask.original_task_id || virtualTask.id.replace(/^virtual-/, '').split(/-\d{4}-\d{2}-\d{2}$/)[0],
            parent_task_id: virtualTask.parent_task_id,
            link: updates.link !== undefined ? updates.link : virtualTask.link,
        };

        setTasks(prev => [...prev, { ...newInstanceDataForUI, category_color: allCategoriesRef.current.find(cat => cat.id === newInstanceDataForUI.category)?.color || 'gray' }]);

        const { data, error } = await supabase
            .from('tasks')
            .insert(cleanTaskForDb(newInstanceDataForUI))
            .select('id, description, status, recurring_type, created_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link')
            .single();

        if (error) throw error;

        setTasks(prev => prev.map(t => t.id === newInstanceId ? { ...data, category_color: allCategoriesRef.current.find(cat => cat.id === data.category)?.color || 'gray' } : t));
        showSuccess('Task updated!');
        
        if (data.remind_at && data.status === 'to-do') {
            const d = parseISO(data.remind_at);
            if (isValid(d)) addReminder(data.id, `Reminder: ${data.description}`, d);
        }
        return data.id;
      }

      inFlightUpdatesRef.current.add(idToTrack);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates, ...(color && { category_color: color }) } : t));

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
        if (isValid(d) && (updates.status === undefined || updates.status === 'to-do')) addReminder(taskId, `Reminder: ${originalTaskState.description}`, d);
      }
      if (updates.status === 'completed' || updates.status === 'archived' || updates.remind_at === null) {
        dismissReminder(taskId);
      }
      return data.id;
    } catch (e: any) {
      showError('Failed to update task.');
      if (originalTaskState) {
        setTasks(prev => prev.map(t => t.id === taskId ? originalTaskState! : t));
      }
      return null;
    } finally {
      inFlightUpdatesRef.current.delete(idToTrack);
    }
  }, [userId, tasks, processedTasks, addReminder, dismissReminder]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const originalTasks = [...tasks];
    try {
      const taskToDelete: Task | undefined = tasks.find(t => t.id === taskId);
      if (!taskToDelete) return;

      let idsToDelete = [taskId];
      const subIds = tasks.filter(t => t.parent_task_id === taskId).map(t => t.id);
      idsToDelete = [...idsToDelete, ...subIds];
      if (taskToDelete.recurring_type !== 'none' && taskToDelete.original_task_id === null) {
        const inst = tasks.filter(t => t.original_task_id === taskId).map(t => t.id);
        idsToDelete = [...idsToDelete, ...inst];
      }
      
      idsToDelete.forEach(id => inFlightUpdatesRef.current.add(id));
      setTasks(prev => prev.filter(t => !idsToDelete.includes(t.id)));

      const { error } = await supabase.from('tasks').delete().in('id', idsToDelete).eq('user_id', userId).select('id');
      if (error) throw error;
      showSuccess('Task(s) deleted!');
      idsToDelete.forEach(dismissReminder);
    } catch (e: any) {
      showError('Failed to delete task.');
      console.error(`useTasks: Error deleting task(s) from DB:`, e.message);
      setTasks(originalTasks);
    } finally {
      const taskToDelete: Task | undefined = originalTasks.find(t => t.id === taskId);
      if (taskToDelete) {
        let idsToDelete = [taskId];
        const subIds = originalTasks.filter(t => t.parent_task_id === taskId).map(t => t.id);
        idsToDelete = [...idsToDelete, ...subIds];
        if (taskToDelete.recurring_type !== 'none' && taskToDelete.original_task_id === null) {
          const inst = originalTasks.filter(t => t.original_task_id === taskId).map(t => t.id);
          idsToDelete = [...idsToDelete, ...inst];
        }
        idsToDelete.forEach(id => inFlightUpdatesRef.current.delete(id));
      }
    }
  }, [userId, tasks, dismissReminder]);

  const bulkUpdateTasks = useCallback(async (updates: Partial<Task>, ids: string[]) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    if (ids.length === 0) {
      return;
    }
    ids.forEach(id => inFlightUpdatesRef.current.add(id));
    const original = [...tasks];
    try {
      setTasks(prev =>
        prev.map(t => (ids.includes(t.id) ? { ...t, ...updates } : t))
      );

      const { error } = await supabase
        .from('tasks')
        .update(cleanTaskForDb(updates))
        .in('id', ids)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Tasks updated!');
    } catch (e: any) {
      showError('Failed to update tasks.');
      console.error(`useTasks: Error during bulk update for tasks ${ids.join(', ')}:`, e.message);
      setTasks(original);
    } finally {
      ids.forEach(id => inFlightUpdatesRef.current.delete(id));
    }
  }, [tasks, userId]);

  const archiveAllCompletedTasks = useCallback(async () => {
    if (!userId) {
        showError('User not authenticated.');
        return;
    }
    const completedTaskIds = processedTasks
        .filter(task => task.status === 'completed')
        .map(task => task.id);

    if (completedTaskIds.length === 0) {
        showSuccess('No completed tasks to archive!');
        return;
    }
    await bulkUpdateTasks({ status: 'archived' }, completedTaskIds);
  }, [userId, processedTasks, bulkUpdateTasks]);

  const markAllTasksInSectionCompleted = useCallback(async (sectionId: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const tasksToComplete = tasks.filter(t =>
      t.status === 'to-do' &&
      t.parent_task_id === null &&
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
      console.error('useTasks: Error creating section:', e.message);
    }
  }, [userId, sections.length]);

  const updateSection = useCallback(async (sectionId: string, newName: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
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
      console.error(`useTasks: Error updating section ${sectionId}:`, e.message);
      setSections(originalSections);
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
      showSuccess('Section deleted!');
    }
    catch (e: any) {
      showError('Failed to delete section.');
      console.error(`useTasks: Error deleting section ${sectionId}:`, e.message);
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
      console.error(`useTasks: Error updating focus mode for section ${sectionId}:`, e.message);
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
      name: s.name,
      order: i,
      user_id: userId,
      include_in_focus_mode: s.include_in_focus_mode,
    }));

    setSections(newOrderedSections);

    const updatedIds = updates.map(s => s.id);
    updatedIds.forEach(id => inFlightUpdatesRef.current.add(id));

    try {
      const { error } = await supabase.from('task_sections').upsert(updates, { onConflict: 'id' });
      if (error) throw error;
      showSuccess('Sections reordered!');
    } catch (e: any) {
      showError('Failed to reorder sections.');
      console.error('useTasks: Error reordering sections:', e.message);
      setSections(sections);
    } finally {
      updatedIds.forEach(id => inFlightUpdatesRef.current.delete(id));
    }
  }, [userId, sections]);

  const updateTaskParentAndOrder = useCallback(async (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    
    const originalTasks = [...tasks];
    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) {
      return;
    }

    // Optimistic UI update
    let tempTasks = tasks.map(t => ({ ...t }));
    const activeTaskIndex = tempTasks.findIndex(t => t.id === activeId);
    const [movedTask] = tempTasks.splice(activeTaskIndex, 1);

    movedTask.parent_task_id = newParentId;
    movedTask.section_id = newSectionId;

    let insertionIndex = -1;
    if (overId) {
      insertionIndex = tempTasks.findIndex(t => t.id === overId);
    } else if (newSectionId) {
      insertionIndex = tempTasks.findIndex(t => t.section_id === newSectionId && t.parent_task_id === null);
    } else if (newParentId) {
      insertionIndex = tempTasks.findIndex(t => t.parent_task_id === newParentId);
    }

    if (insertionIndex !== -1) {
      tempTasks.splice(insertionIndex, 0, movedTask);
    } else {
      tempTasks.push(movedTask);
    }

    const updatesForDb: any[] = [];
    const groupsToUpdate = new Map<string, Task[]>();
    tempTasks.forEach(t => {
      const key = `${t.parent_task_id || 'root'}-${t.section_id || 'no-section'}`;
      if (!groupsToUpdate.has(key)) groupsToUpdate.set(key, []);
      groupsToUpdate.get(key)!.push(t);
    });

    const originalTasksMap = new Map(originalTasks.map(t => [t.id, t]));
    groupsToUpdate.forEach(group => {
      group.forEach((task, index) => {
        const originalTask = originalTasksMap.get(task.id);
        if (!originalTask || originalTask.order !== index || originalTask.parent_task_id !== task.parent_task_id || originalTask.section_id !== task.section_id) {
          const updatedTaskData = {
            ...task,
            order: index,
            parent_task_id: task.parent_task_id,
            section_id: task.section_id,
          };
          updatesForDb.push(cleanTaskForDb(updatedTaskData));
        }
      });
    });

    // Add all IDs being updated to the in-flight ref
    const updatedIds = updatesForDb.map(t => t.id);
    updatedIds.forEach(id => inFlightUpdatesRef.current.add(id));

    setTasks(tempTasks);

    try {
      if (updatesForDb.length > 0) {
        const { error } = await supabase.from('tasks').upsert(updatesForDb, { onConflict: 'id' });
        if (error) throw error;
      }
      showSuccess('Task moved!');
    } catch (e: any) {
      showError('Failed to move task.');
      setTasks(originalTasks);
    } finally {
      // Remove all updated IDs from the in-flight ref
      updatedIds.forEach(id => inFlightUpdatesRef.current.delete(id));
    }
  }, [userId, tasks]);

  const finalFilteredTasks = useMemo(() => {
    let filtered = processedTasks;

    if (viewMode === 'daily') {
      filtered = filtered.filter(task => {
        const taskCreatedAt = getUTCStartOfDay(parseISO(task.created_at));
        const isCreatedOnThisDay = isSameDay(taskCreatedAt, effectiveCurrentDate);
        const isCarryOver = isBefore(taskCreatedAt, effectiveCurrentDate) && task.status === 'to-do';
        return isCreatedOnThisDay || isCarryOver;
      });
    }

    if (searchFilter) {
      filtered = filtered.filter(task =>
        task.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.link?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    if (viewMode === 'archive') {
      filtered = filtered.filter(task => task.status === 'archived');
    } else {
      if (statusFilter !== 'all') {
        filtered = filtered.filter(task => task.status === statusFilter);
      } else {
        filtered = filtered.filter(task => task.status !== 'archived');
      }
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(task => task.category === categoryFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    if (sectionFilter !== 'all') {
      if (sectionFilter === 'no-section') {
        filtered = filtered.filter(task => task.section_id === null);
      } else {
        filtered = filtered.filter(task => task.section_id === sectionFilter);
      }
    }

    if (userSettings?.hide_future_tasks && viewMode === 'daily') {
      const today = startOfDay(effectiveCurrentDate);
      filtered = filtered.filter(task => {
        if (!task.due_date) {
          return true; // Always show tasks without a due date
        }
        const dueDate = startOfDay(parseISO(task.due_date));
        return !isAfter(dueDate, today);
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
    userSettings?.hide_future_tasks,
  ]);

  const setFocusTask = useCallback(async (taskId: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    
    let finalTaskId = taskId;
    if (taskId && taskId.startsWith('virtual-')) {
      const newRealTaskId = await updateTask(taskId, {});
      if (!newRealTaskId) {
        showError('Failed to create a real task instance to focus on.');
        return;
      }
      finalTaskId = newRealTaskId;
    }

    const success = await updateSettings({ focused_task_id: finalTaskId });
    if (success) {
      showSuccess(finalTaskId ? 'Task set as focus!' : 'Focus cleared.');
    } else {
      showError('Failed to set focus task.');
    }
  }, [userId, updateSettings, updateTask]);

  const nextAvailableTask = useMemo(() => {
    const focusedTaskId = userSettings?.focused_task_id;
    if (focusedTaskId) {
      const focusedTask = processedTasks.find(t => t.id === focusedTaskId);
      if (focusedTask && focusedTask.status === 'to-do' && (focusedTask.recurring_type !== 'none' || !doTodayOffIds.has(focusedTask.original_task_id || focusedTask.id))) {
        return focusedTask;
      }
    }

    const relevantTasks = processedTasks.filter(task =>
      task.status === 'to-do' &&
      task.parent_task_id === null &&
      (task.recurring_type !== 'none' || !doTodayOffIds.has(task.original_task_id || task.id))
    );

    const tasksBySection = new Map<string | null, Task[]>();
    relevantTasks.forEach(task => {
      const sectionId = task.section_id || null;
      if (!tasksBySection.has(sectionId)) {
        tasksBySection.set(sectionId, []);
      }
      tasksBySection.get(sectionId)!.push(task);
    });

    tasksBySection.forEach((tasksInSection) => {
      tasksInSection.sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    for (const section of sections) {
      const tasksInSection = tasksBySection.get(section.id);
      if (tasksInSection && tasksInSection.length > 0) {
        return tasksInSection[0];
      }
    }

    const tasksInNoSection = tasksBySection.get(null);
    if (tasksInNoSection && tasksInNoSection.length > 0) {
      return tasksInNoSection[0];
    }

    return null;
  }, [processedTasks, sections, userSettings?.focused_task_id, doTodayOffIds]);

  const toggleDoToday = useCallback(async (task: Task) => {
    if (!userId) return;
    const taskIdToLog = task.original_task_id || task.id;
    const formattedDate = format(effectiveCurrentDate, 'yyyy-MM-dd');
    const isCurrentlyOn = !doTodayOffIds.has(taskIdToLog);

    setDoTodayOffIds(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyOn) {
            newSet.add(taskIdToLog);
        } else {
            newSet.delete(taskIdToLog);
        }
        return newSet;
    });

    try {
        if (isCurrentlyOn) {
            const { error } = await supabase
                .from('do_today_off_log')
                .insert({ user_id: userId, task_id: taskIdToLog, off_date: formattedDate });
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('do_today_off_log')
                .delete()
                .eq('user_id', userId)
                .eq('task_id', taskIdToLog)
                .eq('off_date', formattedDate);
            if (error) throw error;
        }
    } catch (e: any) {
        showError("Failed to sync 'Do Today' setting.");
        setDoTodayOffIds(prev => {
            const newSet = new Set(prev);
            if (isCurrentlyOn) {
                newSet.delete(taskIdToLog);
            } else {
                newSet.add(taskIdToLog);
            }
            return newSet;
        });
    }
  }, [userId, effectiveCurrentDate, doTodayOffIds]);

  const toggleAllDoToday = useCallback(async () => {
    if (!userId) return;

    const nonRecurringTasks = finalFilteredTasks.filter(t => t.recurring_type === 'none');
    if (nonRecurringTasks.length === 0) {
      showSuccess("No non-recurring tasks to toggle.");
      return;
    }

    const nonRecurringTaskIds = nonRecurringTasks.map(t => t.original_task_id || t.id);
    const currentlyOnCount = nonRecurringTasks.filter(t => !doTodayOffIds.has(t.original_task_id || t.id)).length;
    const turnAllOff = currentlyOnCount > nonRecurringTasks.length / 2;

    const formattedDate = format(effectiveCurrentDate, 'yyyy-MM-dd');
    const originalOffIds = new Set(doTodayOffIds);

    if (turnAllOff) {
      const newOffIds = new Set(nonRecurringTaskIds);
      setDoTodayOffIds(newOffIds);
      try {
        await supabase.from('do_today_off_log').delete().eq('user_id', userId).eq('off_date', formattedDate);
        const recordsToInsert = nonRecurringTaskIds.map(taskId => ({ user_id: userId, task_id: taskId, off_date: formattedDate }));
        if (recordsToInsert.length > 0) {
          const { error } = await supabase.from('do_today_off_log').insert(recordsToInsert);
          if (error) throw error;
        }
        showSuccess("All tasks toggled off for today.");
      } catch (e: any) {
        showError("Failed to sync 'Do Today' settings.");
        setDoTodayOffIds(originalOffIds);
      }
    } else {
      setDoTodayOffIds(new Set());
      try {
        const { error } = await supabase.from('do_today_off_log').delete().eq('user_id', userId).eq('off_date', formattedDate);
        if (error) throw error;
        showSuccess("All tasks toggled on for today.");
      } catch (e: any) {
        showError("Failed to sync 'Do Today' settings.");
        setDoTodayOffIds(originalOffIds);
      }
    }
  }, [userId, finalFilteredTasks, doTodayOffIds, effectiveCurrentDate]);

  return {
    tasks,
    filteredTasks: finalFilteredTasks,
    nextAvailableTask,
    loading,
    currentDate: effectiveCurrentDate,
    setCurrentDate: setInternalCurrentDate,
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
    moveTask: () => Promise.resolve(),
    bulkUpdateTasks,
    archiveAllCompletedTasks,
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    reorderSections,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
  };
};