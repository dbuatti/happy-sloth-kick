import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Appointment, NewAppointmentData, UpdateAppointmentData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

export const useAppointments = (date: Date) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const invalidateAppointmentsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
  }, [queryClient, userId]);

  const { data: appointments, isLoading, error } = useQuery<Appointment[], Error>({
    queryKey: ['appointments', userId, format(date, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('schedule_appointments')
        .select('*')
        .eq('user_id', userId)
        .eq('date', format(date, 'yyyy-MM-dd'))
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !authLoading,
  });

  const addAppointmentMutation = useMutation<Appointment, Error, NewAppointmentData, unknown>({
    mutationFn: async (newAppointmentData) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('schedule_appointments')
        .insert({ ...newAppointmentData, user_id: userId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAppointmentsQueries();
    },
  });

  const updateAppointmentMutation = useMutation<Appointment, Error, { id: string; updates: UpdateAppointmentData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('schedule_appointments')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAppointmentsQueries();
    },
  });

  const deleteAppointmentMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('schedule_appointments')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAppointmentsQueries();
    },
  });

  const clearAppointmentsForDayMutation = useMutation<void, Error, Date, unknown>({
    mutationFn: async (day) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('schedule_appointments')
        .delete()
        .eq('user_id', userId)
        .eq('date', format(day, 'yyyy-MM-dd'));
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAppointmentsQueries();
    },
  });

  return {
    appointments,
    isLoading,
    error,
    addAppointment: addAppointmentMutation.mutateAsync,
    updateAppointment: updateAppointmentMutation.mutateAsync,
    deleteAppointment: deleteAppointmentMutation.mutateAsync,
    clearAppointmentsForDay: clearAppointmentsForDayMutation.mutateAsync,
  };
};