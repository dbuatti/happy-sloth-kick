import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner'; // Import toast from sonner

export interface Appointment {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  color: string;
  created_at: string;
  updated_at: string;
  task_id: string | null; // Added task_id
}

export type NewAppointmentData = Omit<Appointment, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateAppointmentData = Partial<NewAppointmentData>;

interface UseAppointmentsProps {
  startDate: Date;
  endDate: Date;
  userId?: string;
}

export const useAppointments = ({ startDate, endDate, userId: propUserId }: UseAppointmentsProps) => {
  const { user } = useAuth();
  const userId = propUserId || user?.id;
  const queryClient = useQueryClient();

  const startOfRange = format(startOfDay(startDate), 'yyyy-MM-dd');
  const endOfRange = format(endOfDay(endDate), 'yyyy-MM-dd');

  const { data: appointments = [], isLoading: loading, error } = useQuery<Appointment[], Error>({
    queryKey: ['appointments', userId, startOfRange, endOfRange],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('schedule_appointments')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startOfRange)
        .lte('date', endOfRange)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });

  useEffect(() => {
    if (error) {
      console.error('Error fetching appointments:', error.message);
      showError('Failed to load appointments.');
    }
  }, [error]);

  const addAppointmentMutation = useMutation<Appointment, Error, NewAppointmentData>({
    mutationFn: async (newAppointment) => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('schedule_appointments')
        .insert({ ...newAppointment, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { // Removed unused data parameter
      showSuccess('Appointment added successfully!');
      queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', userId] }); // Invalidate dashboard stats
    },
    onError: (err) => {
      console.error('useAppointments: Error adding appointment:', err.message);
      showError('Failed to add appointment.');
    },
  });

  const updateAppointmentMutation = useMutation<Appointment, Error, { id: string; updates: UpdateAppointmentData }>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('schedule_appointments')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { // Removed unused data parameter
      showSuccess('Appointment updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', userId] }); // Invalidate dashboard stats
    },
    onError: (err) => {
      console.error('useAppointments: Error updating appointment:', err.message);
      showError('Failed to update appointment.');
    },
  });

  const deleteAppointmentMutation = useMutation<boolean, Error, string>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase
        .from('schedule_appointments')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      showSuccess('Appointment deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', userId] }); // Invalidate dashboard stats
    },
    onError: (err) => {
      console.error('useAppointments: Error deleting appointment:', err.message);
      showError('Failed to delete appointment.');
    },
  });

  const clearDayAppointmentsMutation = useMutation<Appointment[], Error, Date>({
    mutationFn: async (dateToClear) => {
      if (!userId) throw new Error('User not authenticated.');
      const formattedDateToClear = format(dateToClear, 'yyyy-MM-dd');
      const appointmentsToDelete = appointments.filter(app => app.date === formattedDateToClear);
      if (appointmentsToDelete.length === 0) return [];

      const idsToDelete = appointmentsToDelete.map(app => app.id);
      const { error } = await supabase
        .from('schedule_appointments')
        .delete()
        .in('id', idsToDelete)
        .eq('user_id', userId);
      
      if (error) throw error;
      return appointmentsToDelete;
    },
    onSuccess: (deletedApps, dateToClear) => {
      if (deletedApps.length > 0) {
        toast.success(`Cleared ${format(dateToClear, 'MMM d')}.`, {
          action: {
            label: 'Undo',
            onClick: () => batchAddAppointmentsMutation.mutate(deletedApps),
          },
        });
      }
      queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', userId] });
    },
    onError: (err) => {
      showError('Failed to clear day.');
      console.error('Error clearing day appointments:', err.message);
    },
  });

  const batchAddAppointmentsMutation = useMutation<boolean, Error, Appointment[]>({
    mutationFn: async (appointmentsToRestore) => {
      if (!userId || appointmentsToRestore.length === 0) return false;
      const recordsToInsert = appointmentsToRestore.map(({ id, created_at, updated_at, ...rest }) => rest);
      const { error } = await supabase
        .from('schedule_appointments')
        .insert(recordsToInsert);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      showSuccess('Appointments restored!');
      queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', userId] });
    },
    onError: (err) => {
      showError('Failed to restore appointments.');
      console.error('Error batch adding appointments:', err.message);
    },
  });

  return {
    appointments,
    loading,
    addAppointment: addAppointmentMutation.mutateAsync,
    updateAppointment: updateAppointmentMutation.mutateAsync,
    deleteAppointment: deleteAppointmentMutation.mutateAsync,
    clearDayAppointments: clearDayAppointmentsMutation.mutateAsync,
    batchAddAppointments: batchAddAppointmentsMutation.mutateAsync,
  };
};