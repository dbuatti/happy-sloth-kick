"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, TaskSection, TaskCategory, DoTodayOffLog } from '@/types';
import { useAuth } from '@/context/AuthContext';
import {
  fetchTasksApi, addTaskApi, updateTaskApi, deleteTaskApi, bulkUpdateTasksApi, updateTasksOrderApi,
  fetchSectionsApi, createSectionApi, updateSectionApi, deleteSectionApi, reorderSectionsApi,
  fetchCategoriesApi, createCategoryApi, updateCategoryApi, deleteCategoryApi,
  fetchDoTodayOffLogApi, addDoTodayOffLogApi, deleteDoTodayOffLogApi
} from '@/integrations/supabase/api';
import { showError, showSuccess } from '@/utils/toast';
import { isSameDay, startOfDay } from 'date-fns';

interface UseTasksOptions {
  currentDate?: Date;
  userId?: string | null;
  viewMode?: 'daily' | 'focus' | 'archive' | 'all';
}

export const useTasks = ({ currentDate = new Date(), userId: propUserId, viewMode = 'all' }: UseTasksOptions) => {
  const { user } = useAuth();
  const userId = propUserId || user?.id;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [doTodayOffIds, setDoTodayOffIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>(viewMode === 'archive' ? 'archived' : 'all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Task['priority'] | 'all'>('all');
  const [sectionFilter, setSectionFilter] = useState<string | 'all'>('all');

  const fetchAllData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [fetchedTasks, fetchedSections, fetchedCategories, fetchedDoTodayOffLog] = await Promise.all([
        fetchTasksApi(userId, statusFilter, sectionFilter, categoryFilter, priorityFilter, searchFilter, viewMode === 'daily' ? currentDate : null, viewMode),
        fetchSectionsApi(userId),
        fetchCategoriesApi(userId),
        fetchDoTodayOffLogApi(userId, currentDate),
      ]);

      setTasks(fetchedTasks);
      setSections(fetchedSections);
      setCategories(fetchedCategories);
      setDoTodayOffIds(new Set(fetchedDoTodayOffLog.map(log => log.task_id)));
    } catch (err) {
      console.error("Failed to fetch all data:", err);
      setError("Failed to load data.");
      showError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [userId, currentDate, statusFilter, sectionFilter, categoryFilter, priorityFilter, searchFilter, viewMode]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- Task Management ---
  const addTask = useCallback(async (newTaskData: Partial<Task>) => {
    if (!userId) {
      showError("User not authenticated.");
      return null;
    }
    try {
      const task = await addTaskApi(userId, { ...newTaskData, user_id: userId });
      if (task) {
        setTasks(prev => [...prev, task]);
        showSuccess("Task added!");
        return task;
      }
    } catch (err) {
      showError("Failed to add task.");
    }
    return null;
  }, [userId]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      const updated = await updateTaskApi(taskId, updates);
      if (updated) {
        setTasks(prev => prev.map(task => (task.id === taskId ? updated : task)));
        showSuccess("Task updated!");
        return updated;
      }
    } catch (err) {
      showError("Failed to update task.");
    }
    return null;
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await deleteTaskApi(taskId);
      setTasks(prev => prev.filter(task => task.id !== taskId));
      showSuccess("Task deleted!");
    } catch (err) {
      showError("Failed to delete task.");
    }
  }, []);

  const bulkUpdateTasks = useCallback(async (updates: { id: string; updates: Partial<Task> }[]) => {
    try {
      await bulkUpdateTasksApi(updates);
      setTasks(prev => prev.map(task => {
        const update = updates.find(u => u.id === task.id);
        return update ? { ...task, ...update.updates } : task;
      }));
      showSuccess("Tasks updated!");
    } catch (err) {
      showError("Failed to bulk update tasks.");
    }
  }, []);

  const reorderTasks = useCallback(async (updates: { id: string; order: number | null; section_id: string | null; parent_task_id: string | null }[]) => {
    try {
      await updateTasksOrderApi(updates);
      // Re-fetch or optimistically update
      setTasks(prev => {
        const newTasks = [...prev];
        updates.forEach(update => {
          const index = newTasks.findIndex(t => t.id === update.id);
          if (index !== -1) {
            newTasks[index] = { ...newTasks[index], order: update.order, section_id: update.section_id, parent_task_id: update.parent_task_id };
          }
        });
        return newTasks;
      });
      showSuccess("Tasks reordered!");
    } catch (err) {
      showError("Failed to reorder tasks.");
    }
  }, []);

  const updateTaskParentAndOrder = useCallback(async (taskId: string, parentTaskId: string | null, newOrder: number | null) => {
    try {
      await updateTaskApi(taskId, { parent_task_id: parentTaskId, order: newOrder });
      setTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, parent_task_id: parentTaskId, order: newOrder } : task
      ));
      showSuccess("Task parent/order updated!");
    } catch (err) {
      showError("Failed to update task parent/order.");
    }
  }, []);

  const archiveAllCompletedTasks = useCallback(async () => {
    const completedTasks = tasks.filter(task => task.status === 'completed');
    if (completedTasks.length === 0) {
      showError("No completed tasks to archive.");
      return;
    }
    const updates = completedTasks.map(task => ({ id: task.id, updates: { status: 'archived' as Task['status'] } }));
    await bulkUpdateTasks(updates);
    showSuccess("All completed tasks archived!");
  }, [tasks, bulkUpdateTasks]);

  const markAllTasksInSectionCompleted = useCallback(async (sectionId: string | null) => {
    if (!sectionId) return;
    const tasksToUpdate = tasks.filter(task => task.section_id === sectionId && task.status !== 'completed');
    if (tasksToUpdate.length === 0) {
      showError("No incomplete tasks in this section.");
      return;
    }
    const updates = tasksToUpdate.map(task => ({ id: task.id, updates: { status: 'completed' as Task['status'] } }));
    await bulkUpdateTasks(updates);
    showSuccess("All tasks in section marked completed!");
  }, [tasks, bulkUpdateTasks]);

  // --- Section Management ---
  const createSection = useCallback(async (name: string) => {
    if (!userId) {
      showError("User not authenticated.");
      return null;
    }
    try {
      const section = await createSectionApi(userId, name);
      if (section) {
        setSections(prev => [...prev, section]);
        showSuccess("Section created!");
        return section;
      }
    } catch (err) {
      showError("Failed to create section.");
    }
    return null;
  }, [userId]);

  const updateSection = useCallback(async (sectionId: string, name: string) => {
    try {
      const updated = await updateSectionApi(sectionId, { name });
      if (updated) {
        setSections(prev => prev.map(section => (section.id === sectionId ? updated : section)));
        showSuccess("Section updated!");
        return updated;
      }
    } catch (err) {
      showError("Failed to update section.");
    }
    return null;
  }, []);

  const deleteSection = useCallback(async (sectionId: string) => {
    try {
      await deleteSectionApi(sectionId);
      setSections(prev => prev.filter(section => section.id !== sectionId));
      showSuccess("Section deleted!");
    } catch (err) {
      showError("Failed to delete section.");
    }
  }, []);

  const reorderSections = useCallback(async (updates: { id: string; order: number }[]) => {
    try {
      await reorderSectionsApi(updates);
      setSections(prev => {
        const newSections = [...prev];
        updates.forEach(update => {
          const index = newSections.findIndex(s => s.id === update.id);
          if (index !== -1) {
            newSections[index] = { ...newSections[index], order: update.order };
          }
        });
        return newSections.sort((a, b) => (a.order || 0) - (b.order || 0));
      });
      showSuccess("Sections reordered!");
    } catch (err) {
      showError("Failed to reorder sections.");
    }
  }, []);

  const updateSectionIncludeInFocusMode = useCallback(async (sectionId: string, include: boolean) => {
    try {
      const updated = await updateSectionApi(sectionId, { include_in_focus_mode: include });
      if (updated) {
        setSections(prev => prev.map(section => (section.id === sectionId ? updated : section)));
        showSuccess("Section focus mode updated!");
        return updated;
      }
    } catch (err) {
      showError("Failed to update section focus mode.");
    }
    return null;
  }, []);

  // --- Category Management ---
  const addCategory = useCallback(async (name: string, color: string) => {
    if (!userId) {
      showError("User not authenticated.");
      return null;
    }
    try {
      const category = await createCategoryApi(userId, name, color);
      if (category) {
        setCategories(prev => [...prev, category]);
        showSuccess("Category added!");
        return category;
      }
    } catch (err) {
      showError("Failed to add category.");
    }
    return null;
  }, [userId]);

  const updateCategory = useCallback(async (categoryId: string, updates: Partial<TaskCategory>) => {
    try {
      const updated = await updateCategoryApi(categoryId, updates);
      if (updated) {
        setCategories(prev => prev.map(category => (category.id === categoryId ? updated : category)));
        showSuccess("Category updated!");
        return updated;
      }
    } catch (err) {
      showError("Failed to update category.");
    }
    return null;
  }, []);

  const deleteCategory = useCallback(async (categoryId: string) => {
    try {
      await deleteCategoryApi(categoryId);
      setCategories(prev => prev.filter(category => category.id !== categoryId));
      showSuccess("Category deleted!");
    } catch (err) {
      showError("Failed to delete category.");
    }
  }, []);

  // --- Do Today Off Log Management ---
  const toggleDoToday = useCallback(async (taskId: string, isOff: boolean) => {
    if (!userId) {
      showError("User not authenticated.");
      return;
    }
    try {
      if (isOff) {
        const log = await addDoTodayOffLogApi(userId, taskId, currentDate);
        if (log) {
          setDoTodayOffIds(prev => new Set(prev).add(taskId));
          showSuccess("Task moved off 'Do Today'.");
        }
      } else {
        const logToDelete = Array.from(doTodayOffIds).find(id => id === taskId);
        if (logToDelete) {
          // Need to fetch the actual log entry ID to delete it
          const fetchedLogs = await fetchDoTodayOffLogApi(userId, currentDate);
          const logEntry = fetchedLogs.find(log => log.task_id === taskId);
          if (logEntry) {
            await deleteDoTodayOffLogApi(logEntry.id);
            setDoTodayOffIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(taskId);
              return newSet;
            });
            showSuccess("Task moved back to 'Do Today'.");
          }
        }
      }
    } catch (err) {
      showError(`Failed to toggle 'Do Today' status.`);
    }
  }, [userId, currentDate, doTodayOffIds]);

  const toggleAllDoToday = useCallback(async (turnOff: boolean) => {
    if (!userId) {
      showError("User not authenticated.");
      return;
    }
    const dailyTasks = tasks.filter(task =>
      (task.due_date && isSameDay(new Date(task.due_date), currentDate)) || !task.due_date
    );

    if (turnOff) {
      const tasksToTurnOff = dailyTasks.filter(task => !doTodayOffIds.has(task.id));
      for (const task of tasksToTurnOff) {
        await addDoTodayOffLogApi(userId, task.id, currentDate);
      }
      setDoTodayOffIds(prev => new Set([...prev, ...tasksToTurnOff.map(t => t.id)]));
      showSuccess("All tasks moved off 'Do Today'.");
    } else {
      const tasksToTurnOn = dailyTasks.filter(task => doTodayOffIds.has(task.id));
      const fetchedLogs = await fetchDoTodayOffLogApi(userId, currentDate);
      for (const task of tasksToTurnOn) {
        const logEntry = fetchedLogs.find(log => log.task_id === task.id);
        if (logEntry) {
          await deleteDoTodayOffLogApi(logEntry.id);
        }
      }
      setDoTodayOffIds(prev => {
        const newSet = new Set(prev);
        tasksToTurnOn.forEach(t => newSet.delete(t.id));
        return newSet;
      });
      showSuccess("All tasks moved back to 'Do Today'.");
    }
  }, [userId, tasks, doTodayOffIds, currentDate]);

  // --- Derived State and Memoized Values ---
  const processedTasks = useMemo(() => {
    return tasks.map(task => ({
      ...task,
      category_color: categories.find(cat => cat.id === task.category)?.color || null,
    }));
  }, [tasks, categories]);

  const filteredTasks = useMemo(() => {
    let filtered = processedTasks;

    if (searchFilter) {
      filtered = filtered.filter(task =>
        task.description?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(task => task.category === categoryFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    if (sectionFilter !== 'all') {
      filtered = filtered.filter(task => task.section_id === sectionFilter);
    }

    return filtered;
  }, [processedTasks, searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter]);

  const nextAvailableTask = useMemo(() => {
    const todayStart = startOfDay(currentDate);
    const availableTasks = filteredTasks.filter(task =>
      task.status === 'to-do' &&
      !doTodayOffIds.has(task.id) &&
      (task.due_date === null || new Date(task.due_date) >= todayStart)
    ).sort((a, b) => {
      // Sort by priority (urgent > high > medium > low)
      const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3, null: 4, undefined: 4 };
      const pA = priorityOrder[a.priority || null];
      const pB = priorityOrder[b.priority || null];
      if (pA !== pB) return pA - pB;

      // Then by due date (earliest first, null last)
      if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (a.due_date) return -1; // a has due date, b doesn't
      if (b.due_date) return 1;  // b has due date, a doesn't

      // Then by order
      return (a.order || 0) - (b.order || 0);
    });
    return availableTasks.length > 0 ? availableTasks[0] : null;
  }, [filteredTasks, doTodayOffIds, currentDate]);

  const dailyProgress = useMemo(() => {
    const dailyTasks = tasks.filter(task =>
      (task.due_date && isSameDay(new Date(task.due_date), currentDate)) || !task.due_date
    );
    const totalDailyTasks = dailyTasks.length;
    const completedDailyTasks = dailyTasks.filter(task => task.status === 'completed').length;
    const progress = totalDailyTasks > 0 ? (completedDailyTasks / totalDailyTasks) * 100 : 0;
    return { total: totalDailyTasks, completed: completedDailyTasks, progress };
  }, [tasks, currentDate]);

  const setFocusTask = useCallback(async (taskId: string | null) => {
    // This function would typically interact with user settings, not directly with tasks
    // For now, it's a placeholder.
    console.log(`Setting focus task to: ${taskId}`);
    showSuccess(`Focus task set to ${taskId || 'none'}. (Placeholder)`);
  }, []);

  return {
    tasks,
    processedTasks,
    filteredTasks,
    nextAvailableTask,
    sections,
    categories,
    doTodayOffIds,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    reorderTasks,
    updateTaskParentAndOrder,
    archiveAllCompletedTasks,
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    updateSectionIncludeInFocusMode,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
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
    setFocusTask, // Placeholder for setting focus task in user settings
  };
};