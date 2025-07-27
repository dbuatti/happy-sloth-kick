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
  status?: 'to-do' | 'completed' | 'skipped' | 'archiverd';
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
  const [currentDate, setCurrentDate] = useState(fnsStartOfDay(new Date()));
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
    if (!userId) {
      return;
    }
    const { data, error } = await supabase
      .from('task_sections')
      .select('*')
      .eq('user_id', userId)
      .order('order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching sections:', error);
      showError('Failed to load sections.');
    } else {
      setSections(data || []);
    }
  }, [userId]);

  const fetchTasks = useCallback(async (dateToFetch: Date) => { // Added dateToFetch parameter
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    try {
      const { data: fetchedTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      let allUserTasks: Task[] = fetchedTasks || [];
      const fetchedTasksForCheck = [...allUserTasks]; // Create a copy for the check

      const dailyRecurringTemplates = allUserTasks.filter(
        task => task.recurring_type === 'daily' && task.original_task_id === null
      );
      console.log('useTasks LOG 2: Daily recurring templates found:', dailyRecurringTemplates);

      const newRecurringInstances: Task[] = [];
      const currentDayFormatted = format(dateToFetch, 'yyyy-MM-dd'); 

      for (const template of dailyRecurringTemplates) {
        // Check if *any* instance (regardless of status) exists for the current date
        // An instance is identified by its original_task_id pointing to the template's ID
        const instanceExistsForToday = fetchedTasksForCheck.some(task =>
          task.original_task_id === template.id && 
          isSameDay(parseISO(task.created_at), dateToFetch)
        );
        console.log(`useTasks LOG 3: Template "${template.description}" (ID: ${template.id}): Instance exists for today (${currentDayFormatted})? ${instanceExistsForToday}`);

        if (!instanceExistsForToday) {
          // If no instance exists for today, create a new 'to-do' instance
          const newInstance: Task = {
            ...template,
            id: uuidv4(),
            created_at: fnsStartOfDay(dateToFetch).toISOString(), // Use dateToFetch
            status: 'to-do', // New instances are always 'to-do'
            recurring_type: 'none', // Instances are not recurring themselves
            original_task_id: template.id, // Link back to the template
            due_date: null, // Due date and remind_at should be specific to the instance, not inherited from template
            remind_at: null,
            parent_task_id: null, // Instances are top-level tasks unless explicitly made subtasks
          };
          newRecurringInstances.push(newInstance);
          console.log('useTasks LOG 4: Generated new recurring instance:', newInstance);
        }
      }

      if (newRecurringInstances.length > 0) {
        console.log('useTasks LOG 5: Attempting to insert new recurring instances:', newRecurringInstances);
        const { data: insertedData, error: insertError } = await supabase
          .from('tasks')
          .insert(newRecurringInstances)
          .select();

        if (insertError) {
          console.error('useTasks ERROR: Error inserting recurring instance:', insertError);
          showError('Failed to generate a recurring task instance.');
        } else if (insertedData) {
          allUserTasks.push(...insertedData);
          console.log('useTasks LOG 6: Successfully inserted new recurring instances:', insertedData);
        }
      }
      
      setTasks(allUserTasks);
      console.log('useTasks LOG 7: Final tasks state after fetch and generation:', allUserTasks);
    } catch (error: any) {
      console.error('useTasks ERROR: Error fetching or generating tasks:', error);
      showError('An unexpected error occurred while loading tasks.');
    } finally {
      setLoading(false);
    }
  }, [userId]); // Dependency only on userId now

  useEffect(() => {
    fetchSections();
    fetchTasks(currentDate); // Pass currentDate explicitly
  }, [fetchSections, fetchTasks, currentDate]); // currentDate is now a dependency for useEffect

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
        .insert({ ...newTaskData, user_id: userId })
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
  }, [userId]);

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
      // Delete sub-tasks first
      const { error: subtaskError } = await supabase
        .from('tasks')
        .delete()
        .eq('parent_task_id', taskId)
        .eq('user_id', userId);

      if (subtaskError) throw subtaskError;

      // Then delete the main task
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
      // First, set tasks in this section to null section_id
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
      const tasksInSection = prevTasks.filter(t => t.section_id === sectionId);
      const otherTasks = prevTasks.filter(t => t.section_id !== sectionId);
      const reordered = [...tasksInSection];
      const [movedTask] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, movedTask);

      // Update order property for reordered tasks
      const updatedReordered = reordered.map((task, index) => ({ ...task, order: index }));

      // Persist order to DB
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

      // Update order property for tasks in the destination section
      const updatedDestinationTasks = reorderedDestination.map((task, index) => ({ ...task, order: index }));

      // Persist changes to DB
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

      // Update order property for reordered sections
      const updatedReordered = reordered.map((section, index) => ({ ...section, order: index }));

      // Persist order to DB
      updatedReordered.forEach(async (section) => {
        await supabase.from('task_sections').update({ order: section.order }).eq('id', section.id);
      });

      return updatedReordered;
    });
  }, []);

  const filteredTasks = useMemo(() => {
    let workingTasks = [...tasks];

    // 1. Filter out archived tasks (always, unless on the archive page)
    if (statusFilter !== 'archived') {
      workingTasks = workingTasks.filter(task => task.status !== 'archived');
    }

    // 2. Filter tasks to show only those relevant to the currentDate
    workingTasks = workingTasks.filter(task => {
      // Exclude recurring templates from the daily view
      if (task.recurring_type !== 'none' && task.original_task_id === null) {
        return false; // Templates should never be displayed directly
      }
      
      // For all other tasks (non-recurring or recurring instances),
      // only show if their 'created_at' date matches the 'currentDate'.
      return isSameDay(parseISO(task.created_at), currentDate);
    });

    // 3. Filter out subtasks (they are displayed within parent tasks)
    workingTasks = workingTasks.filter(task => task.parent_task_id === null);

    // 4. Apply status filter (if not 'all')
    if (statusFilter !== 'all') {
      workingTasks = workingTasks.filter(task => task.status === statusFilter);
    }

    // 5. Apply search filter
    if (searchFilter) {
      workingTasks = workingTasks.filter(task =>
        task.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.notes?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }
    // 6. Apply category filter
    if (categoryFilter && categoryFilter !== 'all') {
      workingTasks = workingTasks.filter(task => task.category === categoryFilter);
    }
    // 7. Apply priority filter
    if (priorityFilter && priorityFilter !== 'all') {
      workingTasks = workingTasks.filter(task => task.priority === priorityFilter);
    }
    // 8. Apply section filter
    if (sectionFilter && sectionFilter !== 'all') {
      workingTasks = workingTasks.filter(task => {
        if (sectionFilter === 'no-section') {
          return task.section_id === null;
        }
        return task.section_id === sectionFilter;
      });
    }

    // 9. Apply sorting
    if (sortKey === 'order') {
      workingTasks.sort((a, b) => {
        const orderA = a.order === null ? Infinity : a.order;
        const orderB = b.order === null ? Infinity : b.order;
        return sortDirection === 'asc' ? orderA - orderB : orderB - orderA;
      });
    } else if (sortKey === 'priority') {
      const priorityOrder: { [key: string]: number } = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1, 'none': 0 };
      workingTasks.sort((a, b) => {
        const valA = priorityOrder[a.priority] || 0;
        const valB = priorityOrder[b.priority] || 0;
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
    } else if (sortKey === 'due_date') {
      workingTasks.sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else if (sortKey === 'created_at') {
      workingTasks.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }
    return workingTasks;
  }, [tasks, currentDate, searchFilter, statusFilter, categoryFilter, priorityFilter, sectionFilter, sortKey, sortDirection]);

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