import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Appointment } from '@/types';
import { useQuery } from '@tanstack/react-query';

export const useAllAppointments = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const { data: allAppointments, isLoading, error } = useQuery<Appointment[], Error>({
    queryKey: ['allAppointments', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('schedule_appointments')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !authLoading,
  });

  return {
    allAppointments,
    isLoading,
    error,
  };
};