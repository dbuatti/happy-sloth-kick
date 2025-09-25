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

export const fetchTasks = async (userId: string): Promise<Omit<Task, 'category_color'>[]> => {
  console.log(`fetchTasks: Querying for user_id: ${userId}`);
  const { data, error } = await supabase
    .from('tasks')
    .select('*') // Select all columns, category_color will be added in useTasks
    .eq('user_id', userId);

  if (error) {
    console.error('fetchTasks: Supabase query error:', error);
    throw error;
  }
  
  const targetTaskId = 'd3d30bab-9a6f-4385-bb87-0769b0be6a3d';
  const foundTargetTask = (data || []).find(task => task.id === targetTaskId);
  if (foundTargetTask) {
    console.log(`fetchTasks: Target task ${targetTaskId} WAS found in Supabase response!`, foundTargetTask);
  } else {
    console.log(`fetchTasks: Target task ${targetTaskId} was NOT found in Supabase response for user ${userId}.`);
  }
  console.log('fetchTasks: Full data received from Supabase:', data);

  return data || [];
};