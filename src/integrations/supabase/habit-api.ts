import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  target_value: number | null;
  unit: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  start_date: string; // YYYY-MM-DD
  is_active: boolean; // New: Indicates if the habit is currently active
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  log_date: string; // YYYY-MM-DD
  is_completed: boolean;
  value_recorded: number | null;
  created_at: string;
}

export type NewHabitData = Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateHabitData = Partial<NewHabitData>;
export type NewHabitLogData = Omit<HabitLog, 'id' | 'user_id' | 'created_at'>;
export type UpdateHabitLogData = Partial<NewHabitLogData>;

// --- Habit Functions ---

export const getHabits = async (userId: string): Promise<Habit[] | null> => {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
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

// --- Habit Log Functions ---

export const getHabitLogs = async (userId: string, startDate: Date, endDate: Date): Promise<HabitLog[] | null> => {
  const formattedStartDate = format(startDate, 'yyyy-MM-dd');
  const formattedEndDate = format(endDate, 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', formattedStartDate)
    .lte('log_date', formattedEndDate)
    .order('log_date', { ascending: true });
  if (error) throw error;
  return data;
};

export const getHabitLogForDay = async (userId: string, habitId: string, date: Date): Promise<HabitLog | null> => {
  const formattedDate = format(date, 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .eq('log_date', formattedDate)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found
  return data;
};

export const upsertHabitLog = async (userId: string, logData: NewHabitLogData | UpdateHabitLogData): Promise<HabitLog | null> => {
  const payload = { ...logData, user_id: userId };
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert(payload, { onConflict: 'user_id, habit_id, log_date' })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getHabitLogsForHabit = async (habitId: string): Promise<HabitLog[] | null> => {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('habit_id', habitId)
    .order('log_date', { ascending: true });
  if (error) throw error;
  return data;
};

// --- AI Suggestion Function ---
export const getNewHabitSuggestion = async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase.functions.invoke('suggest-new-habit', {
    body: { userId },
  });

  if (error) {
    console.error('Error fetching new habit suggestion:', error);
    throw error;
  }
  return data.suggestion;
};