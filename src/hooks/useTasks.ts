import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { parseISO, isSameDay, isBefore, getDay, getDate } from 'date-fns';

interface Task {
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
  section_id: string | null; // New: for task sections
}

interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
}

interface UseTasksOptions {
  initialDate?: Date;
}

export const useTasks = (options?: UseTasksOptions) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentDate, setCurrentDate] = useState<Date>(options?.initialDate || new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'priority' | 'due_date' | 'created_at'>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sections, setSections] = useState<TaskSection[]>([]); // New state for sections

  // Store timeouts for reminders
  const reminderTimeouts = new Map<string, NodeJS.Timeout>();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        showError("Failed to get user session.");
        console.error("Error fetching user:", error);
        setLoading(false);
        return;
      }
      setUserId(user?.id || null);
      if (!user) {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Request notification permission
  useEffect(() => {
    if (!("Notification" in window)) {
      console.warn("This browser does not support desktop notification");
    } else if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  const scheduleReminder = useCallback((task: Task) => {
    if (reminderTimeouts.has(task.id)) {
      clearTimeout(reminderTimeouts.get(task.id));
      reminderTimeouts.delete(task.id);
    }

    if (task.remind_at && task.status === 'to-do') {
      const reminderTime = parseISO(task.remind_at).getTime();
      const now = Date.now();
      const delay = reminderTime - now;

      if (delay > 0) {
        const timeoutId = setTimeout(() => {
          if (Notification.permission === "granted") {
            new Notification(`Task Reminder: ${task.description}`, {
              body: task.notes || 'Time to get this done!',
              icon: '/favicon.ico',
            });
            showSuccess(`Reminder for: ${task.description}`);
          } else {
            console.log(`Reminder for: ${task.description} (Notifications blocked)`);
          }
        }, delay);
        reminderTimeouts.set(task.id, timeoutId);
      }
    }
  }, []);

  const fetchSections = useCallback(async (currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('task_sections')
        .select('*')
        .eq('user_id', currentUserId)
        .order('order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error: any) {
      showError('Failed to fetch sections');
      console.error('Error fetching sections:', error);
    }
  }, []);

  const createSection = async (name: string) => {
    if (!userId) {
      showError("User not authenticated. Cannot create section.");
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('task_sections')
        .insert([{ name, user_id: userId }])
        .select()
        .single();

      if (error) throw error;
      setSections(prev => [...prev, data]);
      showSuccess('Section created successfully!');
      return data;
    } catch (error: any) {
      showError('Failed to create section.');
      console.error('Error creating section:', error);
      return null;
    }
  };

  const updateSection = async (sectionId: string, newName: string) => {
    if (!userId) {
      showError("User not authenticated. Cannot update section.");
      return null;
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
      setSections(prev => prev.map(s => s.id === sectionId ? data : s));
      showSuccess('Section updated successfully!');
      return data;
    } catch (error: any) {
      showError('Failed to update section.');
      console.error('Error updating section:', error);
      return null;
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!userId) {
      showError("User not authenticated. Cannot delete section.");
      return;
    }
    try {
      // First, update tasks associated with this section to null
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
      showSuccess('Section deleted successfully!');
    } catch (error: any) {
      showError('Failed to delete section.');
      console.error('Error deleting section:', error);
    }
  };

  const fetchTasks = useCallback(async (date: Date, currentUserId: string): Promise<Task[]> => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', currentUserId)
      .not('status', 'in', '("completed", "archived", "skipped")');

    if (sortKey === 'priority') {
      query = query.order('priority', { ascending: sortDirection === 'asc' });
      query = query.order('created_at', { ascending: true });
    } else if (sortKey === 'due_date') {
      query = query.order('due_date', { ascending: sortDirection === 'asc', nullsFirst: false });
      query = query.order('priority', { ascending: false });
    } else if (sortKey === 'created_at') {
      query = query.order('created_at', { ascending: sortDirection === 'asc' });
      query = query.order('priority', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }

    const filteredData = (data || []).filter(task => {
      const taskDueDate = task.due_date ? parseISO(task.due_date) : null;
      const taskCreatedAt = parseISO(task.created_at);

      if (taskDueDate && (isSameDay(taskDueDate, date) || isBefore(taskDueDate, startOfDay))) {
        return true;
      }
      
      if (task.recurring_type !== 'none' && task.status === 'to-do') {
        if (task.recurring_type === 'daily') {
          return true;
        }
        if (task.recurring_type === 'weekly') {
          return getDay(date) === getDay(taskCreatedAt);
        }
        if (task.recurring_type === 'monthly') {
          return getDate(date) === getDate(taskCreatedAt);
        }
      }

      if (!taskDueDate && task.recurring_type === 'none' && isBefore(taskCreatedAt, endOfDay) && task.status === 'to-do') {
        return true;
      }
      return false;
    });

    return filteredData;
  }, [sortKey, sortDirection]);

  const loadTasksAndSections = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await fetchSections(userId); // Fetch sections first
      const fetchedTasks = await fetchTasks(currentDate, userId);
      setTasks(fetchedTasks);
      fetchedTasks.forEach(scheduleReminder);
    } catch (error) {
      showError("Failed to load data.");
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, userId, fetchTasks, fetchSections, scheduleReminder]);

  useEffect(() => {
    if (userId) {
      loadTasksAndSections();
    }
  }, [loadTasksAndSections, userId]);

  useEffect(() => {
    let filtered = [...tasks];

    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.notes && task.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(task => task.category === filterCategory);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    setFilteredTasks(filtered);
  }, [tasks, searchTerm, filterStatus, filterCategory, filterPriority]);

  const handleAddTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'user_id'>) => {
    if (!userId) {
      showError("User not authenticated. Cannot add task.");
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...taskData, user_id: userId }])
        .select()
        .single();

      if (error) throw error;
      
      setTasks(prevTasks => {
        const newTasks = [...prevTasks, data];
        scheduleReminder(data);
        return newTasks;
      });
      showSuccess("Task added successfully!");
      return data;
    } catch (error: any) {
      showError("Failed to add task.");
      console.error("Error adding task:", error);
      return null;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      setTasks(prevTasks => {
        const updatedTasks = prevTasks.map(task =>
          task.id === taskId ? data : task
        );
        scheduleReminder(data);
        return updatedTasks;
      });
      showSuccess(`Task updated successfully`);
      return data;
    } catch (error: any) {
      showError("Failed to update task.");
      console.error("Error updating task:", error);
      return null;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      if (reminderTimeouts.has(taskId)) {
        clearTimeout(reminderTimeouts.get(taskId));
        reminderTimeouts.delete(taskId);
      }
      showSuccess("Task deleted successfully!");
    } catch (error: any) {
      showError("Failed to delete task.");
      console.error("Error deleting task:", error);
    }
  };

  const applyFilters = useCallback((filters: {
    search: string;
    status: string;
    category: string;
    priority: string;
  }) => {
    setSearchTerm(filters.search);
    setFilterStatus(filters.status);
    setFilterCategory(filters.category);
    setFilterPriority(filters.priority);
  }, []);

  const toggleTaskSelection = useCallback((taskId: string, checked: boolean) => {
    setSelectedTaskIds(prev =>
      checked ? [...prev, taskId] : prev.filter(id => id !== taskId)
    );
  }, []);

  const clearSelectedTasks = useCallback(() => {
    setSelectedTaskIds([]);
  }, []);

  const bulkUpdateTasks = useCallback(async (action: string) => {
    if (selectedTaskIds.length === 0) return;

    for (const taskId of selectedTaskIds) {
      try {
        let updates: Partial<Task> = {};

        switch (action) {
          case 'complete':
            updates.status = 'completed';
            break;
          case 'archive':
            updates.status = 'archived';
            break;
          case 'delete':
            await deleteTask(taskId);
            continue;
          case 'priority-low':
            updates.priority = 'low';
            break;
          case 'priority-medium':
            updates.priority = 'medium';
            break;
          case 'priority-high':
            updates.priority = 'high';
            break;
          case 'priority-urgent':
            updates.priority = 'urgent';
            break;
        }
        await updateTask(taskId, updates);
      } catch (error) {
        console.error(`Error applying ${action} to task ${taskId}:`, error);
      }
    }
    clearSelectedTasks();
    loadTasksAndSections();
  }, [selectedTaskIds, updateTask, deleteTask, clearSelectedTasks, loadTasksAndSections]);

  useEffect(() => {
    return () => {
      reminderTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      reminderTimeouts.clear();
    };
  }, [reminderTimeouts]);

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
    applyFilters,
    selectedTaskIds,
    toggleTaskSelection,
    clearSelectedTasks,
    bulkUpdateTasks,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    sections, // Expose sections
    createSection, // Expose createSection
    updateSection, // Expose updateSection
    deleteSection, // Expose deleteSection
  };
};