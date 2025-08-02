"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { useReminders } from '@/context/ReminderContext';
import { v4 as uuidv4 } from 'uuid';
import { isSameDay, parseISO, isValid, isBefore, format, setHours, setMinutes, getHours, getMinutes } from 'date-fns'; // Added date-fns imports for recurring logic
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
  currentDate?: Date;
  setCurrentDate?: React.Dispatch<React.SetStateAction<Date>>;
  viewMode?: 'daily' | 'archive' | 'focus';
}

export const useTasks = ({ currentDate, setCurrentDate, viewMode = 'daily' }: UseTasksProps = {}) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const { addReminder, dismissReminder } = useReminders();

  const [tasks, setTasks] = useState<Task[]>([]); // All tasks from DB
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const categoriesMap = useMemo(() => {
    const map = new Map<string, string>();
    allCategories.forEach(c => map.set(c.id, c.color));
    return map;
  }, [allCategories]);

  // Modified fetchDataAndSections to accept userId as an argument and have an empty dependency array
  const fetchDataAndSections = useCallback(async (currentUserId: string) => {
    setLoading(true);
    console.log('useTasks: Starting fetchDataAndSections for user:', currentUserId);
    try {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('task_sections')
        .select('id, name, user_id, order, include_in_focus_mode')
        .eq('user_id', currentUserId)
        .order('order', { ascending: true })
        .order('name', { ascending: true });
      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);
      console.log('useTasks: Fetched sections:', sectionsData?.length);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('task_categories')
        .select('id, name, color, user_id, created_at')
        .eq('user_id', currentUserId);
      if (categoriesError) throw categoriesError;
      setAllCategories(categoriesData || []);
      console.log('useTasks: Fetched categories:', categoriesData?.length);

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, description, status, recurring_type, created_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: true }); // Order by created_at for consistent processing
      if (tasksError) throw tasksError;

      const mapped = (tasksData || []).map((t: any) => ({
        ...t,
        category_color: categoriesMap.get(t.category) || 'gray',
      })) as Task[];

      setTasks(mapped);
      console.log('useTasks: Fetched tasks:', mapped.length);
    } catch (e: any) {
      console.error('useTasks: Error in fetchDataAndSections:', e.message);
      showError('Failed to load data.');
    } finally {
      setLoading(false);
      console.log('useTasks: Finished fetchDataAndSections.');
    }
  }, [categoriesMap]); // categoriesMap is correctly outside this dependency array

  useEffect(() => {
    if (!authLoading && userId) fetchDataAndSections(userId); // Pass userId here
    if (!authLoading && !userId) {
      setTasks([]);
      setSections([]);
      setAllCategories([]);
      setLoading(false);
      console.log('useTasks: User not authenticated, clearing local data.');
    }
  }, [authLoading, userId, fetchDataAndSections]); // fetchDataAndSections is now stable


  // --- Realtime Subscription for Tasks and Sections ---
  useEffect(() => {
    if (!userId) return;

    const tasksChannel = supabase
      .channel('tasks_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('useTasks: Realtime task change received:', payload.eventType, (payload.new as any)?.id || (payload.old as any)?.id);
          fetchDataAndSections(userId); // Pass userId to the callback
        }
      )
      .subscribe();
    
    const sectionsChannel = supabase
      .channel('sections_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_sections',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('useTasks: Realtime section change received:', payload.eventType, (payload.new as any)?.id || (payload.old as any)?.id);
          fetchDataAndSections(userId); // Pass userId to the callback
        }
      )
      .subscribe();

    const categoriesChannel = supabase
      .channel('categories_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_categories',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('useTasks: Realtime category change received:', payload.eventType, (payload.new as any)?.id || (payload.old as any)?.id);
          fetchDataAndSections(userId); // Pass userId to the callback
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(sectionsChannel);
      supabase.removeChannel(categoriesChannel);
      console.log('useTasks: Unsubscribed from realtime channels.');
    };
  }, [userId, fetchDataAndSections]);


  // --- Recurring Task Processing Logic ---
  const processedTasks = useMemo(() => {
    const today = currentDate || new Date();
    const todayStart = getUTCStartOfDay(today);
    const allProcessedTasks: Task[] = [];
    const processedSeriesIds = new Set<string>(); // To track which recurring series have been handled

    // Group tasks by their original_task_id or their own id if they are templates
    const taskSeriesMap = new Map<string, Task[]>(); // Key: original_task_id or task.id if it's a template
    tasks.forEach(task => {
        const seriesId = task.original_task_id || task.id;
        if (!taskSeriesMap.has(seriesId)) {
            taskSeriesMap.set(seriesId, []);
        }
        taskSeriesMap.get(seriesId)!.push(task);
    });

    taskSeriesMap.forEach((seriesInstances, seriesId) => {
        if (processedSeriesIds.has(seriesId)) return; // Already processed this series

        const templateTask = seriesInstances.find(t => t.id === seriesId); // The task that is the "template" for the series
        if (!templateTask) return; // Should not happen

        if (templateTask.recurring_type === 'none') {
            // Non-recurring task: include if created on current day or is a carry-over 'to-do'
            const taskCreatedAt = getUTCStartOfDay(parseISO(templateTask.created_at));
            if (isSameDay(taskCreatedAt, todayStart) || (isBefore(taskCreatedAt, todayStart) && templateTask.status === 'to-do')) {
                allProcessedTasks.push(templateTask);
            }
        } else {
            // This is a recurring series
            processedSeriesIds.add(seriesId); // Mark this series as processed

            // Sort instances by creation date, most recent first
            const sortedInstances = [...seriesInstances].sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime());

            let relevantInstanceForToday: Task | null = null;

            // 1. Find an instance created specifically for today
            const instanceCreatedToday = sortedInstances.find(t =>
                isSameDay(getUTCStartOfDay(parseISO(t.created_at)), todayStart) && t.status !== 'archived'
            );

            if (instanceCreatedToday) {
                relevantInstanceForToday = instanceCreatedToday;
            } else {
                // 2. Find the latest incomplete carry-over instance from a previous day
                const carryOverInstance = sortedInstances.find(t =>
                    isBefore(getUTCStartOfDay(parseISO(t.created_at)), todayStart) && t.status === 'to-do'
                );
                if (carryOverInstance) {
                    relevantInstanceForToday = carryOverInstance;
                }
            }

            if (relevantInstanceForToday) {
                allProcessedTasks.push(relevantInstanceForToday);
            } else {
                // 3. If no existing instance or carry-over, generate a new VIRTUAL instance for today
                // Check if the recurring type matches the current day
                const templateCreatedAt = parseISO(templateTask.created_at);
                const isDailyMatch = templateTask.recurring_type === 'daily';
                const isWeeklyMatch = templateTask.recurring_type === 'weekly' && todayStart.getUTCDay() === templateCreatedAt.getUTCDay();
                const isMonthlyMatch = templateTask.recurring_type === 'monthly' && todayStart.getUTCDate() === templateCreatedAt.getUTCDate();

                if (isDailyMatch || isWeeklyMatch || isMonthlyMatch) {
                    // Only generate if the template itself is not archived
                    if (templateTask.status !== 'archived') {
                        const virtualTask: Task = {
                            ...templateTask,
                            id: uuidv4(), // Assign a new virtual ID
                            created_at: todayStart.toISOString(), // Set created_at to today
                            status: 'to-do', // New instances are always 'to-do'
                            original_task_id: templateTask.id, // Link to the original template
                            // Reset or re-calculate specific fields for the new instance
                            notes: null, // Clear notes for new instance
                            // Carry over time for remind_at, but set date to today
                            remind_at: templateTask.remind_at ? format(setHours(setMinutes(todayStart, getMinutes(parseISO(templateTask.remind_at))), getHours(parseISO(templateTask.remind_at))), 'yyyy-MM-ddTHH:mm:ssZ') : null,
                            // Due date should be today if the template had one, otherwise null
                            due_date: templateTask.due_date ? todayStart.toISOString() : null,
                        };
                        allProcessedTasks.push(virtualTask);
                    }
                }
            }
        }
    });
    return allProcessedTasks;
  }, [tasks, currentDate]); // Depends on all tasks and current date

  const handleAddTask = useCallback(async (newTaskData: NewTaskData) => {
    if (!userId) {
      showError('User not authenticated.');
      console.error('useTasks: handleAddTask - User not authenticated.');
      return false;
    }
    const categoryColor = categoriesMap.get(newTaskData.category) || 'gray';
    const parentId = newTaskData.parent_task_id || null;
    
    // Determine order based on processed tasks for the current view
    const siblings = processedTasks // Use processedTasks for order calculation
      .filter(t =>
        (parentId === null && t.parent_task_id === null && (t.section_id === newTaskData.section_id || (t.section_id === null && newTaskData.section_id === null))) ||
        (parentId !== null && t.parent_task_id === parentId)
      )
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const newOrder = siblings.length;

    const newTask: Task = {
      id: uuidv4(),
      user_id: userId,
      created_at: (currentDate || new Date()).toISOString(),
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

    console.log('useTasks: handleAddTask - Attempting optimistic update for new task:', newTask.id);
    // Optimistic update: add to raw tasks, which will trigger processedTasks re-memoization
    setTasks(prev => [...prev, newTask]);

    try {
      console.log('useTasks: handleAddTask - Inserting task into DB:', cleanTaskForDb(newTask));
      const { data, error } = await supabase
        .from('tasks')
        .insert(cleanTaskForDb(newTask))
        .select('id, description, status, recurring_type, created_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link')
        .single();

      if (error) throw error;
      console.log('useTasks: handleAddTask - DB insert successful, received data:', data.id);
      // Update with actual data from DB (e.g., if default values were set by DB)
      setTasks(prev => prev.map(t => t.id === newTask.id ? { ...data, category_color: categoriesMap.get(data.category) || 'gray' } : t));
      showSuccess('Task added successfully!');

      if (newTask.remind_at) {
        const d = parseISO(newTask.remind_at);
        if (isValid(d)) addReminder(newTask.id, `Reminder: ${newTask.description}`, d);
      }
      return true;
    } catch (e: any) {
      console.error('useTasks: handleAddTask - Error adding task:', e.message);
      showError('Failed to add task.');
      // Rollback optimistic update
      console.log('useTasks: handleAddTask - Rolling back optimistic update for task:', newTask.id);
      setTasks(prev => prev.filter(t => t.id !== newTask.id));
      return false;
    }
  }, [userId, currentDate, categoriesMap, processedTasks, addReminder]); // Added processedTasks to dependencies

  const updateTask = useCallback(async (taskId: string, updates: TaskUpdate) => {
    if (!userId) {
      showError('User not authenticated.');
      console.error('useTasks: updateTask - User not authenticated.');
      return;
    }
    let color: string | undefined;
    if (updates.category) color = categoriesMap.get(updates.category) || 'gray';

    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask) {
      console.warn('useTasks: updateTask - Task not found for update:', taskId);
      return;
    }

    console.log('useTasks: updateTask - Attempting optimistic update for task:', taskId, 'with updates:', updates);
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates, ...(color && { category_color: color }) } : t));

    try {
      console.log('useTasks: updateTask - Updating task in DB:', taskId, 'payload:', cleanTaskForDb(updates));
      const { error, data } = await supabase
        .from('tasks')
        .update(cleanTaskForDb(updates))
        .eq('id', taskId)
        .eq('user_id', userId)
        .select('id, description, status, recurring_type, created_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link')
        .single();

      if (error) throw error;
      console.log('useTasks: updateTask - DB update successful for task:', data.id);
      
      // Ensure local state is fully consistent with DB response
      setTasks(prev => prev.map(t => t.id === taskId ? { ...data, category_color: categoriesMap.get(data.category) || 'gray' } : t));
      showSuccess('Task updated!');

      if (updates.remind_at) {
        const d = parseISO(updates.remind_at as string);
        if (isValid(d) && (updates.status === undefined || updates.status === 'to-do')) addReminder(taskId, `Reminder: ${originalTask.description}`, d);
      }
      if (updates.status === 'completed' || updates.status === 'archived' || updates.remind_at === null) {
        dismissReminder(taskId);
      }
    } catch (e: any) {
      console.error('useTasks: updateTask - Error updating task:', e.message);
      showError('Failed to update task.');
      // Rollback optimistic update
      console.log('useTasks: updateTask - Rolling back optimistic update for task:', taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? originalTask : t));
    }
  }, [userId, categoriesMap, tasks, addReminder, dismissReminder]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      console.error('useTasks: deleteTask - User not authenticated.');
      return;
    }
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) {
      console.warn('useTasks: deleteTask - Task not found for deletion:', taskId);
      return;
    }
    let idsToDelete = [taskId];
    const subIds = tasks.filter(t => t.parent_task_id === taskId).map(t => t.id);
    idsToDelete = [...idsToDelete, ...subIds];
    if (taskToDelete.recurring_type !== 'none' && taskToDelete.original_task_id === null) {
      const inst = tasks.filter(t => t.original_task_id === taskId).map(t => t.id);
      idsToDelete = [...idsToDelete, ...inst];
    }
    
    const originalTasks = [...tasks]; // For rollback

    console.log('useTasks: deleteTask - Attempting optimistic delete for tasks:', idsToDelete);
    // Optimistic update
    setTasks(prev => prev.filter(t => !idsToDelete.includes(t.id)));

    try {
      console.log('useTasks: deleteTask - Deleting tasks from DB:', idsToDelete);
      const { error } = await supabase.from('tasks').delete().in('id', idsToDelete).eq('user_id', userId).select('id');
      if (error) throw error;
      console.log('useTasks: deleteTask - DB delete successful for tasks:', idsToDelete);
      showSuccess('Task(s) deleted!');
      idsToDelete.forEach(dismissReminder);
    } catch (e: any) {
      console.error('useTasks: deleteTask - Error deleting task:', e.message);
      showError('Failed to delete task.');
      // Rollback optimistic update
      console.log('useTasks: deleteTask - Rolling back optimistic delete.');
      setTasks(originalTasks);
    }
  }, [userId, tasks, dismissReminder]);

  // DnD: move within/among sections and as subtasks
  const updateTaskParentAndOrder = useCallback(async (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      console.error('useTasks: updateTaskParentAndOrder - User not authenticated.');
      return;
    }
    const originalTasks = [...tasks];
    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) {
      console.warn('useTasks: updateTaskParentAndOrder - Active task not found:', activeId);
      return;
    }

    const isDescendant = (parentId: string | null, childId: string): boolean => {
      if (!parentId) return false;
      if (parentId === childId) return true;
      const parent = tasks.find(t => t.id === parentId);
      return parent ? isDescendant(parent.parent_task_id, childId) : false;
    };
    if (isDescendant(newParentId, activeTask.id)) {
      console.warn('useTasks: updateTaskParentAndOrder - Refusing to make task a child of its own descendant:', { activeId, newParentId });
      return;
    }

    console.log('useTasks: updateTaskParentAndOrder - Starting DND update for task:', activeId, 'from:', { parent: activeTask.parent_task_id, section: activeTask.section_id }, 'to:', { newParentId, newSectionId, overId });

    const updates: Partial<Task>[] = [];

    // Reindex old siblings
    const oldParentIsSection = activeTask.parent_task_id === null;
    const oldSiblings = tasks.filter(t => {
      if (oldParentIsSection) {
        return t.parent_task_id === null && (t.section_id === activeTask.section_id || (t.section_id === null && activeTask.section_id === null));
      } else {
        return t.parent_task_id === activeTask.parent_task_id;
      }
    }).filter(t => t.id !== activeId).sort((a, b) => (a.order || 0) - (b.order || 0));
    oldSiblings.forEach((t, i) => updates.push({ id: t.id, order: i }));

    // Target siblings
    let targetSiblings: Task[] = [];
    if (newParentId === null) {
      targetSiblings = tasks.filter(t => t.parent_task_id === null && (t.section_id === newSectionId || (t.section_id === null && newSectionId === null)))
        .filter(t => t.id !== activeId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    } else {
      targetSiblings = tasks.filter(t => t.parent_task_id === newParentId)
        .filter(t => t.id !== activeId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    let newOrder = targetSiblings.length;
    if (overId) {
      const overIndex = targetSiblings.findIndex(t => t.id === overId);
      if (overIndex !== -1) newOrder = overIndex;
    }

    const temp = [...targetSiblings];
    temp.splice(newOrder, 0, activeTask);
    temp.forEach((t, idx) => updates.push({ id: t.id, order: idx }));

    updates.push({
      id: activeTask.id,
      parent_task_id: newParentId,
      section_id: newParentId ? (tasks.find(t => t.id === newParentId)?.section_id ?? newSectionId ?? null) : newSectionId,
      order: newOrder,
    });

    // Cascade section to descendants when parent/section changes
    if (activeTask.parent_task_id !== newParentId) {
      const cascadeSectionId = newParentId ? (tasks.find(t => t.id === newParentId)?.section_id ?? newSectionId ?? null) : newSectionId;
      const queue = [activeTask.id];
      const visited = new Set<string>();
      while (queue.length) {
        const pid = queue.shift()!;
        if (visited.has(pid)) continue;
        visited.add(pid);
        const children = tasks.filter(t => t.parent_task_id === pid);
        children.forEach(child => {
          updates.push({ id: child.id, section_id: cascadeSectionId });
          queue.push(child.id);
        });
      }
    }

    console.log('useTasks: updateTaskParentAndOrder - Updates prepared for optimistic update:', updates);

    // Optimistic update
    setTasks(prev => {
      const map = new Map(updates.map(u => [u.id!, u]));
      return prev.map(t => map.has(t.id) ? { ...t, ...map.get(t.id)! } : t);
    });

    try {
      const updatesWithUser = updates.map(u => ({ ...(cleanTaskForDb(u) as any), user_id: userId }));
      console.log('useTasks: updateTaskParentAndOrder - Upserting changes to DB:', updatesWithUser);
      const { error } = await supabase.from('tasks').upsert(updatesWithUser, { onConflict: 'id' });
      if (error) throw error;
      showSuccess('Task moved!');
      console.log('useTasks: updateTaskParentAndOrder - DB upsert successful.');
    } catch (e: any) {
      console.error('useTasks: updateTaskParentAndOrder - Upsert failed:', e.message);
      showError('Failed to move task.');
      // Rollback optimistic update
      console.log('useTasks: updateTaskParentAndOrder - Rolling back optimistic update.');
      setTasks(originalTasks);
    }
  }, [userId, tasks]);

  const moveTask = useCallback(async (taskId: string, direction: 'up' | 'down') => {
    if (!userId) {
      showError('User not authenticated.');
      console.error('useTasks: moveTask - User not authenticated.');
      return;
    }
    const originalTasks = [...tasks]; // Capture original state for rollback
    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove) {
      showError('Task not found.');
      console.warn('useTasks: moveTask - Task not found in its parent list for reorder:', taskId);
      return;
    }
    const isParentSection = taskToMove.parent_task_id === null;
    const siblings = tasks
      .filter(t => isParentSection
        ? t.parent_task_id === null && (t.section_id === taskToMove.section_id || (t.section_id === null && taskToMove.section_id === null))
        : t.parent_task_id === taskToMove.parent_task_id
      )
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const currentIndex = siblings.findIndex(t => t.id === taskId);
    if (currentIndex === -1) {
      showError('Internal error: Task not found in its parent list.');
      console.error('useTasks: moveTask - Task not found in its parent list for reorder:', taskId);
      return;
    }
    let newIndex = currentIndex;
    if (direction === 'up') {
      if (currentIndex === 0) return showError('Task is already at the top.');
      newIndex = currentIndex - 1;
    } else {
      if (currentIndex === siblings.length - 1) return showError('Task is already at the bottom.');
      newIndex = currentIndex + 1;
    }

    const newOrdered = arrayMove(siblings, currentIndex, newIndex);
    const updates = newOrdered.map((t, idx) => ({ id: t.id, order: idx }));

    console.log('useTasks: moveTask - Attempting optimistic reorder for task:', taskId, 'direction:', direction, 'updates:', updates);

    // Optimistic update
    setTasks(prev => {
      const map = new Map(updates.map(u => [u.id, u]));
      return prev.map(t => map.has(t.id) ? { ...t, ...map.get(t.id)! } : t);
    });

    try {
      const updatesWithUser = updates.map(u => ({ ...(cleanTaskForDb(u) as any), user_id: userId }));
      console.log('useTasks: moveTask - Upserting reorder changes to DB:', updatesWithUser);
      const { error } = await supabase.from('tasks').upsert(updatesWithUser, { onConflict: 'id' });
      if (error) throw error;
      showSuccess('Task reordered!');
      console.log('useTasks: moveTask - DB upsert successful.');
    } catch (e: any) {
      console.error('useTasks: moveTask - Upsert failed:', e.message);
      showError('Failed to reorder task.');
      // Rollback optimistic update
      console.log('useTasks: moveTask - Rolling back optimistic reorder.');
      setTasks(originalTasks); 
    }
  }, [userId, tasks]);

  // Bulk actions
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]); 
  const toggleTaskSelection = useCallback((taskId: string, checked: boolean) => {
    setSelectedTaskIds(prev => checked ? [...prev, taskId] : prev.filter(id => id !== taskId));
  }, []);
  const clearSelectedTasks = useCallback(() => setSelectedTaskIds([]), []);

  const bulkUpdateTasks = useCallback(async (updates: Partial<Task>, ids: string[] = selectedTaskIds) => {
    if (!userId) {
      showError('User not authenticated.');
      console.error('useTasks: bulkUpdateTasks - User not authenticated.');
      return;
    }
    if (ids.length === 0) {
      console.warn('useTasks: bulkUpdateTasks - No tasks selected for bulk update.');
      return;
    }

    let updatedCategoryColor: string | undefined;
    if (updates.category) {
      updatedCategoryColor = categoriesMap.get(updates.category) || 'gray';
    }

    const originalTasks = [...tasks]; // For rollback

    console.log('useTasks: bulkUpdateTasks - Attempting optimistic bulk update for IDs:', ids, 'with updates:', updates);
    // Optimistic update
    setTasks(prev => prev.map(task => 
      ids.includes(task.id) ? { ...task, ...updates, ...(updatedCategoryColor && { category_color: updatedCategoryColor }) } : task
    ));

    try {
      const dbUpdates = cleanTaskForDb(updates);
      console.log('useTasks: bulkUpdateTasks - Updating tasks in DB for IDs:', ids, 'payload:', dbUpdates);
      await supabase
        .from('tasks')
        .update(dbUpdates)
        .in('id', ids)
        .eq('user_id', userId)
        .select('id');
      showSuccess(`${ids.length} tasks updated successfully!`);
      clearSelectedTasks();
      console.log('useTasks: bulkUpdateTasks - DB update successful.');
      
      ids.forEach(id => {
        const updatedTask = tasks.find(t => t.id === id); // Find from current state after optimistic update
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
      console.error('useTasks: bulkUpdateTasks - Error bulk updating tasks:', error.message);
      showError('Failed to update tasks in bulk.');
      // Rollback optimistic update
      console.log('useTasks: bulkUpdateTasks - Rolling back optimistic bulk update.');
      setTasks(originalTasks);
    }
  }, [userId, selectedTaskIds, clearSelectedTasks, categoriesMap, tasks, addReminder, dismissReminder]);

  const markAllTasksInSectionCompleted = useCallback(async (sectionId: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      console.error('useTasks: markAllTasksInSectionCompleted - User not authenticated.');
      return;
    }

    const taskIdsToComplete = tasks
      .filter(task => task.section_id === sectionId && task.status !== 'completed')
      .map(task => task.id);

    if (taskIdsToComplete.length === 0) {
      showSuccess('No incomplete tasks found in this section.');
      console.log('useTasks: markAllTasksInSectionCompleted - No incomplete tasks to mark.');
      return;
    }

    const originalTasks = [...tasks]; // For rollback

    console.log('useTasks: markAllTasksInSectionCompleted - Attempting optimistic update for section:', sectionId, 'tasks:', taskIdsToComplete);
    // Optimistic update
    setTasks(prev => prev.map(task => 
      taskIdsToComplete.includes(task.id) ? { ...task, status: 'completed' } : task
    ));

    try {
      console.log('useTasks: markAllTasksInSectionCompleted - Updating tasks in DB for section:', sectionId);
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .in('id', taskIdsToComplete)
        .eq('user_id', userId)
        .select('id');

      if (error) throw error;
      showSuccess(`${taskIdsToComplete.length} tasks in section marked as completed!`);
      taskIdsToComplete.forEach(id => dismissReminder(id));
      console.log('useTasks: markAllTasksInSectionCompleted - DB update successful.');
    } catch (error: any) {
      console.error('useTasks: markAllTasksInSectionCompleted - Error marking all tasks in section as completed:', error.message);
      showError('Failed to mark tasks as completed.');
      // Rollback optimistic update
      console.log('useTasks: markAllTasksInSectionCompleted - Rolling back optimistic update.');
      setTasks(originalTasks);
    }
  }, [userId, tasks, dismissReminder]);

  // Section management
  const createSection = useCallback(async (name: string) => {
    if (!userId) {
      console.error('useTasks: createSection - User not authenticated.');
      return;
    }
    const newOrder = sections.length;
    const newSection: TaskSection = {
      id: uuidv4(), // Generate client-side ID for optimistic update
      name,
      user_id: userId,
      order: newOrder,
      include_in_focus_mode: true,
    };

    console.log('useTasks: createSection - Attempting optimistic update for new section:', newSection.id);
    // Optimistic update
    setSections(prev => [...prev, newSection]);

    try {
      console.log('useTasks: createSection - Inserting section into DB:', newSection);
      const { data, error } = await supabase
        .from('task_sections')
        .insert(newSection)
        .select('id, name, user_id, order, include_in_focus_mode')
        .single();
      if (error) throw error;
      
      // Update with actual data from DB
      setSections(prev => prev.map(s => s.id === newSection.id ? (data as TaskSection) : s));
      showSuccess('Section created!');
      console.log('useTasks: createSection - DB insert successful, received data:', data.id);
    } catch (e: any) {
      console.error('useTasks: createSection - Error creating section:', e.message);
      showError('Failed to create section.');
      // Rollback optimistic update
      console.log('useTasks: createSection - Rolling back optimistic update.');
      setSections(prev => prev.filter(s => s.id !== newSection.id));
    }
  }, [userId, sections]);

  const updateSection = useCallback(async (sectionId: string, newName: string) => {
    if (!userId) {
      console.error('useTasks: updateSection - User not authenticated.');
      return;
    }
    const originalSections = [...sections]; // For rollback
    const originalSection = sections.find(s => s.id === sectionId);
    if (!originalSection) {
      console.warn('useTasks: updateSection - Section not found for update:', sectionId);
      return;
    }

    console.log('useTasks: updateSection - Attempting optimistic update for section:', sectionId, 'new name:', newName);
    // Optimistic update
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, name: newName } : s));

    try {
      console.log('useTasks: updateSection - Updating section in DB:', sectionId, 'payload:', { name: newName });
      const { data, error } = await supabase
        .from('task_sections')
        .update({ name: newName })
        .eq('id', sectionId)
        .eq('user_id', userId)
        .select('id, name, user_id, order, include_in_focus_mode')
        .single();
      if (error) throw error;
      
      // Update with actual data from DB
      setSections(prev => prev.map(s => s.id === sectionId ? (data as TaskSection) : s));
      showSuccess('Section updated!');
      console.log('useTasks: updateSection - DB update successful, received data:', data.id);
    } catch (e: any) {
      console.error('useTasks: updateSection - Error updating section:', e.message);
      showError('Failed to update section.');
      // Rollback optimistic update
      console.log('useTasks: updateSection - Rolling back optimistic update.');
      setSections(originalSections);
    }
  }, [userId, sections]);

  const deleteSection = useCallback(async (sectionId: string) => {
    if (!userId) {
      console.error('useTasks: deleteSection - User not authenticated.');
      return;
    }
    const originalSections = [...sections]; // For rollback
    const originalTasks = [...tasks]; // For rollback

    console.log('useTasks: deleteSection - Attempting optimistic delete for section:', sectionId);
    // Optimistic update: remove section and move its tasks to null section
    setSections(prev => prev.filter(s => s.id !== sectionId));
    setTasks(prev => prev.map(t => t.section_id === sectionId ? { ...t, section_id: null } : t));

    try {
      // First, update tasks to remove section_id reference
      console.log('useTasks: deleteSection - Nullifying section_id for tasks in DB for section:', sectionId);
      await supabase.from('tasks').update({ section_id: null }).eq('section_id', sectionId).eq('user_id', userId).select('id');
      // Then, delete the section
      console.log('useTasks: deleteSection - Deleting section from DB:', sectionId);
      const { error } = await supabase.from('task_sections').delete().eq('id', sectionId).eq('user_id', userId).select('id');
      if (error) throw error;
      showSuccess('Section deleted!');
      console.log('useTasks: deleteSection - DB delete successful.');
    } catch (e: any) {
      console.error('useTasks: deleteSection - Error deleting section:', e.message);
      showError('Failed to delete section.');
      // Rollback optimistic update
      console.log('useTasks: deleteSection - Rolling back optimistic delete.');
      setSections(originalSections);
      setTasks(originalTasks);
    }
  }, [userId, sections, tasks]);

  const updateSectionIncludeInFocusMode = useCallback(async (sectionId: string, include: boolean) => {
    if (!userId) {
      console.error('useTasks: updateSectionIncludeInFocusMode - User not authenticated.');
      return;
    }
    const originalSections = [...sections]; // For rollback
    const originalSection = sections.find(s => s.id === sectionId);
    if (!originalSection) {
      console.warn('useTasks: updateSectionIncludeInFocusMode - Section not found for update:', sectionId);
      return;
    }

    console.log('useTasks: updateSectionIncludeInFocusMode - Attempting optimistic update for section:', sectionId, 'include_in_focus_mode:', include);
    // Optimistic update
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, include_in_focus_mode: include } : s));

    try {
      console.log('useTasks: updateSectionIncludeInFocusMode - Updating section in DB:', sectionId, 'payload:', { include_in_focus_mode: include });
      const { error } = await supabase.from('task_sections').update({ include_in_focus_mode: include }).eq('id', sectionId).eq('user_id', userId).select('id');
      if (error) throw error;
      showSuccess('Section visibility updated!');
      console.log('useTasks: updateSectionIncludeInFocusMode - DB update successful.');
    } catch (e: any) {
      console.error('useTasks: updateSectionIncludeInFocusMode - Error updating section visibility:', e.message);
      showError('Failed to update.');
      // Rollback optimistic update
      console.log('useTasks: updateSectionIncludeInFocusMode - Rolling back optimistic update.');
      setSections(originalSections);
    }
  }, [userId, sections]);

  const reorderSections = useCallback(async (activeId: string, overId: string) => {
    if (!userId) {
      console.error('useTasks: reorderSections - User not authenticated.');
      return;
    }
    const original = [...sections]; // For rollback
    const a = sections.findIndex(s => s.id === activeId);
    const b = sections.findIndex(s => s.id === overId);
    if (a === -1 || b === -1) {
      console.warn('useTasks: reorderSections - Active or over section not found for reorder:', { activeId, overId });
      return;
    }
    const newOrder = arrayMove(sections, a, b).map((s, i) => ({ ...s, order: i }));
    
    console.log('useTasks: reorderSections - Attempting optimistic reorder for sections:', newOrder.map(s => ({ id: s.id, order: s.order })));
    // Optimistic update
    setSections(newOrder);

    try {
      const payload = newOrder.map(s => ({ id: s.id, name: s.name, order: s.order, include_in_focus_mode: s.include_in_focus_mode, user_id: userId }));
      console.log('useTasks: reorderSections - Upserting section reorder to DB:', payload);
      const { error } = await supabase.from('task_sections').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      showSuccess('Sections reordered!');
      console.log('useTasks: reorderSections - DB upsert successful.');
    } catch (e: any) {
      console.error('useTasks: reorderSections - Upsert failed:', e.message);
      showError('Failed to reorder sections.');
      // Rollback optimistic update
      console.log('useTasks: reorderSections - Rolling back optimistic reorder.');
      setSections(original);
    }
  }, [userId, sections]);

  // Final filtering and next task selection based on processed tasks
  const { finalFilteredTasks, nextAvailableTask } = useMemo(() => {
    let relevant: Task[] = processedTasks; // Start with the processed list

    // Apply viewMode filter (only 'daily' or 'archive' relevant here)
    if (viewMode === 'daily') {
        relevant = relevant.filter(t => t.status !== 'archived');
    } else if (viewMode === 'archive') {
        relevant = relevant.filter(t => t.status === 'archived');
    }

    // Apply other filters
    if (searchFilter) {
      relevant = relevant.filter(t =>
        t.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (t.notes || '').toLowerCase().includes(searchFilter.toLowerCase())
      );
    }
    if (statusFilter !== 'all') relevant = relevant.filter(t => t.status === statusFilter);
    if (categoryFilter !== 'all') relevant = relevant.filter(t => t.category === categoryFilter);
    if (priorityFilter !== 'all') relevant = relevant.filter(t => t.priority === priorityFilter);
    if (sectionFilter !== 'all') {
      if (sectionFilter === 'no-section') relevant = relevant.filter(t => t.section_id === null);
      else relevant = relevant.filter(t => t.section_id === sectionFilter);
    }

    // Sort by section then order
    relevant.sort((a, b) => {
      const aSec = sections.find(s => s.id === a.section_id)?.order ?? 1e9;
      const bSec = sections.find(s => s.id === b.section_id)?.order ?? 1e9;
      if (aSec !== bSec) return aSec - bSec;
      return (a.order || 0) - (b.order || 0);
    });

    const nextTask = relevant.find(t => t.status === 'to-do' && t.parent_task_id === null) || null;

    return { finalFilteredTasks: relevant, nextAvailableTask: nextTask };
  }, [processedTasks, sections, viewMode, searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter]);

  return {
    tasks, // Raw tasks from DB
    filteredTasks: finalFilteredTasks, // Tasks after processing and filtering
    nextAvailableTask,
    loading,
    currentDate,
    setCurrentDate,
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
    // newly re-exposed helpers:
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