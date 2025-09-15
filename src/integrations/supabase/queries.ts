import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Task, TaskSection, Category } from '@/hooks/useTasks'; // Import types from useTasks

// Query function for sections
export const fetchSections = async (userId: string) => {
  const { data, error } = await supabase
    .from('task_sections')
    .select('id, name, user_id, order, include_in_focus_mode')
    .eq('user_id', userId)
    .order('order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

// Query function for categories
export const fetchCategories = async (userId: string) => {
  const { data, error } = await supabase
    .from('task_categories')
    .select('id, name, color, user_id, created_at')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
};

// Query function for doTodayOffLog
export const fetchDoTodayOffLog = async (userId: string, date: Date) => {
  const formattedDate = format(date, 'yyyy-MM-dd');
  const { data: offLogData, error: offLogError } = await supabase
    .from('do_today_off_log')
    .select('task_id')
    .eq('user_id', userId)
    .eq('off_date', formattedDate);
  if (offLogError) {
      console.error(offLogError);
      return new Set<string>();
  }
  return new Set(offLogData?.map(item => item.task_id) || new Set());
};

// Query function for tasks
export const fetchTasks = async (userId: string): Promise<Omit<Task, 'category_color'>[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, description, status, recurring_type, created_at, updated_at, completed_at, user_id, category, priority, due_date, notes, remind_at, section_id, order, original_task_id, parent_task_id, link, image_url')
    .eq('user_id', userId)
    .order('section_id', { ascending: true, nullsFirst: true })
    .order('order', { ascending: true });
  if (error) throw error;
  return data || [];
};