import { useAuth } from '@/context/AuthContext';
import { Appointment, NewAppointmentData, UpdateAppointmentData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

interface UseAppointmentsProps {
  userId?: string;
  date?: Date;
}

export const useAppointments = ({ userId: propUserId, date }: UseAppointmentsProps) => {
  const { user } = useAuth();
  const currentUserId = propUserId || user?.id;
  const queryClient = useQueryClient();

  const formattedDate = date ? format(date, 'yyyy-MM-dd') : undefined;

  const { data: appointments, isLoading, error } = useQuery<Appointment[], Error>({
    queryKey: ['appointments', currentUserId, formattedDate],
    queryFn: async () => {
      if (!currentUserId) return [];
      let query = supabase
        .from('schedule_appointments')
        .select('*')
        .eq('user_id', currentUserId);

      if (formattedDate) {
        query = query.eq('date', formattedDate);
      }

      const { data, error } = await query.order('start_time', { ascending: true });

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!currentUserId,
  });

  const addAppointmentMutation = useMutation<Appointment, Error, NewAppointmentData, unknown>({
    mutationFn: async (newAppointmentData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('schedule_appointments')
        .insert({ ...newAppointmentData, user_id: currentUserId })
        .select()
        .single();

      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', currentUserId] });
    },
  });

  const updateAppointmentMutation = useMutation<Appointment, Error, { id: string; updates: UpdateAppointmentData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('schedule_appointments')
        .update(updates)
        .eq('id', id)
        .eq('user_id', currentUserId)
        .select()
        .single();

      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', currentUserId] });
    },
  });

  const deleteAppointmentMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('schedule_appointments')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', currentUserId] });
    },
  });

  return {
    appointments,
    isLoading,
    error,
    addAppointment: addAppointmentMutation.mutateAsync,
    updateAppointment: updateAppointmentMutation.mutateAsync,
    deleteAppointment: deleteAppointmentMutation.mutateAsync,
  };
};