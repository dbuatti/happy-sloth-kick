import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  start_date: string; // YYYY-MM-DD
  target_value: number | null;
  unit: string | null;
  icon: string | null;
}

export interface HabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  log_date: string; // YYYY-MM-DD
  is_completed: boolean;
  created_at: string;
  value_recorded: number | null;
}

export type NewHabitData = Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateHabitData = Partial<NewHabitData>;

// --- Habit API Functions ---

export const getHabits = async (
  userId: string,
  filterStatus?: 'all' | 'active' | 'inactive',
  sortOption?: 'name_asc' | 'created_at_desc'
): Promise<Habit[]> => {
  let query = supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId);

  if (filterStatus === 'active') {
    query = query.eq('is_active', true);
  } else if (filterStatus === 'inactive') {
    query = query.eq('is_active', false);
  }

  switch (sortOption) {
    case 'name_asc':
      query = query.order('name', { ascending: true });
      break;
    case 'created_at_desc':
      query = query.order('created_at', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false }); // Default sort
      break;
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const addHabit = async (userId: string, newHabit: NewHabitData): Promise<Habit | null> => {
  const { data, error } = await supabase
    .from('habits')
    .insert({ ...newHabit, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateHabit = async (habitId: string, updates: UpdateHabitData): Promise<Habit | null> => {
  const { data, error } = await supabase
    .from('habits')
    .update(updates)
    .eq('id', habitId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteHabit = async (habitId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId);
  if (error) throw error;
  return true;
};

// --- Habit Log API Functions ---

export const getHabitLogs = async (userId: string, startDate: Date, endDate: Date): Promise<HabitLog[]> => {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', format(startOfDay(startDate), 'yyyy-MM-dd'))
    .lte('log_date', format(endOfDay(endDate), 'yyyy-MM-dd'))
    .order('log_date', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const getHabitLogForDay = async (userId: string, habitId: string, date: Date): Promise<HabitLog | null> => {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .eq('log_date', format(date, 'yyyy-MM-dd'))
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found
  return data || null;
};

export const getHabitLogsForHabit = async (habitId: string): Promise<HabitLog[]> => {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('habit_id', habitId)
    .order('log_date', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const upsertHabitLog = async (userId: string, log: Omit<HabitLog, 'id' | 'created_at'> & { id?: string }): Promise<HabitLog | null> => {
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert({ ...log, user_id: userId }, { onConflict: 'user_id, habit_id, log_date' })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// --- AI Suggestion API Functions ---

export const getNewHabitSuggestion = async (userId: string): Promise<string | null> => {
  const response = await fetch(`https://gdmjttmjjhadltaihpgr.supabase.co/functions/v1/suggest-new-habit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error('Error fetching new habit suggestion:', errorBody);
    throw new Error(errorBody.error || 'Failed to fetch new habit suggestion.');
  }

  const data = await response.json();
  return data.suggestion;
};

export const getHabitChallengeSuggestion = async (userId: string, habitId: string): Promise<string | null> => {
  const response = await fetch(`https://gdmjttmjjhadltaihpgr.supabase.co/functions/v1/suggest-habit-challenge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ userId, habitId }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error('Error fetching habit challenge suggestion:', errorBody);
    throw new Error(errorBody.error || 'Failed to fetch habit challenge suggestion.');
  }

  const data = await response.json();
  return data.suggestion;
};