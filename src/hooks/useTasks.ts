"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskSection, TaskCategory, TaskStatus, TaskPriority, RecurringType, DoTodayOffLog } from '@/types/task';
import { isSameDay, parseISO } from 'date-fns';

interface UseTasksProps {
  currentDate: Date;
  userId: string | undefined;
  viewMode?: 'daily' | 'focus' | 'archive' | 'all';
  initialSearchFilter?: string;
  initialStatusFilter?: TaskStatus | 'all';
  initialCategoryFilter?: string | 'all';
  initialPriorityFilter?: TaskPriority | 'all';
  initialSectionFilter?: string | 'all';
}

interface AddTaskPayload {
  description: string;
  section_id?: string | null;
  category?: string | null;
  priority?: TaskPriority;
  due_date?: string | null;
  parent_task_id?: string | null;
  recurring_type?: RecurringType;
  link?: string | null;
  image_url?: string | null;
  notes?: string | null;
  remind_at?: string | null;
}

interface UpdateTaskPayload {
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  notes?: string | null;
  remind_at?: string | null;
  section_id?: string | null;
  order?: number;
  parent_task_id?: string | null;
  recurring_type?: RecurringType;
  category?: string | null;
  link?: string | null;
  image_url?: string | null;
}

const useTasks = ({
  currentDate,
  userId,
  viewMode = 'all',
  initialSearchFilter = '',
  initialStatusFilter = 'all',
  initialCategoryFilter = 'all',
  initialPriorityFilter = 'all',
  initialSectionFilter = 'all',
}: UseTasksProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [doTodayOffLog, setDoTodayOffLog] = useState<DoTodayOffLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchFilter, setSearchFilter] = useState(initialSearchFilter);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>(initialStatusFilter);
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>(initialCategoryFilter);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>(initialPriorityFilter);
  const [sectionFilter, setSectionFilter] = useState<string | 'all'>(initialSectionFilter);

  const fetchTasksAndSections = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          task_categories (
            name,
            color
          )
        `)
        .eq('user_id', userId)
        .order('order', { ascending: true })
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      const processedTasks: Task[] = tasksData.map((task: any) => ({
        ...task,
        category_color: task.task_categories?.color || null,
        category_name: task.task_categories?.name || null,
      }));
      setTasks(processedTasks);

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('task_sections')
        .select('*')
        .eq('user_id', userId)
        .order('order', { ascending: true });

      if (sectionsError) throw sectionsError;
      setSections(sectionsData as TaskSection[]);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('task_categories')
        .select('*')
        .eq('user_id', userId);

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData as TaskCategory[]);

      // Fetch do_today_off_log
      const { data: doTodayOffData, error: doTodayOffError } = await supabase
        .from('do_today_off_log')
        .select('*')
        .eq('user_id', userId);

      if (doTodayOffError) throw doTodayOffError;
      setDoTodayOffLog(doTodayOffData as DoTodayOffLog[]);

    } catch (err: any) {
      console.error("Error fetching tasks and sections:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTasksAndSections();

    const channel = supabase
      .channel('tasks_sections_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, () => {
        fetchTasksAndSections();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_sections', filter: `user_id=eq.${userId}` }, () => {
        fetchTasksAndSections();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_categories', filter: `user_id=eq.${userId}` }, () => {
        fetchTasksAndSections();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'do_today_off_log', filter: `user_id=eq.${userId}` }, () => {
        fetchTasksAndSections();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchTasksAndSections]);

  const handleAddTask = async (payload: AddTaskPayload): Promise<boolean> => {
    if (!userId) return false;
    setLoading(true);
    const { error } = await supabase
      .from('tasks')
      .insert({ ...payload, user_id: userId });
    if (error) {
      setError(error.message);
      console.error("Error adding task:", error.message);
      setLoading(false);
      return false;
    }
    fetchTasksAndSections();
    return true;
  };

  const handleUpdateTask = async (taskId: string, payload: UpdateTaskPayload) => {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', taskId)
      .eq('user_id', userId);
    if (error) {
      setError(error.message);
      console.error("Error updating task:", error.message);
    } else {
      fetchTasksAndSections();
    }
    setLoading(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);
    if (error) {
      setError(error.message);
      console.error("Error deleting task:", error.message);
    } else {
      fetchTasksAndSections();
    }
    setLoading(false);
  };

  const createSection = async (name: string) => {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase
      .from('task_sections')
      .insert({ name, user_id: userId });
    if (error) {
      setError(error.message);
      console.error("Error creating section:", error.message);
    } else {
      fetchTasksAndSections();
    }
    setLoading(false);
  };

  const updateSection = async (sectionId: string, newName: string) => {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase
      .from('task_sections')
      .update({ name: newName })
      .eq('id', sectionId)
      .eq('user_id', userId);
    if (error) {
      setError(error.message);
      console.error("Error updating section:", error.message);
    } else {
      fetchTasksAndSections();
    }
    setLoading(false);
  };

  const deleteSection = async (sectionId: string) => {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase
      .from('task_sections')
      .delete()
      .eq('id', sectionId)
      .eq('user_id', userId);
    if (error) {
      setError(error.message);
      console.error("Error deleting section:", error.message);
    } else {
      fetchTasksAndSections();
    }
    setLoading(false);
  };

  const updateSectionIncludeInFocusMode = async (sectionId: string, include: boolean) => {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase
      .from('task_sections')
      .update({ include_in_focus_mode: include })
      .eq('id', sectionId)
      .eq('user_id', userId);
    if (error) {
      setError(error.message);
      console.error("Error updating section focus mode:", error.message);
    } else {
      fetchTasksAndSections();
    }
    setLoading(false);
  };

  const createCategory = async (name: string, color: string) => {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase
      .from('task_categories')
      .insert({ name, color, user_id: userId });
    if (error) {
      setError(error.message);
      console.error("Error creating category:", error.message);
    } else {
      fetchTasksAndSections();
    }
    setLoading(false);
  };

  const updateCategory = async (categoryId: string, newName: string, newColor: string) => {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase
      .from('task_categories')
      .update({ name: newName, color: newColor })
      .eq('id', categoryId)
      .eq('user_id', userId);
    if (error) {
      setError(error.message);
      console.error("Error updating category:", error.message);
    } else {
      fetchTasksAndSections();
    }
    setLoading(false);
  };

  const deleteCategory = async (categoryId: string) => {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase
      .from('task_categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', userId);
    if (error) {
      setError(error.message);
      console.error("Error deleting category:", error.message);
    } else {
      fetchTasksAndSections();
    }
    setLoading(false);
  };

  const reorderSections = async (activeId: string, overId: string) => {
    if (!userId || activeId === overId) return;
    setLoading(true);

    const oldIndex = sections.findIndex(s => s.id === activeId);
    const newIndex = sections.findIndex(s => s.id === overId);

    if (oldIndex === -1 || newIndex === -1) {
      setLoading(false);
      return;
    }

    const newSectionsOrder = Array.from(sections);
    const [movedSection] = newSectionsOrder.splice(oldIndex, 1);
    newSectionsOrder.splice(newIndex, 0, movedSection);

    const updates = newSectionsOrder.map((section, index) => ({
      id: section.id,
      order: index,
    }));

    const { error: rpcError } = await supabase.rpc('update_tasks_order', { updates: updates as any }); // Assuming RPC can handle sections or a similar one exists
    if (rpcError) {
      setError(rpcError.message);
      console.error("Error reordering sections:", rpcError.message);
    } else {
      fetchTasksAndSections();
    }
    setLoading(false);
  };

  const updateTaskParentAndOrder = async (updates: { id: string; parent_task_id: string | null; section_id: string | null; order: number }[]) => {
    if (!userId) return;
    setLoading(true);
    const { error: rpcError } = await supabase.rpc('update_tasks_order', { updates });
    if (rpcError) {
      setError(rpcError.message);
      console.error("Error updating task parent and order:", rpcError.message);
    } else {
      fetchTasksAndSections();
    }
    setLoading(false);
  };

  const toggleDoToday = async (taskId: string, date: Date) => {
    if (!userId) return;
    setLoading(true);
    const formattedDate = date.toISOString().split('T')[0];
    const existingLog = doTodayOffLog.find(log => log.task_id === taskId && log.off_date === formattedDate);

    if (existingLog) {
      const { error } = await supabase.from('do_today_off_log').delete().eq('id', existingLog.id);
      if (error) {
        setError(error.message);
        console.error("Error removing from do today log:", error.message);
      }
    } else {
      const { error } = await supabase.from('do_today_off_log').insert({ user_id: userId, task_id: taskId, off_date: formattedDate });
      if (error) {
        setError(error.message);
        console.error("Error adding to do today log:", error.message);
      }
    }
    fetchTasksAndSections();
    setLoading(false);
  };

  const toggleAllDoToday = async (taskIds: string[], date: Date, add: boolean) => {
    if (!userId) return;
    setLoading(true);
    const formattedDate = date.toISOString().split('T')[0];
    let errorOccurred = false;

    if (add) {
      const tasksToAdd = taskIds.filter(id => !doTodayOffLog.some(log => log.task_id === id && log.off_date === formattedDate));
      if (tasksToAdd.length > 0) {
        const { error } = await supabase.from('do_today_off_log').insert(tasksToAdd.map(id => ({ user_id: userId, task_id: id, off_date: formattedDate })));
        if (error) {
          setError(error.message);
          console.error("Error adding all to do today log:", error.message);
          errorOccurred = true;
        }
      }
    } else {
      const tasksToRemove = doTodayOffLog.filter(log => taskIds.includes(log.task_id) && log.off_date === formattedDate);
      if (tasksToRemove.length > 0) {
        const { error } = await supabase.from('do_today_off_log').delete().in('id', tasksToRemove.map(log => log.id));
        if (error) {
          setError(error.message);
          console.error("Error removing all from do today log:", error.message);
          errorOccurred = true;
        }
      }
    }
    if (!errorOccurred) {
      fetchTasksAndSections();
    }
    setLoading(false);
  };

  const doTodayOffIds = useMemo(() => {
    const today = currentDate.toISOString().split('T')[0];
    return new Set(doTodayOffLog.filter(log => log.off_date === today).map(log => log.task_id));
  }, [doTodayOffLog, currentDate]);

  const setFocusTask = async (taskId: string | null) => {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase
      .from('user_settings')
      .update({ focused_task_id: taskId })
      .eq('user_id', userId);
    if (error) {
      setError(error.message);
      console.error("Error setting focus task:", error.message);
    } else {
      // No need to refetch all, just update local state if needed or rely on other fetches
    }
    setLoading(false);
  };

  const bulkUpdateTasks = async (taskIds: string[], payload: UpdateTaskPayload) => {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase
      .from('tasks')
      .update(payload)
      .in('id', taskIds)
      .eq('user_id', userId);
    if (error) {
      setError(error.message);
      console.error("Error bulk updating tasks:", error.message);
    } else {
      fetchTasksAndSections();
    }
    setLoading(false);
  };

  const archiveAllCompletedTasks = async () => {
    if (!userId) return;
    setLoading(true);
    const completedTaskIds = tasks.filter(task => task.status === 'completed').map(task => task.id);
    if (completedTaskIds.length > 0) {
      await bulkUpdateTasks(completedTaskIds, { status: 'archived' });
    }
    setLoading(false);
  };

  const markAllTasksInSectionCompleted = async (sectionId: string | null) => {
    if (!userId) return;
    setLoading(true);
    const tasksToComplete = tasks.filter(task => task.section_id === sectionId && task.status !== 'completed').map(task => task.id);
    if (tasksToComplete.length > 0) {
      await bulkUpdateTasks(tasksToComplete, { status: 'completed' });
    }
    setLoading(false);
  };

  const processedTasks = useMemo(() => {
    let filtered = tasks;

    if (viewMode === 'daily') {
      filtered = filtered.filter(task =>
        task.due_date && isSameDay(parseISO(task.due_date), currentDate) && task.status !== 'completed' && task.status !== 'archived'
      );
    } else if (viewMode === 'focus') {
      // Filter tasks whose section is included in focus mode
      const focusSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));
      filtered = filtered.filter(task =>
        (task.section_id && focusSectionIds.has(task.section_id)) && task.status !== 'completed' && task.status !== 'archived'
      );
    } else if (viewMode === 'archive') {
      filtered = filtered.filter(task => task.status === 'archived');
    } else { // 'all' viewMode
      filtered = filtered.filter(task => task.status !== 'archived');
    }

    // Apply general filters
    if (searchFilter) {
      filtered = filtered.filter(task =>
        task.description.toLowerCase().includes(searchFilter.toLowerCase())
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
  }, [tasks, sections, viewMode, currentDate, searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter]);

  const filteredTasks = processedTasks; // Alias for clarity

  const nextAvailableTask = useMemo(() => {
    return filteredTasks.find(task => task.status === 'to-do' && !task.parent_task_id);
  }, [filteredTasks]);

  const dailyProgress = useMemo(() => {
    const totalDailyTasks = tasks.filter(task =>
      task.due_date && isSameDay(parseISO(task.due_date), currentDate) && task.status !== 'archived'
    ).length;
    const completedDailyTasks = tasks.filter(task =>
      task.due_date && isSameDay(parseISO(task.due_date), currentDate) && task.status === 'completed'
    ).length;
    return {
      total: totalDailyTasks,
      completed: completedDailyTasks,
      progress: totalDailyTasks > 0 ? (completedDailyTasks / totalDailyTasks) * 100 : 0,
    };
  }, [tasks, currentDate]);

  return {
    tasks,
    processedTasks, // Raw tasks after initial processing (e.g., category join)
    filteredTasks,  // Tasks after applying all filters
    nextAvailableTask,
    sections,
    categories,
    loading,
    error,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderSections,
    updateTaskParentAndOrder,
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
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
    bulkUpdateTasks,
    archiveAllCompletedTasks,
    markAllTasksInSectionCompleted,
  };
};

export { useTasks };