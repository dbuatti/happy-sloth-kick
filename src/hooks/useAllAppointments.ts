import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Appointment } from '@/types';
import { useQuery } from '@tanstack/react-query';

const fetchAllAppointments = async (userId: string): Promise<Appointment[]> => {
  const { data, error } = await supabase
    .from('schedule_appointments')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data as Appointment[];
};

export const useAllAppointments = () => {
  const { userId, isLoading: authLoading } = useAuth();

  const { data: allAppointments, isLoading, error } = useQuery<Appointment[], Error>({
    queryKey: ['allAppointments', userId],
    queryFn: async () => {
      if (!userId) return [];
      return fetchAllAppointments(userId);
    },
    enabled: !!userId && !authLoading,
  });

  return {
    allAppointments: allAppointments || [],
    isLoading,
    error,
  };
};