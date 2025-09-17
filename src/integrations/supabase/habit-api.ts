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
  icon: string | null; // New: Lucide icon name
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

// --- Habit Log API Functions ---

export const getHabitLogs = async (userId: string, startDate: Date, endDate: Date): Promise<HabitLog[] | null> => {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', format(startOfDay(startDate), 'yyyy-MM-dd'))
    .lte('log_date', format(endOfDay(endDate), 'yyyy-MM-dd'))
    .order('log_date', { ascending: true });
  if (error) throw error;
  return data;
};

export const getHabitLogForDay = async (userId: string, habitId: string, date: Date): Promise<HabitLog | null> => {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .eq('log_date', format(date, 'yyyy-MM-dd'))
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const upsertHabitLog = async (userId: string, logData: Omit<HabitLog, 'id' | 'created_at'>): Promise<HabitLog | null> => {
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert({ ...logData, user_id: userId }, { onConflict: 'user_id, habit_id, log_date' })
    .select()
    .single();
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