import { supabase } from './client';
import { Task, TaskSection, TaskCategory, DoTodayOffLog, Appointment } from '@/types/task'; // Corrected import

// --- Task related API calls ---
export const fetchTasks = async (userId: string, viewMode: 'all' | 'focus' | 'archive' | 'today', currentDate: Date | null = null): Promise<Task[]> => {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      task_categories (
        color
      )
    `)
    .eq('user_id', userId);

  if (viewMode === 'archive') {
    query = query.eq('status', 'archived');
  } else {
    query = query.neq('status', 'archived');
  }

  if (viewMode === 'today' && currentDate) {
    const todayStart = currentDate.toISOString().split('T')[0];
    query = query.or(`due_date.eq.${todayStart},due_date.is.null`);
  }

  const { data, error } = await query.order('order', { ascending: true }).order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  return data.map((task: any) => ({
    ...task,
    category_color: task.task_categories?.color || null,
  }));
};

export const addTask = async (taskData: Partial<Task>): Promise<Task | null> => {
  const { data, error } = await supabase.from('tasks').insert(taskData).select().single();
  if (error) {
    console.error('Error adding task:', error);
    return null;
  }
  return data;
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task | null> => {
  const { data, error } = await supabase.from('tasks').update(updates).eq('id', taskId).select().single();
  if (error) {
    console.error('Error updating task:', error);
    return null;
  }
  return data;
};

export const deleteTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

export const bulkUpdateTasks = async (taskIds: string[], updates: Partial<Task>): Promise<void> => {
  const { error } = await supabase.from('tasks').update(updates).in('id', taskIds);
  if (error) {
    console.error('Error bulk updating tasks:', error);
    throw error;
  }
};

export const reorderTasks = async (updates: { id: string; order: number | null; section_id: string | null; parent_task_id: string | null; }[]): Promise<void> => {
  const { error } = await supabase.rpc('update_tasks_order', { updates });
  if (error) {
    console.error('Error reordering tasks:', error);
    throw error;
  }
};

// --- Section related API calls ---
export const fetchSections = async (userId: string): Promise<TaskSection[]> => {
  const { data, error } = await supabase
    .from('task_sections')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });
  if (error) {
    console.error('Error fetching sections:', error);
    return [];
  }
  return data;
};

export const createSection = async (userId: string, name: string): Promise<TaskSection | null> => {
  const { data, error } = await supabase.from('task_sections').insert({ user_id: userId, name }).select().single();
  if (error) {
    console.error('Error creating section:', error);
    return null;
  }
  return data;
};

export const updateSection = async (sectionId: string, updates: Partial<TaskSection>): Promise<TaskSection | null> => {
  const { data, error } = await supabase.from('task_sections').update(updates).eq('id', sectionId).select().single();
  if (error) {
    console.error('Error updating section:', error);
    return null;
  }
  return data;
};

export const deleteSection = async (sectionId: string): Promise<void> => {
  const { error } = await supabase.from('task_sections').delete().eq('id', sectionId);
  if (error) {
    console.error('Error deleting section:', error);
    throw error;
  }
};

// --- Category related API calls ---
export const fetchCategories = async (userId: string): Promise<TaskCategory[]> => {
  const { data, error } = await supabase
    .from('task_categories')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data;
};

export const createCategory = async (userId: string, name: string, color: string): Promise<TaskCategory | null> => {
  const { data, error } = await supabase.from('task_categories').insert({ user_id: userId, name, color }).select().single();
  if (error) {
    console.error('Error creating category:', error);
    return null;
  }
  return data;
};

export const updateCategory = async (categoryId: string, updates: Partial<TaskCategory>): Promise<TaskCategory | null> => {
  const { data, error } = await supabase.from('task_categories').update(updates).eq('id', categoryId).select().single();
  if (error) {
    console.error('Error updating category:', error);
    return null;
  }
  return data;
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  const { error } = await supabase.from('task_categories').delete().eq('id', categoryId);
  if (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// --- Do Today Off Log API calls ---
export const fetchDoTodayOffLog = async (userId: string, date: Date): Promise<DoTodayOffLog[]> => {
  const { data, error } = await supabase
    .from('do_today_off_log')
    .select('*')
    .eq('user_id', userId)
    .eq('off_date', date.toISOString().split('T')[0]);
  if (error) {
    console.error('Error fetching do today off log:', error);
    return [];
  }
  return data;
};

export const addDoTodayOffLog = async (userId: string, taskId: string, date: Date): Promise<void> => {
  const { error } = await supabase.from('do_today_off_log').insert({ user_id: userId, task_id: taskId, off_date: date.toISOString().split('T')[0] });
  if (error) {
    console.error('Error adding do today off log:', error);
    throw error;
  }
};

export const deleteDoTodayOffLog = async (userId: string, taskId: string, date: Date): Promise<void> => {
  const { error } = await supabase.from('do_today_off_log').delete().eq('user_id', userId).eq('task_id', taskId).eq('off_date', date.toISOString().split('T')[0]);
  if (error) {
    console.error('Error deleting do today off log:', error);
    throw error;
  }
};

// --- Daily Briefing API calls ---
export const getDailyBriefing = async (userId: string) => {
  // This is a placeholder. Implement actual daily briefing logic here.
  // For example, fetch tasks, appointments, journal entries for the day.
  console.log(`Fetching daily briefing for user: ${userId}`);
  return {
    tasksDueToday: 5,
    appointmentsToday: 2,
    focusTasks: 1,
  };
};

// --- AI Suggestion API calls ---
export const suggestTaskDetails = async (taskDescription: string) => {
  // This is a placeholder. Implement actual AI suggestion logic here.
  console.log(`Suggesting details for: ${taskDescription}`);
  return {
    suggestedCategory: 'Work',
    suggestedPriority: 'medium',
    suggestedDueDate: null,
    suggestedNotes: 'AI suggested notes.',
  };
};

// --- Appointment related API calls ---
export const addAppointment = async (appointmentData: Partial<Appointment>): Promise<Appointment | null> => {
  const { data, error } = await supabase.from('schedule_appointments').insert(appointmentData).select().single();
  if (error) {
    console.error('Error adding appointment:', error);
    return null;
  }
  return data;
};

export const updateAppointment = async (appointmentId: string, updates: Partial<Appointment>): Promise<Appointment | null> => {
  const { data, error } = await supabase.from('schedule_appointments').update(updates).eq('id', appointmentId).select().single();
  if (error) {
    console.error('Error updating appointment:', error);
    return null;
  }
  return data;
};

export const deleteAppointment = async (appointmentId: string): Promise<void> => {
  const { error } = await supabase.from('schedule_appointments').delete().eq('id', appointmentId);
  if (error) {
    console.error('Error deleting appointment:', error);
    throw error;
  }
};