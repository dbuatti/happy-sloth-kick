import { useAuth } from '@/context/AuthContext';
import { Appointment, NewAppointmentData, UpdateAppointmentData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay } from 'date-fns';
import { toast } from 'react-hot-toast';

export const useAppointments = (date: Date) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = user?.id;
  const queryClient = useQueryClient();
  const formattedDate = format(date, 'yyyy-MM-dd');

  const { data: appointments, isLoading, error, refetch } = useQuery<Appointment[], Error>({
    queryKey: ['appointments', currentUserId, formattedDate],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('schedule_appointments')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('date', formattedDate)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentUserId && !authLoading,
  });

  const addAppointmentMutation = useMutation<Appointment, Error, NewAppointmentData, unknown>({
    mutationFn: async (newAppointmentData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('schedule_appointments')
        .insert({ ...newAppointmentData, user_id: currentUserId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', currentUserId, formattedDate] });
      toast.success('Appointment added!');
    },
  });

  const updateAppointmentMutation = useMutation<Appointment, Error, { id: string; updates: UpdateAppointmentData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('schedule_appointments')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', currentUserId, formattedDate] });
      toast.success('Appointment updated!');
    },
  });

  const deleteAppointmentMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('schedule_appointments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', currentUserId, formattedDate] });
      toast.success('Appointment deleted!');
    },
  });

  const clearAppointmentsForDayMutation = useMutation<void, Error, Date, unknown>({
    mutationFn: async (dateToClear) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const formattedDateToClear = format(dateToClear, 'yyyy-MM-dd');
      const { error } = await supabase
        .from('schedule_appointments')
        .delete()
        .eq('user_id', currentUserId)
        .eq('date', formattedDateToClear);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', currentUserId, formattedDate] });
      toast.success('All appointments for the day cleared!');
    },
  });

  return {
    appointments,
    isLoading,
    error,
    refetchAppointments: refetch,
    addAppointment: addAppointmentMutation.mutateAsync,
    updateAppointment: updateAppointmentMutation.mutateAsync,
    deleteAppointment: deleteAppointmentMutation.mutateAsync,
    clearAppointmentsForDay: clearAppointmentsForDayMutation.mutateAsync,
  };
};