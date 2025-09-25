import { supabase } from './client';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { format } from 'date-fns';

export async function fetchTasks(userId: string): Promise<Omit<Task, 'category_color'>[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

export async function fetchSections(userId: string): Promise<TaskSection[]> {
  const { data, error } = await supabase
    .from('task_sections')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchCategories(userId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('task_categories')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchDoTodayOffLog(userId: string, date: Date): Promise<Set<string>> {
  const formattedDate = format(date, 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('do_today_off_log')
    .select('task_id')
    .eq('user_id', userId)
    .eq('off_date', formattedDate);

  if (error) throw error;
  return new Set((data || []).map(item => item.task_id));
}