import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isSameDay, startOfDay, addDays, isBefore } from 'date-fns';
import { HabitLog } from '@/integrations/supabase/habit-api'; // Import HabitLog

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
  reminder_time: string | null; // HH:MM:SS
  reminder_enabled: boolean;
  micro_steps: string[] | null;
  type: 'checkmark' | 'value';
  duration: number | null; // in minutes
  archived: boolean;
  goal_type: 'daily' | 'weekly' | 'monthly';
  goal_value: number;
  reminders: string[] | null; // Array of HH:MM strings
}

export interface HabitWithLogs extends Habit {
  logs: HabitLog[];
  currentStreak: number;
  longestStreak: number;
  completedToday: boolean;
  currentDayRecordedValue: number | null;
}

export type NewHabitData = Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateHabitData = Partial<NewHabitData>;

interface UseHabitsProps {
  currentDate: Date;
  userId?: string;
}

export const useHabits = ({ currentDate, userId: propUserId }: UseHabitsProps) => {
  const { user } = useAuth();
  const userId = propUserId || user?.id;
  const queryClient = useQueryClient();

  const formattedCurrentDate = format(currentDate, 'yyyy-MM-dd');

  const { data: habits = [], isLoading: loading, error } = useQuery<Habit[], Error>({
    queryKey: ['habits', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('archived', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: habitLogs = [], isLoading: logsLoading, error: logsError } = useQuery<HabitLog[], Error>({
    queryKey: ['habitLogs', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('log_date', { ascending: false }); // Fetch all logs for streak calculation

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });

  useEffect(() => {
    if (error || logsError) {
      console.error('Error fetching habits or logs:', error?.message || logsError?.message);
      showError('Failed to load habits.');
    }
  }, [error, logsError]);

  const habitsWithLogs = useMemo(() => {
    if (loading || logsLoading) return [];

    return habits.map(habit => {
      const logsForHabit = habitLogs.filter(log => log.habit_id === habit.id);

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      const today = startOfDay(currentDate);
      let checkDate = startOfDay(currentDate);

      // Calculate streak backwards from today
      for (let i = 0; i < 365 * 2; i++) { // Check up to 2 years back
        const formattedCheckDate = format(checkDate, 'yyyy-MM-dd');
        const logForDay = logsForHabit.find(log => log.log_date === formattedCheckDate && log.is_completed);
        const habitStarted = isBefore(startOfDay(parseISO(habit.start_date)), addDays(checkDate, 1));

        if (!habitStarted) {
          break; // Stop if before habit start date
        }

        if (logForDay) {
          tempStreak++;
        } else {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
          if (isSameDay(checkDate, today)) {
            currentStreak = tempStreak; // If today is not completed, current streak ends here
          }
          tempStreak = 0;
        }

        checkDate = addDays(checkDate, -1);
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      if (currentStreak === 0 && tempStreak > 0) { // If loop finished and tempStreak is active
        currentStreak = tempStreak;
      }

      const completedToday = logsForHabit.some(log => log.log_date === formattedCurrentDate && log.is_completed);
      const currentDayLog = logsForHabit.find(log => log.log_date === formattedCurrentDate);
      const currentDayRecordedValue = currentDayLog?.value_recorded ?? null;

      return {
        ...habit,
        logs: logsForHabit,
        currentStreak,
        longestStreak,
        completedToday,
        currentDayRecordedValue,
      };
    });
  }, [habits, habitLogs, loading, logsLoading, currentDate, formattedCurrentDate]);

  const addHabitMutation = useMutation<Habit, Error, NewHabitData>({
    mutationFn: async (newHabit) => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('habits')
        .insert({ ...newHabit, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Habit added successfully!');
      queryClient.invalidateQueries({ queryKey: ['habits', userId] });
    },
    onError: (err) => {
      console.error('useHabits: Error adding habit:', err.message);
      showError('Failed to add habit.');
    },
  });

  const updateHabitMutation = useMutation<Habit, Error, { id: string; updates: UpdateHabitData }>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('habits')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Habit updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['habits', userId] });
      queryClient.invalidateQueries({ queryKey: ['habitLogs', userId] }); // Invalidate logs as well, in case start_date changed
    },
    onError: (err) => {
      console.error('useHabits: Error updating habit:', err.message);
      showError('Failed to update habit.');
    },
  });

  const deleteHabitMutation = useMutation<boolean, Error, string>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      showSuccess('Habit deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['habits', userId] });
      queryClient.invalidateQueries({ queryKey: ['habitLogs', userId] });
    },
    onError: (err) => {
      console.error('useHabits: Error deleting habit:', err.message);
      showError('Failed to delete habit.');
    },
  });

  const toggleHabitCompletionMutation = useMutation<boolean, Error, { habitId: string; date: Date; isCompleted: boolean; valueRecorded?: number | null }>({
    mutationFn: async ({ habitId, date, isCompleted, valueRecorded }) => {
      if (!userId) throw new Error('User not authenticated.');
      const logDate = format(date, 'yyyy-MM-dd');

      if (isCompleted) {
        const { error } = await supabase
          .from('habit_logs')
          .upsert({
            user_id: userId,
            habit_id: habitId,
            log_date: logDate,
            is_completed: true,
            value_recorded: valueRecorded,
          }, { onConflict: 'user_id, habit_id, log_date' });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('habit_logs')
          .delete()
          .eq('user_id', userId)
          .eq('habit_id', habitId)
          .eq('log_date', logDate);
        if (error) throw error;
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitLogs', userId] });
      queryClient.invalidateQueries({ queryKey: ['habits', userId] }); // Re-calculate streaks
    },
    onError: (err) => {
      console.error('useHabits: Error toggling habit completion:', err.message);
      showError('Failed to update habit completion.');
    },
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!userId) return;

    const habitsChannel = supabase
      .channel('habits-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['habits', userId] });
        }
      )
      .subscribe();

    const logsChannel = supabase
      .channel('habit_logs-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'habit_logs', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['habitLogs', userId] });
          queryClient.invalidateQueries({ queryKey: ['habits', userId] }); // Re-calculate streaks
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(habitsChannel);
      supabase.removeChannel(logsChannel);
    };
  }, [userId, queryClient]);

  return {
    habits: habitsWithLogs,
    loading: loading || logsLoading,
    addHabit: addHabitMutation.mutateAsync,
    updateHabit: updateHabitMutation.mutateAsync,
    deleteHabit: deleteHabitMutation.mutateAsync,
    toggleHabitCompletion: toggleHabitCompletionMutation.mutateAsync,
  };
};