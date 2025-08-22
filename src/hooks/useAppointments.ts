import { useCallback } from 'react'; // Removed useState, useEffect
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  fetchAppointments,
  addAppointment,
  updateAppointment,
  deleteAppointment,
} from '@/integrations/supabase/api';
import { Appointment } from '@/types/task'; // Corrected import path
import { showError, showSuccess } from '@/utils/toast';

interface UseAppointmentsProps {
  userId?: string | null;
}

export const useAppointments = ({ userId }: UseAppointmentsProps) => {
  const { user } = useAuth();
  const activeUserId = userId || user?.id;
  const queryClient = useQueryClient();

  const appointmentsQueryKey = ['appointments', activeUserId];

  const {
    data: appointments = [],
    isLoading,
    error,
  } = useQuery<Appointment[], Error>({
    queryKey: appointmentsQueryKey,
    queryFn: () => fetchAppointments(activeUserId!),
    enabled: !!activeUserId,
  });

  const addAppointmentMutation = useMutation<Appointment | null, Error, Partial<Appointment>>({
    mutationFn: (newAppointment) => addAppointment({ ...newAppointment, user_id: activeUserId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsQueryKey });
      showSuccess('Appointment added successfully!');
    },
    onError: (err) => {
      showError(`Failed to add appointment: ${(err as Error).message}`);
    },
  });

  const updateAppointmentMutation = useMutation<Appointment | null, Error, { id: string; updates: Partial<Appointment> }>({
    mutationFn: ({ id, updates }) => updateAppointment(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsQueryKey });
      showSuccess('Appointment updated successfully!');
    },
    onError: (err) => {
      showError(`Failed to update appointment: ${(err as Error).message}`);
    },
  });

  const deleteAppointmentMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsQueryKey });
      showSuccess('Appointment deleted successfully!');
    },
    onError: (err) => {
      showError(`Failed to delete appointment: ${(err as Error).message}`);
    },
  });

  const handleAddAppointment = useCallback(
    async (appointmentData: Partial<Appointment>): Promise<Appointment | null> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return null;
      }
      try {
        const result = await addAppointmentMutation.mutateAsync(appointmentData);
        return result;
      } catch (err) {
        return null;
      }
    },
    [activeUserId, addAppointmentMutation]
  );

  const handleUpdateAppointment = useCallback(
    async (appointmentId: string, updates: Partial<Appointment>): Promise<Appointment | null> => {
      try {
        const result = await updateAppointmentMutation.mutateAsync({ id: appointmentId, updates });
        return result;
      } catch (err) {
        return null;
      }
    },
    [updateAppointmentMutation]
  );

  const handleDeleteAppointment = useCallback(
    async (appointmentId: string): Promise<void> => {
      try {
        await deleteAppointmentMutation.mutateAsync(appointmentId);
      } catch (err) {
        // Error handled by mutation's onError
      }
    },
    [deleteAppointmentMutation]
  );

  return {
    appointments,
    isLoading,
    error,
    addAppointment: handleAddAppointment,
    updateAppointment: handleUpdateAppointment,
    deleteAppointment: handleDeleteAppointment,
  };
};