import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError } from '@/utils/toast';
import { Appointment } from './useAppointments';

export const useAllAppointments = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    if (!userId) {
      setAppointments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedule_appointments')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      console.error('Error fetching all appointments:', error.message);
      showError('Failed to load schedule data.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('all-appointments-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_appointments', filter: `user_id=eq.${userId}` },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchAppointments]);

  return { appointments, loading };
};