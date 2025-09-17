import { useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Habit,
  HabitLog,
  NewHabitData,
  UpdateHabitData,
  getHabits,
  addHabit,
  updateHabit,
  deleteHabit,
  getHabitLogs,
  getHabitLogForDay,
  upsertHabitLog,
  getHabitLogsForHabit,
} from '@/integrations/supabase/habit-api';
import { format, differenceInDays, parseISO, isSameDay, startOfDay, endOfDay, isValid, addDays, isBefore, isAfter } from 'date-fns';
import { useAuth } from '@/context/AuthContext';

export interface HabitWithLogs extends Habit {
  logs: HabitLog[];
  currentStreak: number;
  longestStreak: number;
  completedToday: boolean;
}

interface UseHabitsProps {
  userId?: string;
  currentDate?: Date; // For daily view context
  startDate?: Date; // For range-based log fetching
  endDate?: Date;   // For range-based log fetching
}

export const useHabits = ({ userId: propUserId, currentDate, startDate, endDate }: UseHabitsProps = {}) => {
  const { user } = useAuth();
  const userId = propUserId || user?.id;
  const queryClient = useQueryClient();

  const formattedStartDate = startDate ? format(startDate, 'yyyy-MM-dd') : undefined;
  const formattedEndDate = endDate ? format(endDate, 'yyyy-MM-dd') : undefined;

  // Fetch all habits
  const { data: rawHabits = [], isLoading: habitsLoading, error: habitsError } = useQuery<Habit[], Error>({
    queryKey: ['habits', userId],
    queryFn: async () => {
      const data = await getHabits(userId!);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch habit logs for a specific date range (or all if no range specified)
  const { data: rawHabitLogs = [], isLoading: logsLoading, error: logsError } = useQuery<HabitLog[], Error>({
    queryKey: ['habitLogs', userId, formattedStartDate, formattedEndDate],
    queryFn: async () => {
      const data = await getHabitLogs(userId!, startDate || startOfDay(new Date(0)), endDate || endOfDay(new Date())); // Fetch all if no range
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds for logs
  });

  useEffect(() => {
    if (habitsError || logsError) {
      console.error('Error fetching habits or logs:', habitsError || logsError);
      showError('Failed to load habit data.');
    }
  }, [habitsError, logsError]);

  // Process habits with their logs to calculate streaks and completion status
  const habits = useMemo(() => {
    if (!rawHabits.length) return [];

    const logsByHabitId = new Map<string, HabitLog[]>();
    (rawHabitLogs || []).forEach((log: HabitLog) => {
      if (!logsByHabitId.has(log.habit_id)) {
        logsByHabitId.set(log.habit_id, []);
      }
      logsByHabitId.get(log.habit_id)!.push(log);
    });

    return (rawHabits || []).map((habit: Habit) => {
      const habitLogs = logsByHabitId.get(habit.id) || [];
      const sortedLogs = [...habitLogs].sort((a, b) => parseISO(a.log_date).getTime() - parseISO(b.log_date).getTime());

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let lastLogDate: Date | null = null;

      sortedLogs.forEach(log => {
        const logDate = parseISO(log.log_date);
        if (!isValid(logDate)) return;

        if (log.is_completed) {
          if (lastLogDate === null || differenceInDays(logDate, lastLogDate) === 1) {
            tempStreak++;
          } else if (differenceInDays(logDate, lastLogDate) > 1) {
            tempStreak = 1; // Reset if there's a gap
          }
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 0;
        }
        lastLogDate = logDate;
      });
      longestStreak = Math.max(longestStreak, tempStreak); // Final check for longest streak

      // Calculate current streak based on today's date
      currentStreak = 0;
      if (currentDate) {
        let checkDate = startOfDay(currentDate);
        while (true) {
          const logForDate = sortedLogs.find(log => isSameDay(parseISO(log.log_date), checkDate));
          if (logForDate && logForDate.is_completed) {
            currentStreak++;
            checkDate = addDays(checkDate, -1);
          } else if (logForDate && !logForDate.is_completed) {
            break; // Streak broken
          } else if (isBefore(checkDate, parseISO(habit.start_date))) {
            break; // Before habit start date
          } else {
            // No log for this date, check if it's a future date or a missed day
            if (isAfter(checkDate, startOfDay(new Date()))) {
              // Future date, streak continues up to today
            } else {
              break; // Missed day, streak broken
            }
            checkDate = addDays(checkDate, -1);
          }
        }
      }

      const completedToday = currentDate
        ? sortedLogs.some(log => isSameDay(parseISO(log.log_date), currentDate) && log.is_completed)
        : false;

      return {
        ...habit,
        logs: sortedLogs,
        currentStreak,
        longestStreak,
        completedToday,
      };
    });
  }, [rawHabits, rawHabitLogs, currentDate]);

  const loading = habitsLoading || logsLoading;

  // --- Mutations ---

  const addHabitMutation = useMutation<Habit | null, Error, NewHabitData>({
    mutationFn: (newHabit) => addHabit(userId!, newHabit),
    onSuccess: () => {
      showSuccess('Habit added successfully!');
      queryClient.invalidateQueries({ queryKey: ['habits', userId] });
      queryClient.invalidateQueries({ queryKey: ['habitLogs', userId] });
    },
    onError: (err) => {
      console.error('Error adding habit:', err.message);
      showError('Failed to add habit.');
    },
  });

  const updateHabitMutation = useMutation<Habit | null, Error, { habitId: string; updates: UpdateHabitData }>({
    mutationFn: ({ habitId, updates }) => updateHabit(habitId, updates),
    onSuccess: () => {
      showSuccess('Habit updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['habits', userId] });
      queryClient.invalidateQueries({ queryKey: ['habitLogs', userId] });
    },
    onError: (err) => {
      console.error('Error updating habit:', err.message);
      showError('Failed to update habit.');
    },
  });

  const deleteHabitMutation = useMutation<boolean, Error, string>({
    mutationFn: (habitId) => deleteHabit(habitId),
    onSuccess: () => {
      showSuccess('Habit deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['habits', userId] });
      queryClient.invalidateQueries({ queryKey: ['habitLogs', userId] });
    },
    onError: (err) => {
      showError('Failed to delete habit.');
      console.error(err);
    },
  });

  const toggleHabitCompletion = useCallback(async (habitId: string, date: Date, isCompleted: boolean, valueRecorded: number | null = null) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    const formattedDate = format(date, 'yyyy-MM-dd');
    try {
      const existingLog = await getHabitLogForDay(userId, habitId, date);

      if (existingLog) {
        if (existingLog.is_completed === isCompleted) {
          // No change needed, or already in desired state
          return true;
        }
        // Update existing log
        await upsertHabitLog(userId, {
          ...existingLog,
          is_completed: isCompleted,
          value_recorded: valueRecorded,
        });
      } else {
        // Create new log
        await upsertHabitLog(userId, {
          habit_id: habitId,
          log_date: formattedDate,
          is_completed: isCompleted,
          value_recorded: valueRecorded,
          user_id: userId, // Ensure user_id is passed for new logs
        });
      }
      queryClient.invalidateQueries({ queryKey: ['habitLogs', userId] });
      showSuccess(isCompleted ? 'Habit marked complete!' : 'Habit marked incomplete.');
      return true;
    } catch (err: any) {
      console.error('Error toggling habit completion:', err.message);
      showError('Failed to update habit completion.');
      return false;
    }
  }, [userId, queryClient]);

  // Real-time subscriptions
  useEffect(() => {
    if (!userId) return;

    const habitsChannel = supabase
      .channel('habits_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['habits', userId] });
          queryClient.invalidateQueries({ queryKey: ['habitLogs', userId] }); // Habits might affect logs (e.g., start_date)
        }
      )
      .subscribe();

    const habitLogsChannel = supabase
      .channel('habit_logs_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'habit_logs', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['habitLogs', userId] });
          queryClient.invalidateQueries({ queryKey: ['habits', userId] }); // Logs affect habit streaks
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(habitsChannel);
      supabase.removeChannel(habitLogsChannel);
    };
  }, [userId, queryClient]);

  return {
    habits,
    loading,
    addHabit: addHabitMutation.mutateAsync,
    updateHabit: updateHabitMutation.mutateAsync,
    deleteHabit: deleteHabitMutation.mutateAsync,
    toggleHabitCompletion,
    getHabitLogsForHabit, // Expose for detailed log fetching
  };
};