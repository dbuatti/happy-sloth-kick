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
  console.log(`fetchTasks: Called with userId from hook: ${userId}`);
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error('fetchTasks: Error getting session:', sessionError);
  } else if (session) {
    console.log(`fetchTasks: Supabase client session user ID: ${session.user.id}`);
  } else {
    console.log('fetchTasks: No active Supabase client session.');
  }

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
  
  const foundTargetTaskInAll = allTasks.find(task => task.id === targetTaskId);
  if (foundTargetTaskInAll) {
    console.log(`fetchTasks: Target task ${targetTaskId} WAS found in the ALL tasks response!`, foundTargetTaskInAll);
  } else {
    console.log(`fetchTasks: Target task ${targetTaskId} was NOT found in the ALL tasks response for user ${userId}.`);
  }
  console.log('fetchTasks: Total tasks received:', allTasks.length);

  return allTasks;
};