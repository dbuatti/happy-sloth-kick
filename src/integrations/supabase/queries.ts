import { supabase } from './client';
import { format } from 'date-fns';

export const fetchTasks = async (userId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
};

export const fetchSections = async (userId: string) => {
  const { data, error } = await supabase
    .from('task_sections')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });
  if (error) throw error;
  return data;
};

export const fetchCategories = async (userId: string) => {
  const { data, error } = await supabase
    .from('task_categories')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
};

export const fetchDoTodayOffLog = async (userId: string, date: Date) => {
  const formattedDate = format(date, 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('do_today_off_log')
    .select('task_id')
    .eq('user_id', userId)
    .eq('off_date', formattedDate);
  if (error) throw error;
  return new Set(data.map(item => item.task_id));
};

export const fetchRecurringTaskCompletionLog = async (userId: string, date: Date) => {
  const formattedDate = format(date, 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('recurring_task_completion_log')
    .select('original_task_id')
    .eq('user_id', userId)
    .eq('completion_date', formattedDate);
  if (error) throw error;
  return new Set(data.map(item => item.original_task_id));
};