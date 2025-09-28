import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskSection, Category } from '@/hooks/useTasks'; // Import types from useTasks

export const fetchSections = async (userId: string): Promise<TaskSection[]> => {
  const { data, error } = await supabase
    .from('task_sections')
    .select('*')
    .eq('user_id', userId)
    .order('order');
  if (error) throw error;
  return data || [];
};

export const fetchCategories = async (userId: string): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('task_categories')
    .select('*')
    .eq('user_id', userId)
    .order('name');
  if (error) throw error;
  return data || [];
};

export const fetchDoTodayOffLog = async (userId: string, date: Date): Promise<Set<string>> => {
  const formattedDate = format(date, 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('do_today_off_log')
    .select('task_id')
    .eq('user_id', userId)
    .eq('off_date', formattedDate);
  if (error) throw error;
  return new Set((data || []).map(item => item.task_id));
};

const BATCH_SIZE = 1000; // Define a batch size for fetching

export const fetchTasks = async (userId: string): Promise<Omit<Task, 'category_color'>[]> => {
  let allTasks: Omit<Task, 'category_color'>[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*') // Select all columns, category_color will be added in useTasks
      .eq('user_id', userId)
      .order('created_at', { ascending: true }) // Add a default order for consistent results
      .range(offset, offset + BATCH_SIZE - 1); // Fetch in batches

    if (error) {
      console.error('fetchTasks: Supabase query error for all tasks:', error);
      throw error; // Re-throw the error to be caught by react-query
    }

    if (data && data.length > 0) {
      allTasks = allTasks.concat(data);
      offset += data.length;
      hasMore = data.length === BATCH_SIZE; // Continue if we got a full batch
    } else {
      hasMore = false; // No more data
    }
  }
  
  return allTasks;
};