import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';

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
}

export type NewAppointmentData = Omit<Appointment, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateAppointmentData = Partial<NewAppointmentData>;

export const useAppointments = (currentDate: Date) => {
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
      const startOfCurrentDay = format(startOfDay(currentDate), 'yyyy-MM-dd');
      const endOfCurrentDay = format(endOfDay(currentDate), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('schedule_appointments')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startOfCurrentDay)
        .lte('date', endOfCurrentDay)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      console.error('Error fetching appointments:', error.message);
      showError('Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, [userId, currentDate]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const addAppointment = useCallback(async (newAppointment: NewAppointmentData) => {
    console.log('useAppointments: addAppointment called with:', newAppointment);
    if (!userId) {
      showError('User not authenticated.');
      console.error('useAppointments: User not authenticated for addAppointment.');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('schedule_appointments')
        .insert({ ...newAppointment, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      setAppointments(prev => [...prev, data].sort((a, b) => a.start_time.localeCompare(b.start_time)));
      showSuccess('Appointment added successfully!');
      console.log('useAppointments: addAppointment success, data:', data);
      return data;
    } catch (error: any) {
      console.error('useAppointments: Error adding appointment:', error.message);
      showError('Failed to add appointment.');
      return null;
    }
  }, [userId]);

  const updateAppointment = useCallback(async (id: string, updates: UpdateAppointmentData) => {
    console.log('useAppointments: updateAppointment called for ID:', id, 'with updates:', updates);
    if (!userId) {
      showError('User not authenticated.');
      console.error('useAppointments: User not authenticated for updateAppointment.');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('schedule_appointments')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      setAppointments(prev => prev.map(app => (app.id === id ? data : app)).sort((a, b) => a.start_time.localeCompare(b.start_time)));
      showSuccess('Appointment updated successfully!');
      console.log('useAppointments: updateAppointment success, data:', data);
      return data;
    } catch (error: any) {
      console.error('useAppointments: Error updating appointment:', error.message);
      showError('Failed to update appointment.');
      return null;
    }
  }, [userId]);

  const deleteAppointment = useCallback(async (id: string) => {
    console.log('useAppointments: deleteAppointment called for ID:', id);
    if (!userId) {
      showError('User not authenticated.');
      console.error('useAppointments: User not authenticated for deleteAppointment.');
      return false;
    }
    try {
      const { error } = await supabase
        .from('schedule_appointments')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      setAppointments(prev => prev.filter(app => app.id !== id));
      showSuccess('Appointment deleted successfully!');
      console.log('useAppointments: deleteAppointment success.');
      return true;
    } catch (error: any) {
      console.error('useAppointments: Error deleting appointment:', error.message);
      showError('Failed to delete appointment.');
      return false;
    }
  }, [userId]);

  return {
    appointments,
    loading,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    fetchAppointments, // Expose fetchAppointments for manual refresh if needed
  };
};