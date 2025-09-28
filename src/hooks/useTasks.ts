import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay, isPast, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { showSuccess, showError } from '@/utils/toast';

export type TaskStatus = 'to-do' | 'completed' | 'skipped' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskRecurringType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  created_at: string;
  user_id: string;
  priority: TaskPriority;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number | null;
  parent_task_id: string | null;
  recurring_type: TaskRecurringType;
  original_task_id: string | null;
  category: string; // Category ID
  category_color: string; // Denormalized for easier access
  category_name: string; // Denormalized for easier access
  link: string | null;
  image_url: string | null;
  updated_at: string;
  completed_at: string | null;
}

export interface NewTaskData {
  description: string;
  category: string;
  priority: TaskPriority;
  due_date?: string | null;
  notes?: string | null;
  remind_at?: string | null;
  section_id?: string | null;
  recurring_type?: TaskRecurringType;
  parent_task_id?: string | null;
  link?: string | null;
  image_url?: string | null;
}

export interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
  include_in_focus_mode: boolean;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at?: string;
}

export interface UseTasksProps {
  currentDate: Date;
  userId: string | null;
  searchFilter?: string;
  statusFilter?: string;
  categoryFilter?: string;
  priorityFilter?: string;
  sectionFilter?: string;
  futureTasksDaysVisible?: number;
  focusedTaskId?: string | null;
}

export interface UseTasksReturn {
  tasks: Omit<Task, "category_color">[]; // Raw tasks from DB, without denormalized color
  processedTasks: Task[]; // Tasks with denormalized category info
  filteredTasks: Task[];
  loading: boolean;
  handleAddTask: (taskData: NewTaskData) => Promise<Task | null>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  deleteTask: (taskId: string) => void;
  bulkUpdateTasks: (updates: Partial<Task>, ids: string[]) => Promise<void>;
  bulkDeleteTasks: (ids: string[]) => Promise<boolean>;
  markAllTasksInSectionCompleted: (sectionId: string | null) => Promise<void>;
  sections: TaskSection[];
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  updateTaskParentAndOrder: (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null, isDraggingDown: boolean) => Promise<void>;
  reorderSections: (activeId: string, overId: string) => Promise<void>;
  allCategories: Category[];
  expandedSections: Record<string, boolean>;
  expandedTasks: Record<string, boolean>;
  toggleTask: (taskId: string) => void;
  toggleSection: (sectionId: string) => void;
  toggleAllSections: () => void;
  setFocusTask: (taskId: string | null) => Promise<void>;
  doTodayOffIds: Set<string>;
  toggleDoToday: (task: Task) => void;
  dailyProgress: {
    totalPendingCount: number;
    completedCount: number;
    overdueCount: number;
  };
  nextAvailableTask: Task | null;
  archiveAllCompletedTasks: () => Promise<void>;
  toggleAllDoToday: () => Promise<void>;
}

