import { useAuth } from '@/context/AuthContext';
import { Appointment } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseAllAppointmentsProps {
  userId?: string;
}

export const useAllAppointments = ({ userId: propUserId }: UseAllAppointmentsProps = {}) => {
  const { user } = useAuth();
  const currentUserId = propUserId || user?.id;

  const { data: allAppointments, isLoading, error } = useQuery<Appointment[], Error>({
    queryKey: ['allAppointments', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('schedule_appointments')
        .select('*')
        .eq('user_id', currentUserId)
        .order('date', { ascending: false })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!currentUserId,
  });

  return {
    allAppointments: allAppointments || [],
    isLoading,
    error,
  };
};