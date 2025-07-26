import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { parseISO, isSameDay, isBefore } from 'date-fns';

interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  is_daily_recurring: boolean;
  created_at: string;
  user_id: string;
  category: string;
  priority: string;
  due_date: string | null;
  notes: string | null;
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
        setLoading(false); // If no user, stop loading and show empty state
      }
    };
    fetchUser();
  }, []);

  const fetchTasks = useCallback(async (date: Date, currentUserId: string): Promise<Task[]> => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', currentUserId)
      .not('status', 'in', '("completed", "archived", "skipped")')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

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
      if (task.is_daily_recurring && task.status === 'to-do') {
        return true;
      }
      if (!taskDueDate && isBefore(taskCreatedAt, endOfDay) && task.status === 'to-do') {
        return true;
      }
      return false;
    });

    return filteredData;
  }, []);

  const loadTasks = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fetchedTasks = await fetchTasks(currentDate, userId);
      setTasks(fetchedTasks);
    } catch (error) {
      showError("Failed to load tasks.");
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, userId, fetchTasks]);

  useEffect(() => {
    if (userId) {
      loadTasks();
    }
  }, [loadTasks, userId]);

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
      return;
    }
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...taskData, user_id: userId }])
        .select()
        .single();

      if (error) throw error;
      
      setTasks(prevTasks => [...prevTasks, data]);
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

      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? data : task
        )
      );
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
            continue; // Skip update for deleted tasks
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
    loadTasks(); // Reload tasks to reflect all changes
  }, [selectedTaskIds, updateTask, deleteTask, clearSelectedTasks, loadTasks]);

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
  };
};