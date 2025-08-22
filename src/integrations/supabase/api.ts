import { supabase } from './client';
import { Task, TaskSection, TaskCategory, DoTodayOffLog } from '@/types';

// --- Task API Functions ---
export const fetchTasksApi = async (userId: string, statusFilter?: Task['status'] | 'all', sectionFilter?: string | 'all', categoryFilter?: string | 'all', priorityFilter?: Task['priority'] | 'all', searchFilter?: string, dueDate?: Date | null, viewMode?: string) => {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      task_categories (
        color
      )
    `)
    .eq('user_id', userId);

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  } else if (viewMode === 'daily' || viewMode === 'focus') {
    query = query.neq('status', 'archived');
  } else if (viewMode === 'archive') {
    query = query.eq('status', 'archived');
  }

  if (sectionFilter && sectionFilter !== 'all') {
    query = query.eq('section_id', sectionFilter);
  }

  if (categoryFilter && categoryFilter !== 'all') {
    query = query.eq('category', categoryFilter);
  }

  if (priorityFilter && priorityFilter !== 'all') {
    query = query.eq('priority', priorityFilter);
  }

  if (searchFilter) {
    query = query.ilike('description', `%${searchFilter}%`);
  }

  if (dueDate) {
    const startOfDay = new Date(dueDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dueDate);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.gte('due_date', startOfDay.toISOString()).lte('due_date', endOfDay.toISOString());
  } else if (viewMode === 'daily') {
    // For daily view, only show tasks due today or without a due date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    query = query.or(`due_date.is.null,due_date.gte.${today.toISOString()},due_date.lt.${tomorrow.toISOString()}`);
  }

  const { data, error } = await query.order('order', { ascending: true }).order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  return data.map((task: any) => ({
    ...task,
    category_color: task.task_categories?.color || null,
  })) as Task[];
};

export const addTaskApi = async (userId: string, newTask: Partial<Task>): Promise<Task | null> => {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...newTask, user_id: userId })
    .select(`
      *,
      task_categories (
        color
      )
    `)
    .single();

  if (error) {
    console.error('Error adding task:', error);
    return null;
  }
  return { ...data, category_color: data.task_categories?.color || null } as Task;
};

export const updateTaskApi = async (taskId: string, updates: Partial<Task>): Promise<Task | null> => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select(`
      *,
      task_categories (
        color
      )
    `)
    .single();

  if (error) {
    console.error('Error updating task:', error);
    return null;
  }
  return { ...data, category_color: data.task_categories?.color || null } as Task;
};

export const deleteTaskApi = async (taskId: string): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

export const bulkUpdateTasksApi = async (updates: { id: string; updates: Partial<Task> }[]): Promise<void> => {
  const { error } = await supabase.rpc('bulk_update_tasks', { updates_array: updates });
  if (error) {
    console.error('Error bulk updating tasks:', error);
    throw error;
  }
};

export const updateTasksOrderApi = async (updates: { id: string; order: number | null; section_id: string | null; parent_task_id: string | null }[]): Promise<void> => {
  const { error } = await supabase.rpc('update_tasks_order', { updates: updates });
  if (error) {
    console.error('Error updating tasks order:', error);
    throw error;
  }
};

// --- Section API Functions ---
export const fetchSectionsApi = async (userId: string): Promise<TaskSection[]> => {
  const { data, error } = await supabase
    .from('task_sections')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });

  if (error) {
    console.error('Error fetching sections:', error);
    return [];
  }
  return data as TaskSection[];
};

export const createSectionApi = async (userId: string, name: string): Promise<TaskSection | null> => {
  const { data, error } = await supabase
    .from('task_sections')
    .insert({ user_id: userId, name })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating section:', error);
    return null;
  }
  return data as TaskSection;
};

export const updateSectionApi = async (sectionId: string, updates: Partial<TaskSection>): Promise<TaskSection | null> => {
  const { data, error } = await supabase
    .from('task_sections')
    .update(updates)
    .eq('id', sectionId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating section:', error);
    return null;
  }
  return data as TaskSection;
};

export const deleteSectionApi = async (sectionId: string): Promise<void> => {
  const { error } = await supabase
    .from('task_sections')
    .delete()
    .eq('id', sectionId);

  if (error) {
    console.error('Error deleting section:', error);
    throw error;
  }
};

export const reorderSectionsApi = async (updates: { id: string; order: number }[]): Promise<void> => {
  const { error } = await supabase.rpc('bulk_update_task_sections_order', { updates_array: updates });
  if (error) {
    console.error('Error reordering sections:', error);
    throw error;
  }
};

// --- Category API Functions ---
export const fetchCategoriesApi = async (userId: string): Promise<TaskCategory[]> => {
  const { data, error } = await supabase
    .from('task_categories')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data as TaskCategory[];
};

export const createCategoryApi = async (userId: string, name: string, color: string): Promise<TaskCategory | null> => {
  const { data, error } = await supabase
    .from('task_categories')
    .insert({ user_id: userId, name, color })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating category:', error);
    return null;
  }
  return data as TaskCategory;
};

export const updateCategoryApi = async (categoryId: string, updates: Partial<TaskCategory>): Promise<TaskCategory | null> => {
  const { data, error } = await supabase
    .from('task_categories')
    .update(updates)
    .eq('id', categoryId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating category:', error);
    return null;
  }
  return data as TaskCategory;
};

export const deleteCategoryApi = async (categoryId: string): Promise<void> => {
  const { error } = await supabase
    .from('task_categories')
    .delete()
    .eq('id', categoryId);

  if (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// --- Do Today Off Log API Functions ---
export const fetchDoTodayOffLogApi = async (userId: string, date: Date): Promise<DoTodayOffLog[]> => {
  const { data, error } = await supabase
    .from('do_today_off_log')
    .select('*')
    .eq('user_id', userId)
    .eq('off_date', date.toISOString().split('T')[0]);

  if (error) {
    console.error('Error fetching do today off log:', error);
    return [];
  }
  return data as DoTodayOffLog[];
};

export const addDoTodayOffLogApi = async (userId: string, taskId: string, date: Date): Promise<DoTodayOffLog | null> => {
  const { data, error } = await supabase
    .from('do_today_off_log')
    .insert({ user_id: userId, task_id: taskId, off_date: date.toISOString().split('T')[0] })
    .select('*')
    .single();

  if (error) {
    console.error('Error adding do today off log:', error);
    return null;
  }
  return data as DoTodayOffLog;
};

export const deleteDoTodayOffLogApi = async (logId: string): Promise<void> => {
  const { error } = await supabase
    .from('do_today_off_log')
    .delete()
    .eq('id', logId);

  if (error) {
    console.error('Error deleting do today off log:', error);
    throw error;
  }
};