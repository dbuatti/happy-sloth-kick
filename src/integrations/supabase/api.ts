import { supabase } from './client';
import { format, startOfDay, parseISO, isValid, addDays } from 'date-fns';
import { Task, TaskSection, Category } from '@/hooks/useTasks'; // Import types from useTasks

// Query function for sections
export const fetchSections = async (userId: string): Promise<TaskSection[]> => {
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
export const fetchCategories = async (userId: string): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('task_categories')
    .select('id, name, color, user_id, created_at')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
};

// Query function for doTodayOffLog
export const fetchDoTodayOffLog = async (userId: string, date: Date): Promise<Set<string>> => {
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

// Existing functions (keeping them here)
export const parseAppointmentText = async (text: string, currentDate: Date) => {
  // ... (existing implementation)
  const API_URL = `https://gdmjttmjjhadltaihpgr.supabase.co/functions/v1/parse-appointment-text`; // Hardcoded URL
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, currentDate: format(currentDate, 'yyyy-MM-dd') }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to parse appointment text.');
    }

    return await response.json();
  } catch (error) {
    console.error('Error parsing appointment text:', error);
    return null;
  }
};

export const suggestTaskDetails = async (description: string, categories: { id: string; name: string }[], currentDate: Date) => {
  // ... (existing implementation)
  const API_URL = `https://gdmjttmjjhadltaihpgr.supabase.co/functions/v1/suggest-task-details`; // Hardcoded URL
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description, categories, currentDate: format(currentDate, 'yyyy-MM-dd') }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get task suggestions.');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting task suggestions:', error);
    return null;
  }
};

export const getDailyBriefing = async (userId: string, date: Date) => {
  // ... (existing implementation)
  const API_URL = `https://gdmjttmjjhadltaihpgr.supabase.co/functions/v1/daily-briefing`; // Hardcoded URL
  const localDayStart = startOfDay(date);
  const localDayEnd = addDays(localDayStart, 1); // End of day is start of next day for range
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        localDayStartISO: localDayStart.toISOString(),
        localDayEndISO: localDayEnd.toISOString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get daily briefing.');
    }

    const data = await response.json();
    return data.briefing;
  } catch (error) {
    console.error('Error fetching daily briefing:', error);
    return null;
  }
};