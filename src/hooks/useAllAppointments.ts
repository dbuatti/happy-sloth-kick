import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { fetchAppointments } from '@/integrations/supabase/api';
import { Appointment } from '@/types/task'; // Corrected import path
import { showError } from '@/utils/toast';

interface UseAllAppointmentsProps {
  userId?: string | null;
}

export const useAllAppointments = ({ userId }: UseAllAppointmentsProps) => {
  const { user } = useAuth();
  const activeUserId = userId || user?.id;
  const queryClient = useQueryClient();

  const appointmentsQueryKey = ['allAppointments', activeUserId];

  const {
    data: allAppointments = [],
    isLoading,
    error,
  } = useQuery<Appointment[], Error>({
    queryKey: appointmentsQueryKey,
    queryFn: () => fetchAppointments(activeUserId!),
    enabled: !!activeUserId,
  });

  return {
    allAppointments,
    isLoading,
    error,
  };
};