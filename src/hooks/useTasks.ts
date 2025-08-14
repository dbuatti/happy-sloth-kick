import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { isSameDay, addDays, startOfDay, endOfDay } from 'date-fns'; // Removed getUnixTime

// Define the payload type for Supabase realtime changes
interface SupabaseRealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE';
  schema: string;
  table: string;
  commit_timestamp: string;
  errors: string[];
  old: T | null;
  new: T | null;
}

export interface Task {
  id: string;
  user_id: string;
  description: string;
  status: 'todo' | 'completed' | 'archived' | 'skipped'; // Added 'skipped'
  due_date?: string; // ISO string format, e.g., '2023-10-27T10:00:00Z'
  priority?: 'low' | 'medium' | 'high';
  category_id?: string | null; // Made nullable
  section_id?: string | null; // Made nullable
  created_at: string;
  completed_at?: string;
  order: number; // For sorting within a list
  original_task_id?: string | null; // For recurring tasks
  recurring_type?: 'none' | 'daily' | 'weekly' | 'monthly';
  link?: string | null;
  image_url?: string | null;
  notes?: string | null;
  remind_at?: string | null;
  parent_task_id?: string | null; // For subtasks
}

export interface Section {
  id: string;
  user_id: string;
  name: string;
  order: number;
  include_in_focus_mode: boolean;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color?: string; // Added color property
}

interface UseTasksOptions {
  viewMode?: 'daily' | 'weekly' | 'all' | 'archive' | 'focus';
  userId?: string;
  showFutureTasksForDays?: number | null;
  initialDate?: Date;
}

