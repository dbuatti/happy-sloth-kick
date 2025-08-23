import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { WorkHour, NewWorkHourData, UpdateWorkHourData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

export const useWorkHours = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const invalidateWorkHoursQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['workHours', userId] });
  }, [queryClient, userId]);

  const { data: workHours, isLoading, error } = useQuery<WorkHour[], Error>({
    queryKey: ['workHours', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_work_hours')
        .select('*')
        .eq('user_id', userId)
        .order('day_of_week', { ascending: true }); // Assuming day_of_week can be ordered or mapped
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !authLoading,
  });

  const addWorkHourMutation = useMutation<WorkHour, Error, NewWorkHourData, unknown>({
    mutationFn: async (newWorkHourData) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('user_work_hours')
        .insert({ ...newWorkHourData, user_id: userId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateWorkHoursQueries();
    },
  });

  const updateWorkHourMutation = useMutation<WorkHour, Error, { id: string; updates: UpdateWorkHourData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('user_work_hours')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateWorkHoursQueries();
    },
  });

  const deleteWorkHourMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('user_work_hours')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateWorkHoursQueries();
    },
  });

  // For fetching a single day's work hour (e.g., for DailyScheduleView)
  const [singleDayWorkHour, setSingleDayWorkHour] = useState<WorkHour | null>(null);
  const [isLoadingSingleDay, setIsLoadingSingleDay] = useState(false);
  const [errorSingleDay, setErrorSingleDay] = useState<Error | null>(null);

  const fetchWorkHourForDay = useCallback(async (dayOfWeek: string) => {
    setIsLoadingSingleDay(true);
    setErrorSingleDay(null);
    try {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('user_work_hours')
        .select('*')
        .eq('user_id', userId)
        .eq('day_of_week', dayOfWeek)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found
      setSingleDayWorkHour(data);
    } catch (err) {
      setErrorSingleDay(err as Error);
    } finally {
      setIsLoadingSingleDay(false);
    }
  }, [userId]);

  return {
    workHours,
    isLoading,
    error,
    addWorkHour: addWorkHourMutation.mutateAsync,
    updateWorkHour: updateWorkHourMutation.mutateAsync,
    deleteWorkHour: deleteWorkHourMutation.mutateAsync,
    fetchWorkHourForDay,
    singleDayWorkHour,
    isLoadingSingleDay,
    errorSingleDay,
  };
};