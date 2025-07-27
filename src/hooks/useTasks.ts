import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess, showReminder } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';
import { isSameDay, isPast, startOfDay as fnsStartOfDay, parseISO, format } from 'date-fns';

export interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  created_at: string;
  user_id: string;
  category: string;
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
}

type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>;

interface NewTaskData {
  description: string;
  status?: 'to-do' | 'completed' | 'skipped' | 'archived';
  recurring_type?: 'none' | 'daily' | 'weekly' | 'monthly';
  category?: string;
  priority?: string;
  due_date?: string | null;
  notes?: string | null;
  remind_at?: string | null;
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

export const useTasks = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => fnsStartOfDay(new Date()));
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<'priority' | 'due_date' | 'created_at' | 'order'>('order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sections, setSections] = useState<TaskSection[]>([]);

  const [searchFilter, setSearchFilter] = useState(() => getInitialFilter('search', ''));
  const [statusFilter, setStatusFilter] = useState(() => getInitialFilter('status', 'all'));
  const [categoryFilter, setCategoryFilter] = useState(() => getInitialFilter('category', 'all'));
  const [priorityFilter, setPriorityFilter] = useState(() => getInitialFilter('priority', 'all'));
  const [sectionFilter, setSectionFilter] = useState(() => getInitialFilter('section', 'all'));

  const remindedTaskIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('task_filter_search', searchFilter);
  }, [searchFilter]);

  useEffect(() => {
    localStorage.setItem('task_filter_status', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('task_filter_category', categoryFilter);
  }, [categoryFilter]);

  useEffect(() => {
    localStorage.setItem('task_filter_priority', priorityFilter);
  }, [priorityFilter]);

  useEffect(() => {
    localStorage.setItem('task_filter_section', sectionFilter);
  }, [sectionFilter]);

  const fetchSections = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('task_sections')
        .select('*')
        .eq('user_id', userId)
        .order('order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error: any) {
      console.error('Error fetching sections:', error);
      showError('Failed to load sections.');
    }
  }, [userId]);

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    try {
      const { data: allTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      let processedTasks: Task[] = allTasks || [];

      const dailyRecurringTemplates = processedTasks.filter(
        task => task.recurring_type === 'daily' && task.original_task_id === null
      );

      const newRecurringInstances: Task[] = [];

      for (const template of dailyRecurringTemplates) {
        const activeInstanceExistsForToday = processedTasks.some(task =>
          task.original_task_id === template.id && 
          isSameDay(parseISO(task.created_at), fnsStartOfDay(currentDate)) &&
          (task.status === 'to-do' || task.status === 'skipped')
        );

        if (!activeInstanceExistsForToday) {
          const newInstance: Task = {
            ...template,
            id: uuidv4(),
            created_at: fnsStartOfDay(currentDate).toISOString(),
            status: 'to-do',
            recurring_type: 'none', // New instance is a regular task, not recurring itself
            original_task_id: template.id, // Link back to the template
            due_date: null, // Reset due date for new instance
            remind_at: null, // Reset reminder for new instance
            parent_task_id: null, // Ensure it's a top-level task
          };
          newRecurringInstances.push(newInstance);
        }
      }

      if (newRecurringInstances.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('tasks')
          .insert(newRecurringInstances)
          .select();

        if (insertError) throw insertError;
        processedTasks = [...processedTasks, ...(insertedData || [])];
      }
      
      setTasks(processedTasks);
    } catch (error: any) {
      console.error('Error in fetchTasks:', error);
      showError('An unexpected error occurred while loading tasks.');
    } finally {
      setLoading(false);
    }
  }, [userId, currentDate]);

  useEffect(() => {
    if (userId) {
      fetchSections();
      fetchTasks();
    } else {
      setTasks([]);
      setSections([]);
      setLoading(false);
    }
  }, [userId, fetchSections, fetchTasks]);

  useEffect(() => {
    if (!userId) return;

    const reminderInterval = setInterval(() => {
      const now = new Date();
      tasks.forEach(task => {
        if (task.remind_at && task.status === 'to-do' && !remindedTaskIdsRef.current.has(task.id)) {
          const reminderTime = parseISO(task.remind_at);
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
          
          if (reminderTime <= now && reminderTime > fiveMinutesAgo) {
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
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...newTaskData, user_id: userId, created_at: fnsStartOfDay(currentDate).toISOString() })
        .select()
        .single();

      if (error) throw error;
      setTasks(prev => [...prev, data]);
      showSuccess('Task added successfully!');
      return true;
    } catch (error: any) {
      console.error('Error adding task:', error);
      showError('Failed to add task.');
      return false;
    }
  }, [userId, currentDate]);

  const updateTask = useCallback(async (taskId: string, updates: TaskUpdate) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      setTasks(prev => prev.map(task => (task.id === taskId ? data : task)));
      showSuccess('Task updated successfully!');
    } catch (error: any) {
      console.error('Error updating task:', error);
      showError('Failed to update task.');
    }
  }, [userId]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      const { error: subtaskError } = await supabase
        .from('tasks')
        .delete()
        .eq('parent_task_id', taskId)
        .eq('user_id', userId);

      if (subtaskError) throw subtaskError;

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
      setTasks(prev => prev.filter(task => task.id !== taskId && task.parent_task_id !== taskId));
      showSuccess('Task deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting task:', error);
      showError('Failed to delete task.');
    }
  }, [userId]);

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

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .in('id', ids)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      setTasks(prev => prev.map(task => {
        const updated = data.find(d => d.id === task.id);
        return updated ? updated : task;
      }));
      showSuccess(`${ids.length} tasks updated successfully!`);
      clearSelectedTasks();
    } catch (error: any) {
      console.error('Error bulk updating tasks:', error);
      showError('Failed to update tasks in bulk.');
    }
  }, [userId, selectedTaskIds, clearSelectedTasks]);

  const createSection = useCallback(async (name: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('task_sections')
        .insert({ name, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      setSections(prev => [...prev, data]);
      showSuccess('Section created successfully!');
    } catch (error: any) {
      console.error('Error creating section:', error);
      showError('Failed to create section.');
    }
  }, [userId]);

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
    } catch (error: any) {
      console.error('Error updating section:', error);
      showError('Failed to update section.');
    }
  }, [userId]);

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
    } catch (error: any) {
      showError('Failed to delete section.');
      console.error('Error deleting section:', error);
    }
  }, [userId]);

  const reorderTasksInSameSection = useCallback(async (sectionId: string | null, oldIndex: number, newIndex: number) => {
    setTasks(prevTasks => {
      const tasksInSection = prevTasks.filter(t => t.parent_task_id === null && t.section_id === sectionId);
      const otherTasks = prevTasks.filter(t => t.parent_task_id !== null || t.section_id !== sectionId);
      const reordered = [...tasksInSection];
      const [movedTask] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, movedTask);

      const updatedReordered = reordered.map((task, index) => ({ ...task, order: index }));

      updatedReordered.forEach(async (task) => {
        await supabase.from('tasks').update({ order: task.order }).eq('id', task.id);
      });

      return [...otherTasks, ...updatedReordered];
    });
  }, []);

  const moveTaskToNewSection = useCallback(async (taskId: string, sourceSectionId: string | null, destinationSectionId: string | null, destinationIndex: number) => {
    setTasks(prevTasks => {
      const taskToMove = prevTasks.find(t => t.id === taskId);
      if (!taskToMove) return prevTasks;

      const newTasks = prevTasks.filter(t => t.id !== taskId);
      const tasksInDestination = newTasks.filter(t => t.section_id === destinationSectionId);
      const otherTasks = newTasks.filter(t => t.section_id !== destinationSectionId);

      const updatedTaskToMove = { ...taskToMove, section_id: destinationSectionId, order: destinationIndex };
      
      const reorderedDestination = [...tasksInDestination];
      reorderedDestination.splice(destinationIndex, 0, updatedTaskToMove);

      const updatedDestinationTasks = reorderedDestination.map((task, index) => ({ ...task, order: index }));

      updatedDestinationTasks.forEach(async (task) => {
        await supabase.from('tasks').update({ section_id: task.section_id, order: task.order }).eq('id', task.id);
      });

      return [...otherTasks, ...updatedDestinationTasks];
    });
  }, []);

  const reorderSections = useCallback(async (oldIndex: number, newIndex: number) => {
    setSections(prevSections => {
      const reordered = [...prevSections];
      const [movedSection] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, movedSection);

      const updatedReordered = reordered.map((section, index) => ({ ...section, order: index }));

      updatedReordered.forEach(async (section) => {
        await supabase.from('task_sections').update({ order: section.order }).eq('id', section.id);
      });

      return updatedReordered;
    });
  }, []);

  const filteredTasks = useMemo(() => {
    let workingTasks = [...tasks];
    const effectiveCurrentDate = fnsStartOfDay(currentDate);

    // 1. Filter out subtasks (they are handled within parent tasks)
    workingTasks = workingTasks.filter(task => task.parent_task_id === null);

    // 2. Apply date and status filtering based on the current view
    if (statusFilter === 'archived') {
      // For the Archive page, show all archived tasks regardless of creation date
      workingTasks = workingTasks.filter(task => task.status === 'archived');
    } else {
      // For the main Daily Tasks page (statusFilter is 'all', 'to-do', etc.)
      workingTasks = workingTasks.filter(task => {
        const isCreatedOnCurrentDate = isSameDay(parseISO(task.created_at), effectiveCurrentDate);
        const isActiveAndNotArchived = task.status === 'to-do' || task.status === 'skipped';
        const isRecurringTemplate = task.recurring_type !== 'none' && task.original_task_id === null;

        // Rule 1: Never show recurring templates in the daily view
        if (isRecurringTemplate) {
          return false;
        }

        // Rule 2: Show tasks if they are created on the current date (this covers new tasks and new recurring instances for today)
        if (isCreatedOnCurrentDate) {
          return true;
        }

        // Rule 3: Show tasks if they are active (to-do/skipped) and were created on a *previous* date (i.e., carried over from yesterday or earlier)
        // This ensures tasks not completed on their creation day still appear.
        if (isActiveAndNotArchived && isPast(parseISO(task.created_at)) && !isSameDay(parseISO(task.created_at), effectiveCurrentDate)) {
          return true;
        }
        
        // Otherwise, don't show
        return false;
      });
    }

    // 3. Apply other filters
    if (searchFilter) {
      workingTasks = workingTasks.filter(task =>
        task.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }
    if (categoryFilter && categoryFilter !== 'all') {
      workingTasks = workingTasks.filter(task => task.category === categoryFilter);
    }
    if (priorityFilter && priorityFilter !== 'all') {
      workingTasks = workingTasks.filter(task => task.priority === priorityFilter);
    }
    if (sectionFilter && sectionFilter !== 'all') {
      workingTasks = workingTasks.filter(task => {
        if (sectionFilter === 'no-section') {
          return task.section_id === null;
        }
        return task.section_id === sectionFilter;
      });
    }

    // 4. Apply final status filter for non-archived views
    if (statusFilter !== 'all' && statusFilter !== 'archived') {
      workingTasks = workingTasks.filter(task => task.status === statusFilter);
    }

    return workingTasks;
  }, [tasks, currentDate, searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter]);

  return {
    tasks,
    filteredTasks,
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
    sectionFilter,
    setSearchFilter,
    setStatusFilter,
    setCategoryFilter,
    setPriorityFilter,
    setSectionFilter,
    selectedTaskIds,
    toggleTaskSelection,
    clearSelectedTasks,
    bulkUpdateTasks,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    sections,
    createSection,
    updateSection,
    deleteSection,
    reorderTasksInSameSection,
    moveTaskToNewSection,
    reorderSections,
  };
};