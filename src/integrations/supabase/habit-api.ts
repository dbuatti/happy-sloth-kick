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
  icon: string | null; // Added icon property
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

export async function getHabits(userId: string): Promise<Habit[] | null> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addHabit(userId: string, newHabit: NewHabitData): Promise<Habit | null> {
  const { data, error } = await supabase
    .from('habits')
    .insert({ ...newHabit, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateHabit(habitId: string, updates: UpdateHabitData): Promise<Habit | null> {
  const { data, error } = await supabase
    .from('habits')
    .update(updates)
    .eq('id', habitId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteHabit(habitId: string): Promise<boolean> {
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId);
  if (error) throw error;
  return true;
}

export async function getHabitLogs(userId: string, startDate: Date, endDate: Date): Promise<HabitLog[] | null> {
  const formattedStartDate = format(startOfDay(startDate), 'yyyy-MM-dd');
  const formattedEndDate = format(endOfDay(endDate), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', formattedStartDate)
    .lte('log_date', formattedEndDate)
    .order('log_date', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getHabitLogForDay(userId: string, habitId: string, date: Date): Promise<HabitLog | null> {
  const formattedDate = format(date, 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .eq('log_date', formattedDate); // Removed .single()
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null; // Return first element or null
}

export async function upsertHabitLog(userId: string, log: Omit<HabitLog, 'id' | 'created_at'>): Promise<HabitLog | null> {
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert({ ...log, user_id: userId }, { onConflict: 'user_id, habit_id, log_date' })
    .select(); // Removed .single()
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null; // Return first element or null
}

export async function getHabitLogsForHabit(userId: string, habitId: string): Promise<HabitLog[] | null> {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .order('log_date', { ascending: true });
  if (error) throw error;
  return data;
}