export const useTasks = ({
  viewMode = 'daily',
  userId,
  showFutureTasksForDays,
  initialDate = new Date(),
}: UseTasksOptions) => {
  const [allRawTasks, setAllRawTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters and state for TaskList/DailyTasksV3
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>('todo');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Task['priority'] | 'all'>('all');
  const [sectionFilter, setSectionFilter] = useState<string | 'all'>('all');
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [doTodayOffIds, setDoTodayOffIds] = useState<Set<string>>(new Set());
  const [focusTask, setFocusTask] = useState<Task | null>(null);

  // Fetching data
  const fetchTasksAndSections = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('order', { ascending: true });

    const { data: sectionsData, error: sectionsError } = await supabase
      .from('sections')
      .select('*')
      .eq('user_id', userId)
      .order('order', { ascending: true });

    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    if (tasksError) console.error('Error fetching tasks:', tasksError);
    if (sectionsError) console.error('Error fetching sections:', sectionsError);
    if (categoriesError) console.error('Error fetching categories:', categoriesError);

    setAllRawTasks(tasksData || []);
    setSections(sectionsData || []);
    setAllCategories(categoriesData || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchTasksAndSections();

    const tasksSubscription = supabase
      .channel('public:tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => { // Removed unused payload
        fetchTasksAndSections();
      })
      .subscribe();

    const sectionsSubscription = supabase
      .channel('public:sections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sections' }, () => { // Removed unused payload
        fetchTasksAndSections();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksSubscription);
      supabase.removeChannel(sectionsSubscription);
    };
  }, [userId, fetchTasksAndSections]);

  // Processed and filtered tasks based on viewMode and filters
  const processedTasks = useMemo(() => {
    let currentTasks = allRawTasks;

    // Apply viewMode specific filters first
    if (viewMode === 'daily') {
      const endOfCurrentDate = endOfDay(currentDate);

      currentTasks = currentTasks.filter(task => {
        if (task.status === 'completed' || task.status === 'archived' || task.status === 'skipped') return false;

        if (!task.due_date) {
          return true; // Tasks without a due date are included in daily view if they are not completed/archived/skipped
        }
        const taskDueDate = new Date(task.due_date);
        return taskDueDate <= endOfCurrentDate;
      });
    } else if (viewMode === 'archive') {
      currentTasks = currentTasks.filter(task => task.status === 'archived');
    } else if (viewMode === 'focus') {
      const focusModeSectionIds = new Set(sections.filter(s => s.include_in_focus_mode).map(s => s.id));
      currentTasks = currentTasks.filter(task =>
        task.status === 'todo' &&
        task.parent_task_id === null &&
        (task.section_id === null || (task.section_id && focusModeSectionIds.has(task.section_id))) // Handle null section_id
      );
    }
    // 'weekly' and 'all' view modes would have their own logic here if needed

    // Apply general filters (search, status, category, priority, section)
    let filtered = currentTasks;

    if (searchFilter) {
      filtered = filtered.filter(task =>
        task.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(task => task.category_id === categoryFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    if (sectionFilter !== 'all') {
      filtered = filtered.filter(task => task.section_id === sectionFilter);
    }

    // Sort tasks for display
    return filtered.sort((a, b) => {
      // Primary sort by order
      if (a.order !== b.order) {
        return (a.order || 0) - (b.order || 0);
      }
      // Secondary sort by due date (earliest first, undated last)
      const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      // Tertiary sort by priority (high > medium > low)
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1, undefined: 0 };
      const pA = priorityOrder[a.priority || 'undefined'];
      const pB = priorityOrder[b.priority || 'undefined'];
      if (pA !== pB) {
        return pB - pA; // Higher priority first
      }
      return 0;
    });
  }, [allRawTasks, viewMode, searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter, currentDate, sections]);

  // Next available task logic
  const nextAvailableTask = useMemo(() => {
    const todoTasks = allRawTasks.filter(task => task.status === 'todo');

    let relevantTodoTasks = todoTasks;

    const effectiveFutureDays = showFutureTasksForDays ?? 7;

    if (effectiveFutureDays !== null) {
      const now = startOfDay(new Date());
      const futureCutoff = endOfDay(addDays(now, effectiveFutureDays));

      relevantTodoTasks = relevantTodoTasks.filter(task => {
        if (!task.due_date) {
          return true; // Tasks without a due date are always considered relevant for next task
        }
        const taskDueDate = new Date(task.due_date);
        return taskDueDate <= futureCutoff;
      });
    }

    // Sort by due_date (earliest first), then by priority, then by order
    relevantTodoTasks.sort((a, b) => {
      const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;

      if (dateA !== dateB) {
        return dateA - dateB;
      }

      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1, undefined: 0 };
      const pA = priorityOrder[a.priority || 'undefined'];
      const pB = priorityOrder[b.priority || 'undefined'];
      if (pA !== pB) {
        return pB - pA;
      }

      return a.order - b.order;
    });

    return relevantTodoTasks[0] || null;
  }, [allRawTasks, showFutureTasksForDays]);

  // Daily progress calculation
  const dailyProgress = useMemo(() => {
    const tasksForToday = allRawTasks.filter(task => {
      if (task.due_date) {
        return isSameDay(new Date(task.due_date), currentDate);
      }
      return false;
    });

    const completedCount = tasksForToday.filter(task => task.status === 'completed').length;
    const overdueCount = tasksForToday.filter(task => task.status === 'todo' && new Date(task.due_date!) < startOfDay(currentDate)).length;
    const totalCount = tasksForToday.length;

    return {
      totalCount,
      completedCount,
      overdueCount,
      progressPercentage: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
    };
  }, [allRawTasks, currentDate]);


  // CRUD operations for tasks
  const updateTask = async (taskId: string, updates: Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>) => {
    if (!userId) return false;
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('user_id', userId);
    if (error) {
      console.error('Error updating task:', error);
      return false;
    }
    return true;
  };

  const deleteTask = async (taskId: string) => {
    if (!userId) return false;
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);
    if (error) {
      console.error('Error deleting task:', error);
      return false;
    }
    return true;
  };

  const handleAddTask = async (newTaskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'order' | 'status'>) => {
    if (!userId) return null;
    const newOrder = allRawTasks.length > 0 ? Math.max(...allRawTasks.map(t => t.order || 0)) + 1 : 0;
    const newTask: Task = {
      id: uuidv4(),
      user_id: userId,
      status: 'todo',
      created_at: new Date().toISOString(),
      order: newOrder,
      ...newTaskData,
    };
    const { data, error } = await supabase
      .from('tasks')
      .insert(newTask)
      .select()
      .single();
    if (error) {
      console.error('Error adding task:', error);
      return null;
    }
    return data;
  };

  const bulkUpdateTasks = async (taskIds: string[], updates: Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>) => {
    if (!userId || taskIds.length === 0) return false;
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .in('id', taskIds)
      .eq('user_id', userId);
    if (error) {
      console.error('Error bulk updating tasks:', error);
      return false;
    }
    return true;
  };

  const archiveAllCompletedTasks = async () => {
    const completedTaskIds = allRawTasks.filter(t => t.status === 'completed').map(t => t.id);
    return bulkUpdateTasks(completedTaskIds, { status: 'archived' });
  };

  const markAllTasksInSectionCompleted = async (sectionId: string | null) => {
    const tasksToComplete = allRawTasks.filter(t =>
      t.status === 'todo' &&
      t.parent_task_id === null &&
      (sectionId === null ? t.section_id === null : t.section_id === sectionId)
    ).map(t => t.id);
    return bulkUpdateTasks(tasksToComplete, { status: 'completed', completed_at: new Date().toISOString() });
  };

  // CRUD operations for sections
  const createSection = async (name: string) => {
    if (!userId) return null;
    const newOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order || 0)) + 1 : 0;
    const newSection: Section = {
      id: uuidv4(),
      user_id: userId,
      name,
      order: newOrder,
      include_in_focus_mode: true,
    };
    const { data, error } = await supabase
      .from('sections')
      .insert(newSection)
      .select()
      .single();
    if (error) {
      console.error('Error creating section:', error);
      return null;
    }
    return data;
  };

  const updateSection = async (sectionId: string, updates: Partial<Omit<Section, 'id' | 'user_id'>>) => {
    if (!userId) return false;
    const { error } = await supabase
      .from('sections')
      .update(updates)
      .eq('id', sectionId)
      .eq('user_id', userId);
    if (error) {
      console.error('Error updating section:', error);
      return false;
    }
    return true;
  };

  const deleteSection = async (sectionId: string) => {
    if (!userId) return false;
    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', sectionId)
      .eq('user_id', userId);
    if (error) {
      console.error('Error deleting section:', error);
      return false;
    }
    return true;
  };

  const updateSectionIncludeInFocusMode = async (sectionId: string, include: boolean) => {
    return updateSection(sectionId, { include_in_focus_mode: include });
  };

  const reorderSections = async (orderedSectionIds: string[]) => {
    if (!userId) return false;
    const updates = orderedSectionIds.map((id, index) => ({
      id,
      order: index,
    }));
    const { error } = await supabase
      .from('sections')
      .upsert(updates, { onConflict: 'id', ignoreDuplicates: false });
    if (error) {
      console.error('Error reordering sections:', error);
      return false;
    }
    return true;
  };

  const updateTaskParentAndOrder = async (
    activeTaskId: string,
    overId: string | null,
    newParentId: string | null,
    newSectionId: string | null,
  ) => {
    if (!userId) return false;

    const activeTask = allRawTasks.find(t => t.id === activeTaskId);
    if (!activeTask) return false;

    let targetTasks: Task[] = [];
    if (newParentId) {
      targetTasks = allRawTasks.filter(t => t.parent_task_id === newParentId).sort((a, b) => a.order - b.order);
    } else if (newSectionId) {
      targetTasks = allRawTasks.filter(t => t.section_id === newSectionId && t.parent_task_id === null).sort((a, b) => a.order - b.order);
    } else {
      targetTasks = allRawTasks.filter(t => t.section_id === null && t.parent_task_id === null).sort((a, b) => a.order - b.order);
    }

    const activeIndex = targetTasks.findIndex(t => t.id === activeTaskId);
    let overIndex = overId ? targetTasks.findIndex(t => t.id === overId) : -1;

    if (overIndex === -1 && overId) {
        overIndex = targetTasks.length;
    } else if (overIndex === -1 && !overId) {
        overIndex = targetTasks.length;
    }

    let newOrderedTasks = [...targetTasks];

    if (activeIndex !== -1) {
        newOrderedTasks.splice(activeIndex, 1);
        if (activeIndex < overIndex) {
            overIndex--;
        }
    }

    newOrderedTasks.splice(overIndex, 0, activeTask);

    const updates: { id: string; order: number; parent_task_id: string | null; section_id: string | null }[] = [];
    newOrderedTasks.forEach((task, index) => {
        if (task.order !== index || task.parent_task_id !== newParentId || task.section_id !== newSectionId) {
            updates.push({
                id: task.id,
                order: index,
                parent_task_id: newParentId,
                section_id: newSectionId,
            });
        }
    });

    if (activeTask.parent_task_id !== newParentId || activeTask.section_id !== newSectionId) {
        if (!updates.some(u => u.id === activeTaskId)) {
            updates.push({
                id: activeTaskId,
                order: activeTask.order,
                parent_task_id: newParentId,
                section_id: newSectionId,
            });
        }
    }

    if (updates.length === 0) return true;

    const { error } = await supabase
        .from('tasks')
        .upsert(updates, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
        console.error('Error updating task parent and order:', error);
        return false;
    }
    return true;
  };

  // "Do Today" functionality
  const toggleDoToday = useCallback((task: Task) => {
    setDoTodayOffIds(prev => {
      const newSet = new Set(prev);
      const targetId = task.original_task_id || task.id;
      if (newSet.has(targetId)) {
        newSet.delete(targetId);
      } else {
        newSet.add(targetId);
      }
      return newSet;
    });
  }, []);

  const toggleAllDoToday = useCallback((sectionId: string | null, turnOn: boolean) => {
    setDoTodayOffIds(prev => {
      const newSet = new Set(prev);
      const tasksInTarget = allRawTasks.filter(t =>
        t.parent_task_id === null &&
        (sectionId === null ? t.section_id === null : t.section_id === sectionId)
      );

      tasksInTarget.forEach(task => {
        const targetId = task.original_task_id || task.id;
        if (turnOn) {
          newSet.delete(targetId);
        } else {
          newSet.add(targetId);
        }
      });
      return newSet;
    });
  }, [allRawTasks]);


  return {
    tasks: allRawTasks, // All raw tasks
    processedTasks, // Tasks filtered by viewMode and general filters
    filteredTasks: processedTasks, // Alias for backward compatibility
    nextAvailableTask,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    loading,
    handleAddTask,
    bulkUpdateTasks,
    archiveAllCompletedTasks,
    markAllTasksInSectionCompleted,
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
    currentDate,
    setCurrentDate,
    focusTask,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    toggleAllDoToday,
    dailyProgress,
  };
};