import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Appointment, NewAppointmentData, UpdateAppointmentData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

const fetchAppointments = async (userId: string, startOfRange: string, endOfRange: string): Promise<Appointment[]> => {
  const { data, error } = await supabase
    .from('schedule_appointments')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startOfRange)
    .lte('date', endOfRange)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data as Appointment[];
};

const addAppointment = async (newAppointment: NewAppointmentData & { user_id: string }): Promise<Appointment> => {
  const { data, error } = await supabase
    .from('schedule_appointments')
    .insert(newAppointment)
    .select('*')
    .single();
  if (error) throw error;
  return data as Appointment;
};

const updateAppointment = async (id: string, updates: UpdateAppointmentData): Promise<Appointment> => {
  const { data, error } = await supabase
    .from('schedule_appointments')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Appointment;
};

const deleteAppointment = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('schedule_appointments')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const useAppointments = (date: Date) => {
  const { userId, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const startOfRange = format(date, 'yyyy-MM-dd');
  const endOfRange = format(date, 'yyyy-MM-dd'); // For single day, range is just that day

  const { data: appointments, isLoading, error } = useQuery<Appointment[], Error>({
    queryKey: ['appointments', userId, startOfRange, endOfRange],
    queryFn: async () => {
      if (!userId) return [];
      return fetchAppointments(userId, startOfRange, endOfRange);
    },
    enabled: !!userId && !authLoading,
  });

  const addAppointmentMutation = useMutation<Appointment, Error, NewAppointmentData>({
    mutationFn: async (newAppointment) => {
      if (!userId) throw new Error('User not authenticated.');
      return addAppointment({ ...newAppointment, user_id: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
    },
  });

  const updateAppointmentMutation = useMutation<Appointment, Error, { id: string; updates: UpdateAppointmentData }>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated.');
      return updateAppointment(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
    },
  });

  const deleteAppointmentMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
    },
  });

  const clearAppointmentsForDay = useMutation<void, Error, Date>({
    mutationFn: async (dateToClear) => {
      if (!userId) throw new Error('User not authenticated.');
      const formattedDateToClear = format(dateToClear, 'yyyy-MM-dd');
      const currentAppointments = queryClient.getQueryData<Appointment[]>(['appointments', userId, startOfRange, endOfRange]) || [];
      const appointmentsToDelete = currentAppointments.filter(app => app.date === formattedDateToClear);
      if (appointmentsToDelete.length === 0) return;

      const idsToDelete = appointmentsToDelete.map(app => app.id);
      const { error } = await supabase
        .from('schedule_appointments')
        .delete()
        .in('id', idsToDelete);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
    },
  });

  return {
    appointments: appointments || [],
    isLoading,
    error,
    addAppointment: addAppointmentMutation.mutateAsync,
    updateAppointment: updateAppointmentMutation.mutateAsync,
    deleteAppointment: deleteAppointmentMutation.mutateAsync,
    clearAppointmentsForDay: clearAppointmentsForDay.mutateAsync,
  };
};