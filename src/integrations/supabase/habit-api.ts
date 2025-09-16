import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  target_value: number | null;
  unit: string | null;
  frequency: string;
  start_date: string;
  is_active: boolean;
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

// --- Habit API Functions ---

export const getHabits = async (userId: string): Promise<Habit[] | null> => {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
};

export const addHabit = async (userId: string, habit: NewHabitData): Promise<Habit | null> => {
  const { data, error } = await supabase
    .from('habits')
    .insert({ ...habit, user_id: userId })
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

export const getHabitLogsForHabit = async (userId: string, habitId: string): Promise<HabitLog[] | null> => {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
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

export const upsertHabitLog = async (userId: string, log: NewHabitLogData): Promise<HabitLog | null> => {
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert({ ...log, user_id: userId }, { onConflict: 'user_id, habit_id, log_date' })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteHabitLog = async (logId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('habit_logs')
    .delete()
    .eq('id', logId);
  if (error) throw error;
  return true;
};

// --- AI Suggestion API Functions ---

export const getNewHabitSuggestion = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('suggest-new-habit', {
      body: { userId },
    });
    if (error) throw error;
    return data.suggestion;
  } catch (error) {
    console.error('Error fetching new habit suggestion:', error);
    return null;
  }
};