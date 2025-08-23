import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Appointment, NewAppointmentData, UpdateAppointmentData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { format, startOfDay } from 'date-fns';
import { toast } from 'react-hot-toast';

export const useAppointments = (date: Date) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const formattedDate = format(startOfDay(date), 'yyyy-MM-dd');

  const { data: appointments, isLoading, error } = useQuery<Appointment[], Error>({
    queryKey: ['appointments', userId, formattedDate],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('schedule_appointments')
        .select('*')
        .eq('user_id', userId)
        .eq('date', formattedDate)
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
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', userId, formattedDate] });
      toast.success('Appointment added!');
    },
  });

  const updateAppointmentMutation = useMutation<Appointment, Error, { id: string; updates: UpdateAppointmentData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('schedule_appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', userId, formattedDate] });
      toast.success('Appointment updated!');
    },
  });

  const deleteAppointmentMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('schedule_appointments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', userId, formattedDate] });
      toast.success('Appointment deleted!');
    },
  });

  const clearAppointmentsForDayMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (dateToClear) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('schedule_appointments')
        .delete()
        .eq('user_id', userId)
        .eq('date', dateToClear);
      if (error) throw error;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', userId, variables] });
      toast.success(`All appointments for ${variables} cleared!`);
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