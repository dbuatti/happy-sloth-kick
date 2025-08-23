import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError } from '@/utils/toast';
import { Appointment } from './useAppointments';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const useAllAppointments = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading: loading, error } = useQuery<Appointment[], Error>({
    queryKey: ['allAppointments', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('schedule_appointments')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (error) {
      console.error('Error fetching all appointments:', error.message);
      showError('Failed to load schedule data.');
    }
  }, [error]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('all-appointments-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_appointments', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['allAppointments', userId] });
          queryClient.invalidateQueries({ queryKey: ['appointments', userId] }); // Also invalidate specific date range appointments
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return { appointments, loading };
};