export const useTasks = ({
  currentDate,
  userId,
  searchFilter = '',
  statusFilter = 'all',
  categoryFilter = 'all',
  priorityFilter = 'all',
  sectionFilter = 'all',
  futureTasksDaysVisible = 7,
  focusedTaskId = null,
}: UseTasksProps): UseTasksReturn => {
  const [tasks, setTasks] = useState<Omit<Task, "category_color">[]>([]);
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [doTodayOffIds, setDoTodayOffIds] = useState<Set<string>>(new Set());

  // --- Fetching Data ---
  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      // Apply date filter for non-archived tasks
      if (statusFilter !== 'archived') {
        const startOfDay = format(currentDate, 'yyyy-MM-dd');
        if (futureTasksDaysVisible === 0) {
          // Only tasks due today or no due date
          query = query.or(`due_date.is.null,due_date.eq.${startOfDay}`);
        } else if (futureTasksDaysVisible && futureTasksDaysVisible > 0) {
          const futureDate = addDays(currentDate, futureTasksDaysVisible);
          const endOfPeriod = format(futureDate, 'yyyy-MM-dd');
          query = query.or(`due_date.is.null,due_date.lte.${endOfPeriod}`);
        }
      }

      const { data, error } = await query.order('order', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error('Error fetching tasks:', error.message);
      showError('Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [userId, currentDate, statusFilter, futureTasksDaysVisible]);

  const fetchSections = useCallback(async () => {
    if (!userId) {
      setSections([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('task_sections')
        .select('*')
        .eq('user_id', userId)
        .order('order', { ascending: true });
      if (error) throw error;
      setSections(data || []);
    } catch (error: any) {
      console.error('Error fetching sections:', error.message);
      showError('Failed to load sections.');
    }
  }, [userId]);

  const fetchCategories = useCallback(async () => {
    if (!userId) {
      setAllCategories([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });
      if (error) throw error;
      setAllCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error.message);
      showError('Failed to load categories.');
    }
  }, [userId]);

  const fetchDoTodayOffLog = useCallback(async () => {
    if (!userId) {
      setDoTodayOffIds(new Set());
      return;
    }
    try {
      const { data, error } = await supabase
        .from('do_today_off_log')
        .select('task_id')
        .eq('user_id', userId)
        .eq('off_date', format(currentDate, 'yyyy-MM-dd'));
      if (error) throw error;
      setDoTodayOffIds(new Set(data.map(item => item.task_id)));
    } catch (error: any) {
      console.error('Error fetching do today off log:', error.message);
    }
  }, [userId, currentDate]);

  useEffect(() => {
    fetchTasks();
    fetchSections();
    fetchCategories();
    fetchDoTodayOffLog();

    const tasksChannel = supabase
      .channel('public:tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, payload => {
        fetchTasks();
      })
      .subscribe();

    const sectionsChannel = supabase
      .channel('public:task_sections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_sections', filter: `user_id=eq.${userId}` }, payload => {
        fetchSections();
      })
      .subscribe();

    const categoriesChannel = supabase
      .channel('public:task_categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_categories', filter: `user_id=eq.${userId}` }, payload => {
        fetchCategories();
      })
      .subscribe();

    const doTodayLogChannel = supabase
      .channel('public:do_today_off_log')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'do_today_off_log', filter: `user_id=eq.${userId}` }, payload => {
        fetchDoTodayOffLog();
      })
      .subscribe();

    return () => {
      tasksChannel.unsubscribe();
      sectionsChannel.unsubscribe();
      categoriesChannel.unsubscribe();
      doTodayLogChannel.unsubscribe();
    };
  }, [userId, fetchTasks, fetchSections, fetchCategories, fetchDoTodayOffLog]);

  // --- Data Processing and Filtering ---
  const processedTasks = useMemo(() => {
    return tasks.map(task => {
      const category = allCategories.find(cat => cat.id === task.category);
      return {
        ...task,
        category_color: category?.color || '#6b7280', // Default to gray
        category_name: category?.name || 'Uncategorized',
      };
    });
  }, [tasks, allCategories]);

  const filteredTasks = useMemo(() => {
    let filtered = processedTasks;

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

    // Filter for focused task if set
    if (focusedTaskId) {
      const focusedTask = filtered.find(t => t.id === focusedTaskId);
      if (focusedTask) {
        // Include the focused task and its direct subtasks
        const subtasksOfFocused = filtered.filter(t => t.parent_task_id === focusedTaskId);
        filtered = [focusedTask, ...subtasksOfFocused];
      } else {
        filtered = []; // If focused task not found, show nothing
      }
    }

    return filtered;
  }, [processedTasks, searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter, focusedTaskId]);

  const nextAvailableTask = useMemo(() => {
    const todayFormatted = format(currentDate, 'yyyy-MM-dd');
    const tasksForToday = filteredTasks.filter(task =>
      task.status === 'to-do' &&
      !doTodayOffIds.has(task.original_task_id || task.id) &&
      (task.due_date === null || isSameDay(parseISO(task.due_date), currentDate) || isPast(parseISO(task.due_date))) &&
      task.parent_task_id === null // Only consider top-level tasks
    );

    // Prioritize urgent, then high, then medium, then low
    const sortedTasks = tasksForToday.sort((a, b) => {
      const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });

    return sortedTasks.length > 0 ? sortedTasks[0] : null;
  }, [filteredTasks, currentDate, doTodayOffIds]);

  const dailyProgress = useMemo(() => {
    const todayTasks = processedTasks.filter(task =>
      (task.due_date === null || isSameDay(parseISO(task.due_date), currentDate) || isPast(parseISO(task.due_date))) &&
      !doTodayOffIds.has(task.original_task_id || task.id) &&
      task.parent_task_id === null // Only count top-level tasks for daily progress
    );

    const totalPendingCount = todayTasks.filter(task => task.status === 'to-do').length;
    const completedCount = todayTasks.filter(task => task.status === 'completed').length;
    const overdueCount = todayTasks.filter(task => task.status === 'to-do' && task.due_date && isPast(parseISO(task.due_date)) && !isSameDay(parseISO(task.due_date), currentDate)).length;

    return { totalPendingCount, completedCount, overdueCount };
  }, [processedTasks, currentDate, doTodayOffIds]);

  // --- Task Actions ---
  const handleAddTask = async (taskData: NewTaskData): Promise<Task | null> => {
    if (!userId) {
      showError('User not authenticated. Cannot add task.');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          user_id: userId,
          status: 'to-do',
          order: tasks.length, // Simple ordering for new tasks
          recurring_type: taskData.recurring_type || 'none',
        })
        .select()
        .single();

      if (error) throw error;
      showSuccess('Task added successfully!');
      return data as Task;
    } catch (error: any) {
      showError('Failed to add task.');
      console.error('Error adding task:', error.message);
      return null;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>): Promise<string | null> => {
    if (!userId) {
      showError('User not authenticated. Cannot update task.');
      return null;
    }
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(), // Manually update updated_at
          completed_at: updates.status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Task updated successfully!');
      return taskId;
    } catch (error: any) {
      showError('Failed to update task.');
      console.error('Error updating task:', error.message);
      return null;
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!userId) {
      showError('User not authenticated. Cannot delete task.');
      return;
    }
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Task deleted successfully!');
    } catch (error: any) {
      showError('Failed to delete task.');
      console.error('Error deleting task:', error.message);
    }
  };

  const bulkUpdateTasks = async (updates: Partial<Task>, ids: string[]) => {
    if (!userId) {
      showError('User not authenticated. Cannot perform bulk update.');
      return;
    }
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          completed_at: updates.status === 'completed' ? new Date().toISOString() : null,
        })
        .in('id', ids)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Tasks updated successfully!');
    } catch (error: any) {
      showError('Failed to bulk update tasks.');
      console.error('Error bulk updating tasks:', error.message);
    }
  };

  const bulkDeleteTasks = async (ids: string[]): Promise<boolean> => {
    if (!userId) {
      showError('User not authenticated. Cannot perform bulk delete.');
      return false;
    }
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', ids)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Tasks deleted successfully!');
      return true;
    } catch (error: any) {
      showError('Failed to bulk delete tasks.');
      console.error('Error bulk deleting tasks:', error.message);
      return false;
    }
  };

  const markAllTasksInSectionCompleted = async (sectionId: string | null) => {
    if (!userId) {
      showError('User not authenticated. Cannot mark tasks complete.');
      return;
    }
    const tasksToComplete = processedTasks.filter(task =>
      task.status === 'to-do' &&
      (sectionId === null ? task.section_id === null : task.section_id === sectionId)
    ).map(task => task.id);

    if (tasksToComplete.length > 0) {
      await bulkUpdateTasks({ status: 'completed' }, tasksToComplete);
      showSuccess(`Marked ${tasksToComplete.length} tasks in section as completed!`);
    } else {
      toast.info('No pending tasks in this section to mark complete.');
    }
  };

  const archiveAllCompletedTasks = async () => {
    if (!userId) {
      showError('User not authenticated. Cannot archive tasks.');
      return;
    }
    const completedTaskIds = processedTasks.filter(task => task.status === 'completed').map(task => task.id);
    if (completedTaskIds.length > 0) {
      await bulkUpdateTasks({ status: 'archived' }, completedTaskIds);
      showSuccess(`Archived ${completedTaskIds.length} completed tasks!`);
    } else {
      toast.info('No completed tasks to archive.');
    }
  };

  const toggleAllDoToday = async () => {
    if (!userId) {
      showError('User not authenticated. Cannot toggle "Do Today".');
      return;
    }
    const allTodayTaskIds = processedTasks.filter(task =>
      (task.due_date === null || isSameDay(parseISO(task.due_date), currentDate) || isPast(parseISO(task.due_date))) &&
      task.parent_task_id === null
    ).map(task => task.original_task_id || task.id);

    const tasksCurrentlyOff = Array.from(doTodayOffIds).filter(id => allTodayTaskIds.includes(id));
    const tasksCurrentlyOn = allTodayTaskIds.filter(id => !doTodayOffIds.has(id));

    if (tasksCurrentlyOff.length > 0) {
      // If some are off, turn them all on
      await supabase.from('do_today_off_log')
        .delete()
        .eq('off_date', format(currentDate, 'yyyy-MM-dd'))
        .in('task_id', tasksCurrentlyOff)
        .eq('user_id', userId);
      showSuccess('All "Do Today" tasks enabled!');
    } else if (tasksCurrentlyOn.length > 0) {
      // If all are on, turn them all off
      const { error } = await supabase.from('do_today_off_log')
        .insert(tasksCurrentlyOn.map(id => ({
          user_id: userId,
          task_id: id,
          off_date: format(currentDate, 'yyyy-MM-dd'),
        })));
      if (error) throw error;
      showSuccess('All "Do Today" tasks disabled!');
    } else {
      toast.info('No tasks available to toggle "Do Today".');
    }
  };

  // --- Section Actions ---
  const createSection = async (name: string) => {
    if (!userId) {
      showError('User not authenticated. Cannot create section.');
      return;
    }
    try {
      const { error } = await supabase
        .from('task_sections')
        .insert({ name, user_id: userId, order: sections.length });
      if (error) throw error;
      showSuccess('Section created successfully!');
    } catch (error: any) {
      showError('Failed to create section.');
      console.error('Error creating section:', error.message);
    }
  };

  const updateSection = async (sectionId: string, newName: string) => {
    if (!userId) {
      showError('User not authenticated. Cannot update section.');
      return;
    }
    try {
      const { error } = await supabase
        .from('task_sections')
        .update({ name: newName })
        .eq('id', sectionId)
        .eq('user_id', userId);
      if (error) throw error;
      showSuccess('Section updated successfully!');
    } catch (error: any) {
      showError('Failed to update section.');
      console.error('Error updating section:', error.message);
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!userId) {
      showError('User not authenticated. Cannot delete section.');
      return;
    }
    try {
      // First, reassign tasks in this section to null
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
      showSuccess('Section deleted successfully!');
    } catch (error: any) {
      showError('Failed to delete section.');
      console.error('Error deleting section:', error.message);
    }
  };

  const updateSectionIncludeInFocusMode = async (sectionId: string, include: boolean) => {
    if (!userId) {
      showError('User not authenticated. Cannot update section.');
      return;
    }
    try {
      const { error } = await supabase
        .from('task_sections')
        .update({ include_in_focus_mode: include })
        .eq('id', sectionId)
        .eq('user_id', userId);
      if (error) throw error;
      showSuccess('Section focus mode setting updated!');
    } catch (error: any) {
      showError('Failed to update section focus mode setting.');
      console.error('Error updating section focus mode setting:', error.message);
    }
  };

  const reorderSections = async (activeId: string, overId: string) => {
    if (!userId) return;

    const activeSection = sections.find(s => s.id === activeId);
    const overSection = sections.find(s => s.id === overId);

    if (activeSection && overSection) {
      const newSections = [...sections];
      const oldIndex = newSections.findIndex(s => s.id === activeId);
      const newIndex = newSections.findIndex(s => s.id === overId);

      const [removed] = newSections.splice(oldIndex, 1);
      newSections.splice(newIndex, 0, removed);

      const updates = newSections.map((s, index) => ({
        id: s.id,
        order: index,
      }));

      try {
        const { error } = await supabase.rpc('update_sections_order', { updates });
        if (error) throw error;
        showSuccess('Sections reordered!');
      } catch (error: any) {
        showError('Failed to reorder sections.');
        console.error('Error reordering sections:', error.message);
      }
    }
  };

  const updateTaskParentAndOrder = async (activeId: string, newParentId: string | null, newSectionId: string | null, overId: string | null, isDraggingDown: boolean) => {
    if (!userId) return;

    const activeTask = processedTasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const tasksInTargetSection = processedTasks.filter(t =>
      t.parent_task_id === newParentId &&
      (newSectionId === null ? t.section_id === null : t.section_id === newSectionId)
    ).sort((a, b) => (a.order || 0) - (b.order || 0));

    let newOrder = 0;
    if (overId) {
      const overTaskIndex = tasksInTargetSection.findIndex(t => t.id === overId);
      if (overTaskIndex !== -1) {
        newOrder = isDraggingDown ? overTaskIndex + 1 : overTaskIndex;
      } else {
        newOrder = tasksInTargetSection.length; // Fallback to end if overId not found
      }
    } else {
      newOrder = tasksInTargetSection.length; // If no overId, place at the end
    }

    // Adjust order for existing tasks in the target list
    const updates = tasksInTargetSection.map((task, index) => {
      let currentTaskOrder = index;
      if (task.id === activeId) {
        return null; // Skip the active task for now
      }
      if (index >= newOrder) {
        currentTaskOrder++;
      }
      return { id: task.id, order: currentTaskOrder };
    }).filter(Boolean);

    // Add the active task's update
    updates.splice(newOrder, 0, {
      id: activeId,
      order: newOrder,
      parent_task_id: newParentId,
      section_id: newSectionId,
    });

    try {
      const { error } = await supabase.rpc('update_tasks_order', { updates });
      if (error) throw error;
      showSuccess('Task reordered!');
    } catch (error: any) {
      showError('Failed to reorder task.');
      console.error('Error reordering task:', error.message);
    }
  };

  // --- UI State Toggles ---
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] === undefined ? false : !prev[sectionId],
    }));
  };

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: prev[taskId] === undefined ? false : !prev[taskId],
    }));
  };

  const toggleAllSections = () => {
    const allExpanded = Object.values(expandedSections).every(Boolean);
    const newExpandedState = sections.reduce((acc, section) => {
      acc[section.id] = !allExpanded;
      return acc;
    }, {} as Record<string, boolean>);
    setExpandedSections(newExpandedState);
  };

  const setFocusTask = async (taskId: string | null) => {
    if (!userId) {
      showError('User not authenticated. Cannot set focus task.');
      return;
    }
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ focused_task_id: taskId })
        .eq('user_id', userId);
      if (error) throw error;
      showSuccess(taskId ? 'Task set as focus!' : 'Focus task cleared!');
    } catch (error: any) {
      showError('Failed to set focus task.');
      console.error('Error setting focus task:', error.message);
    }
  };

  const toggleDoToday = async (task: Task) => {
    if (!userId) {
      showError('User not authenticated. Cannot toggle "Do Today".');
      return;
    }
    const taskIdToToggle = task.original_task_id || task.id;
    const isCurrentlyOff = doTodayOffIds.has(taskIdToToggle);

    try {
      if (isCurrentlyOff) {
        // Remove from log (turn on "Do Today")
        await supabase.from('do_today_off_log')
          .delete()
          .eq('task_id', taskIdToToggle)
          .eq('off_date', format(currentDate, 'yyyy-MM-dd'))
          .eq('user_id', userId);
        setDoTodayOffIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskIdToToggle);
          return newSet;
        });
        showSuccess(`"${task.description}" added to "Do Today"!`);
      } else {
        // Add to log (turn off "Do Today")
        await supabase.from('do_today_off_log')
          .insert({
            user_id: userId,
            task_id: taskIdToToggle,
            off_date: format(currentDate, 'yyyy-MM-dd'),
          });
        setDoTodayOffIds(prev => new Set(prev).add(taskIdToToggle));
        showSuccess(`"${task.description}" removed from "Do Today".`);
      }
    } catch (error: any) {
      showError('Failed to toggle "Do Today" status.');
      console.error('Error toggling do today:', error.message);
    }
  };

  return {
    tasks,
    processedTasks,
    filteredTasks,
    loading,
    handleAddTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    markAllTasksInSectionCompleted,
    sections,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    updateTaskParentAndOrder,
    reorderSections,
    allCategories,
    expandedSections,
    expandedTasks,
    toggleTask,
    toggleSection,
    toggleAllSections,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    dailyProgress,
    nextAvailableTask,
    archiveAllCompletedTasks,
    toggleAllDoToday,
  };
};