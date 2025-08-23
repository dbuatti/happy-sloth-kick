import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { WorkHour, NewWorkHourData, UpdateWorkHourData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

const fetchWorkHours = async (userId: string): Promise<WorkHour[]> => {
  const { data, error } = await supabase
    .from('user_work_hours')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data as WorkHour[];
};

const fetchWorkHoursForDay = async (userId: string, dayOfWeek: string): Promise<WorkHour | null> => {
  const { data, error } = await supabase
    .from('user_work_hours')
    .select('*')
    .eq('user_id', userId)
    .eq('day_of_week', dayOfWeek)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found
  return data as WorkHour | null;
};

const addWorkHour = async (newWorkHour: NewWorkHourData & { user_id: string }): Promise<WorkHour> => {
  const { data, error } = await supabase
    .from('user_work_hours')
    .insert(newWorkHour)
    .select('*')
    .single();
  if (error) throw error;
  return data as WorkHour;
};

const updateWorkHour = async (id: string, updates: UpdateWorkHourData): Promise<WorkHour> => {
  const { data, error } = await supabase
    .from('user_work_hours')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as WorkHour;
};

const deleteWorkHour = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('user_work_hours')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const useWorkHours = () => {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: workHours, isLoading: isLoadingAll, error: errorAll } = useQuery<WorkHour[], Error>({
    queryKey: ['workHours', userId],
    queryFn: () => fetchWorkHours(userId!),
    enabled: !!userId && !authLoading,
  });

  const addWorkHourMutation = useMutation<WorkHour, Error, NewWorkHourData>({
    mutationFn: async (newWorkHour) => {
      if (!userId) throw new Error('User not authenticated.');
      return addWorkHour({ ...newWorkHour, user_id: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workHours', userId] });
    },
  });

  const updateWorkHourMutation = useMutation<WorkHour, Error, { id: string; updates: UpdateWorkHourData }>({
    mutationFn: ({ id, updates }) => updateWorkHour(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workHours', userId] });
    },
  });

  const deleteWorkHourMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteWorkHour(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workHours', userId] });
    },
  });

  const [singleDayWorkHour, setSingleDayWorkHour] = useState<WorkHour | null>(null);
  const [isLoadingSingleDay, setIsLoadingSingleDay] = useState(false);
  const [errorSingleDay, setErrorSingleDay] = useState<Error | null>(null);

  const fetchSingleDayWorkHour = async (dayOfWeek: string) => {
    if (!userId) {
      setErrorSingleDay(new Error('User not authenticated.'));
      return;
    }
    setIsLoadingSingleDay(true);
    setErrorSingleDay(null);
    try {
      const data = await fetchWorkHoursForDay(userId, dayOfWeek);
      setSingleDayWorkHour(data);
      console.log('useWorkHours: Fetched single day data:', data);
    } catch (error: any) {
      setErrorSingleDay(error);
      console.error('useWorkHours: Error fetching single day data:', error);
    } finally {
      setIsLoadingSingleDay(false);
    }
  };

  return {
    workHours: workHours || [],
    isLoading: isLoadingAll || isLoadingSingleDay || authLoading,
    error: errorAll || errorSingleDay,
    addWorkHour: addWorkHourMutation.mutateAsync,
    updateWorkHour: updateWorkHourMutation.mutateAsync,
    deleteWorkHour: deleteWorkHourMutation.mutateAsync,
    fetchSingleDayWorkHour,
    singleDayWorkHour,
  };
};