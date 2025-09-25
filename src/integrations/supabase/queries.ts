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
  
  const targetTaskId = 'd3d30bab-9a6f-4385-bb87-0769b0be6a3d';

  // Attempt to fetch the specific task directly
  const { data: specificTaskData, error: specificTaskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', targetTaskId)
    .single();

  if (specificTaskError && specificTaskError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error(`fetchTasks: Error fetching specific task ${targetTaskId}:`, specificTaskError);
  } else if (specificTaskData) {
    console.log(`fetchTasks: Direct fetch of target task ${targetTaskId} SUCCEEDED!`, specificTaskData);
  } else {
    console.log(`fetchTasks: Direct fetch of target task ${targetTaskId} FAILED (not found or RLS issue).`);
  }

  // Now fetch all tasks for the user
  const { data, error } = await supabase
    .from('tasks')
    .select('*') // Select all columns, category_color will be added in useTasks
    .eq('user_id', userId);

  if (error) {
    console.error('fetchTasks: Supabase query error for all tasks:', error);
    throw error;
  }
  
  const foundTargetTaskInAll = (data || []).find(task => task.id === targetTaskId);
  if (foundTargetTaskInAll) {
    console.log(`fetchTasks: Target task ${targetTaskId} WAS found in the ALL tasks response!`, foundTargetTaskInAll);
  } else {
    console.log(`fetchTasks: Target task ${targetTaskId} was NOT found in the ALL tasks response for user ${userId}.`);
  }
  console.log('fetchTasks: Full data received from Supabase for all tasks (first 5):', (data || []).slice(0, 5));
  console.log('fetchTasks: Total tasks received:', (data || []).length);

  return data || [];
};