import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  fetchAppointments,
  addAppointment,
  updateAppointment,
  deleteAppointment,
} from '@/integrations/supabase/api';
import { Appointment } from '@/types/task';
import { showError, showSuccess } from '@/utils/toast';

interface UseAppointmentsProps {
  userId?: string | null;
}

interface NewAppointmentData {
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  color: string;
  task_id: string | null;
  user_id: string;
}

export const useAppointments = (props?: UseAppointmentsProps) => {
  const { user } = useAuth();
  const activeUserId = props?.userId || user?.id;
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

  const addAppointmentMutation = useMutation<Appointment | null, Error, NewAppointmentData>({
    mutationFn: (newAppointment) => addAppointment(newAppointment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsQueryKey });
    },
    onError: (err) => {
      showError(`Failed to add appointment: ${err.message}`);
    },
  });

  const updateAppointmentMutation = useMutation<Appointment | null, Error, { id: string; updates: Partial<NewAppointmentData> }>({
    mutationFn: ({ id, updates }) => updateAppointment(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsQueryKey });
    },
    onError: (err) => {
      showError(`Failed to update appointment: ${err.message}`);
    },
  });

  const deleteAppointmentMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsQueryKey });
    },
    onError: (err) => {
      showError(`Failed to delete appointment: ${err.message}`);
    },
  });

  const addAppointmentCallback = useCallback(
    async (appointmentData: Partial<Appointment>): Promise<Appointment | null> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return null;
      }
      if (!appointmentData.title || !appointmentData.date || !appointmentData.start_time || !appointmentData.end_time || !appointmentData.color) {
        showError('Missing required appointment fields.');
        return null;
      }
      try {
        const newAppointment: NewAppointmentData = {
          user_id: activeUserId,
          title: appointmentData.title,
          description: appointmentData.description || null,
          date: appointmentData.date,
          start_time: appointmentData.start_time,
          end_time: appointmentData.end_time,
          color: appointmentData.color,
          task_id: appointmentData.task_id || null,
        };
        const result = await addAppointmentMutation.mutateAsync(newAppointment);
        showSuccess('Appointment added successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [activeUserId, addAppointmentMutation]
  );

  const updateAppointmentCallback = useCallback(
    async (appointmentId: string, updates: Partial<Appointment>): Promise<Appointment | null> => {
      try {
        const result = await updateAppointmentMutation.mutateAsync({ id: appointmentId, updates: updates as Partial<NewAppointmentData> });
        showSuccess('Appointment updated successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [updateAppointmentMutation]
  );

  const deleteAppointmentCallback = useCallback(
    async (appointmentId: string): Promise<void> => {
      try {
        await deleteAppointmentMutation.mutateAsync(appointmentId);
        showSuccess('Appointment deleted successfully!');
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
    addAppointment: addAppointmentCallback,
    updateAppointment: updateAppointmentCallback,
    deleteAppointment: deleteAppointmentCallback,
  };
};