"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { useReminders } from '@/context/ReminderContext';
import { v4 as uuidv4 } from 'uuid';
import { isSameDay, parseISO, isValid } from 'date-fns';
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

  const [tasks, setTasks] = useState<Task[]>([]);
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

  const fetchDataAndSections = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('task_sections')
        .select('id, name, user_id, order, include_in_focus_mode')
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
      setAllCategories(categoriesData || []);

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, description, status, recurring_type, created_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link')
        .eq('user_id', userId);
      if (tasksError) throw tasksError;

      // Use the categoriesMap from the outer scope, which is correctly memoized
      const mapped = (tasksData || []).map((t: any) => ({
        ...t,
        category_color: categoriesMap.get(t.category) || 'gray',
      })) as Task[];

      setTasks(mapped);
    } catch (e) {
      console.error('fetchDataAndSections error', e);
      showError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [userId]); // Removed categoriesMap from dependencies

  useEffect(() => {
    if (!authLoading && userId) fetchDataAndSections();
    if (!authLoading && !userId) {
      setTasks([]);
      setSections([]);
      setAllCategories([]);
      setLoading(false);
    }
  }, [authLoading, userId, fetchDataAndSections]);

  const handleAddTask = useCallback(async (newTaskData: NewTaskData) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    const categoryColor = categoriesMap.get(newTaskData.category) || 'gray';
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

    // Optimistic update
    setTasks(prev => [...prev, newTask]);

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert(cleanTaskForDb(newTask))
        .select('id, description, status, recurring_type, created_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link')
        .single();

      if (error) throw error;

      // Update with actual data from DB (e.g., if default values were set by DB)
      setTasks(prev => prev.map(t => t.id === newTask.id ? { ...data, category_color: categoriesMap.get(data.category) || 'gray' } : t));
      showSuccess('Task added successfully!');

      if (newTask.remind_at) {
        const d = parseISO(newTask.remind_at);
        if (isValid(d)) addReminder(newTask.id, `Reminder: ${newTask.description}`, d);
      }
      return true;
    } catch (e) {
      console.error('handleAddTask error', e);
      showError('Failed to add task.');
      // Rollback optimistic update
      setTasks(prev => prev.filter(t => t.id !== newTask.id));
      return false;
    }
  }, [userId, currentDate, categoriesMap, tasks, addReminder]);

  const updateTask = useCallback(async (taskId: string, updates: TaskUpdate) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    let color: string | undefined;
    if (updates.category) color = categoriesMap.get(updates.category) || 'gray';

    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates, ...(color && { category_color: color }) } : t));

    try {
      const { error, data } = await supabase
        .from('tasks')
        .update(cleanTaskForDb(updates))
        .eq('id', taskId)
        .eq('user_id', userId)
        .select('id, description, status, recurring_type, created_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link')
        .single();

      if (error) throw error;
      showSuccess('Task updated!');
      
      // Ensure local state is fully consistent with DB response
      setTasks(prev => prev.map(t => t.id === taskId ? { ...data, category_color: categoriesMap.get(data.category) || 'gray' } : t));

      if (updates.remind_at) {
        const d = parseISO(updates.remind_at as string);
        if (isValid(d) && (updates.status === undefined || updates.status === 'to-do')) addReminder(taskId, `Reminder: ${originalTask.description}`, d);
      }
      if (updates.status === 'completed' || updates.status === 'archived' || updates.remind_at === null) {
        dismissReminder(taskId);
      }
    } catch (e) {
      console.error('updateTask error', e);
      showError('Failed to update task.');
      // Rollback optimistic update
      setTasks(prev => prev.map(t => t.id === taskId ? originalTask : t));
    }
  }, [userId, categoriesMap, tasks, addReminder, dismissReminder]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
    let idsToDelete = [taskId];
    const subIds = tasks.filter(t => t.parent_task_id === taskId).map(t => t.id);
    idsToDelete = [...idsToDelete, ...subIds];
    if (taskToDelete.recurring_type !== 'none' && taskToDelete.original_task_id === null) {
      const inst = tasks.filter(t => t.original_task_id === taskId).map(t => t.id);
      idsToDelete = [...idsToDelete, ...inst];
    }
    
    const originalTasks = [...tasks]; // For rollback

    // Optimistic update
    setTasks(prev => prev.filter(t => !idsToDelete.includes(t.id)));

    try {
      const { error } = await supabase.from('tasks').delete().in('id', idsToDelete).eq('user_id', userId).select('id');
      if (error) throw error;
      showSuccess('Task(s) deleted!');
      idsToDelete.forEach(dismissReminder);
    } catch (e) {
      console.error('deleteTask error', e);
      showError('Failed to delete task.');
      // Rollback optimistic update
      setTasks(originalTasks);
    }
  }, [userId, tasks, dismissReminder]);

  // DnD: move within/among sections and as subtasks
  const updateTaskParentAndOrder = useCallback(async (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const originalTasks = [...tasks];
    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) {
      console.warn('[DnD] active task not found', { activeId });
      return;
    }

    const isDescendant = (parentId: string | null, childId: string): boolean => {
      if (!parentId) return false;
      if (parentId === childId) return true;
      const parent = tasks.find(t => t.id === parentId);
      return parent ? isDescendant(parent.parent_task_id, childId) : false;
    };
    if (isDescendant(newParentId, activeTask.id)) {
      console.warn('[DnD] refusing to make task a child of its own descendant', { activeId, newParentId });
      return;
    }

    console.log('[DnD] updateTaskParentAndOrder start', {
      activeId,
      from: { parent: activeTask.parent_task_id, section: activeTask.section_id },
      to: { newParentId, newSectionId, overId }
    });

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

    console.log('[DnD] updates prepared', updates);

    // Optimistic update
    setTasks(prev => {
      const map = new Map(updates.map(u => [u.id!, u]));
      return prev.map(t => map.has(t.id) ? { ...t, ...map.get(t.id)! } : t);
    });

    try {
      const updatesWithUser = updates.map(u => ({ ...(cleanTaskForDb(u) as any), user_id: userId }));
      console.log('[DnD] upsert', updatesWithUser);
      const { error } = await supabase.from('tasks').upsert(updatesWithUser, { onConflict: 'id' });
      if (error) throw error;
      showSuccess('Task moved!');
      console.log('[DnD] upsert success');
    } catch (e) {
      console.error('[DnD] upsert failed', e);
      showError('Failed to move task.');
      // Rollback optimistic update
      setTasks(originalTasks);
    }
  }, [userId, tasks]);

  const moveTask = useCallback(async (taskId: string, direction: 'up' | 'down') => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const originalTasks = [...tasks]; // Capture original state for rollback
    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove) {
      showError('Task not found.');
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

    console.log('[Reorder] moveTask', { taskId, direction, from: currentIndex, to: newIndex, updates });

    // Optimistic update
    setTasks(prev => {
      const map = new Map(updates.map(u => [u.id, u]));
      return prev.map(t => map.has(t.id) ? { ...t, ...map.get(t.id)! } : t);
    });

    try {
      const updatesWithUser = updates.map(u => ({ ...(cleanTaskForDb(u) as any), user_id: userId }));
      console.log('[Reorder] upsert', updatesWithUser);
      const { error } = await supabase.from('tasks').upsert(updatesWithUser, { onConflict: 'id' });
      if (error) throw error;
      showSuccess('Task reordered!');
      console.log('[Reorder] upsert success');
    } catch (e) {
      console.error('[Reorder] upsert failed', e);
      showError('Failed to reorder task.');
      // Rollback optimistic update
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
      return;
    }
    if (ids.length === 0) return;

    let updatedCategoryColor: string | undefined;
    if (updates.category) {
      updatedCategoryColor = categoriesMap.get(updates.category) || 'gray';
    }

    const originalTasks = [...tasks]; // For rollback

    // Optimistic update
    setTasks(prev => prev.map(task => 
      ids.includes(task.id) ? { ...task, ...updates, ...(updatedCategoryColor && { category_color: updatedCategoryColor }) } : task
    ));

    try {
      const dbUpdates = cleanTaskForDb(updates);
      await supabase
        .from('tasks')
        .update(dbUpdates)
        .in('id', ids)
        .eq('user_id', userId)
        .select('id');
      showSuccess(`${ids.length} tasks updated successfully!`);
      clearSelectedTasks();
      
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
      console.error('Error bulk updating tasks:', error);
      showError('Failed to update tasks in bulk.');
      // Rollback optimistic update
      setTasks(originalTasks);
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

    const originalTasks = [...tasks]; // For rollback

    // Optimistic update
    setTasks(prev => prev.map(task => 
      taskIdsToComplete.includes(task.id) ? { ...task, status: 'completed' } : task
    ));

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .in('id', taskIdsToComplete)
        .eq('user_id', userId)
        .select('id');

      if (error) throw error;
      showSuccess(`${taskIdsToComplete.length} tasks in section marked as completed!`);
      taskIdsToComplete.forEach(id => dismissReminder(id));
    } catch (error: any) {
      console.error('Error marking all tasks in section as completed:', error);
      showError('Failed to mark tasks as completed.');
      // Rollback optimistic update
      setTasks(originalTasks);
    }
  }, [userId, tasks, dismissReminder]);

  // Section management
  const createSection = useCallback(async (name: string) => {
    if (!userId) return;
    const newOrder = sections.length;
    const newSection: TaskSection = {
      id: uuidv4(), // Generate client-side ID for optimistic update
      name,
      user_id: userId,
      order: newOrder,
      include_in_focus_mode: true,
    };

    // Optimistic update
    setSections(prev => [...prev, newSection]);

    try {
      const { data, error } = await supabase
        .from('task_sections')
        .insert(newSection)
        .select('id, name, user_id, order, include_in_focus_mode')
        .single();
      if (error) throw error;
      
      // Update with actual data from DB
      setSections(prev => prev.map(s => s.id === newSection.id ? (data as TaskSection) : s));
      showSuccess('Section created!');
    } catch (e) {
      console.error('createSection error', e);
      showError('Failed to create section.');
      // Rollback optimistic update
      setSections(prev => prev.filter(s => s.id !== newSection.id));
    }
  }, [userId, sections]);

  const updateSection = useCallback(async (sectionId: string, newName: string) => {
    if (!userId) return;
    const originalSections = [...sections]; // For rollback
    const originalSection = sections.find(s => s.id === sectionId);
    if (!originalSection) return;

    // Optimistic update
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, name: newName } : s));

    try {
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
    } catch (e) {
      console.error('updateSection error', e);
      showError('Failed to update section.');
      // Rollback optimistic update
      setSections(originalSections);
    }
  }, [userId, sections]);

  const deleteSection = useCallback(async (sectionId: string) => {
    if (!userId) return;
    const originalSections = [...sections]; // For rollback
    const originalTasks = [...tasks]; // For rollback

    // Optimistic update: remove section and move its tasks to null section
    setSections(prev => prev.filter(s => s.id !== sectionId));
    setTasks(prev => prev.map(t => t.section_id === sectionId ? { ...t, section_id: null } : t));

    try {
      // First, update tasks to remove section_id reference
      await supabase.from('tasks').update({ section_id: null }).eq('section_id', sectionId).eq('user_id', userId).select('id');
      // Then, delete the section
      const { error } = await supabase.from('task_sections').delete().eq('id', sectionId).eq('user_id', userId).select('id');
      if (error) throw error;
      showSuccess('Section deleted!');
    } catch (e) {
      console.error('deleteSection error', e);
      showError('Failed to delete section.');
      // Rollback optimistic update
      setSections(originalSections);
      setTasks(originalTasks);
    }
  }, [userId, sections, tasks]);

  const updateSectionIncludeInFocusMode = useCallback(async (sectionId: string, include: boolean) => {
    if (!userId) return;
    const originalSections = [...sections]; // For rollback
    const originalSection = sections.find(s => s.id === sectionId);
    if (!originalSection) return;

    // Optimistic update
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, include_in_focus_mode: include } : s));

    try {
      const { error } = await supabase.from('task_sections').update({ include_in_focus_mode: include }).eq('id', sectionId).eq('user_id', userId).select('id');
      if (error) throw error;
      showSuccess('Section visibility updated!');
    } catch (e) {
      console.error('updateSectionIncludeInFocusMode error', e);
      showError('Failed to update.');
      // Rollback optimistic update
      setSections(originalSections);
    }
  }, [userId, sections]);

  const reorderSections = useCallback(async (activeId: string, overId: string) => {
    if (!userId) return;
    const original = [...sections]; // For rollback
    const a = sections.findIndex(s => s.id === activeId);
    const b = sections.findIndex(s => s.id === overId);
    if (a === -1 || b === -1) return;
    const newOrder = arrayMove(sections, a, b).map((s, i) => ({ ...s, order: i }));
    
    // Optimistic update
    setSections(newOrder);

    try {
      const payload = newOrder.map(s => ({ id: s.id, name: s.name, order: s.order, include_in_focus_mode: s.include_in_focus_mode, user_id: userId }));
      const { error } = await supabase.from('task_sections').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      showSuccess('Sections reordered!');
    } catch (e) {
      console.error('reorderSections error', e);
      showError('Failed to reorder sections.');
      // Rollback optimistic update
      setSections(original);
    }
  }, [userId, sections]);

  // Basic filtering and next task
  const { finalFilteredTasks, nextAvailableTask } = useMemo(() => {
    let relevant: Task[] = [];
    if (viewMode === 'archive') relevant = tasks.filter(t => t.status === 'archived');
    else relevant = tasks.filter(t => t.status !== 'archived');

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
  }, [tasks, sections, viewMode, searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter]);

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