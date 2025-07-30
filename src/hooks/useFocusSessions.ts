import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { formatISO } from 'date-fns';

export interface FocusSession {
  id: string;
  user_id: string;
  session_type: 'work' | 'short_break' | 'long_break' | 'custom';
  duration_minutes: number;
  start_time: string; // ISO string
  end_time: string; // ISO string
  task_id: string | null;
  completed_during_session: boolean;
}

export type NewFocusSessionData = Omit<FocusSession, 'id' | 'user_id'>;

export const useFocusSessions = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [loading, setLoading] = useState(false);

  const addFocusSession = useCallback(async (sessionData: NewFocusSessionData) => {
    if (!userId) {
      showError('User not authenticated. Cannot save focus session.');
      return null;
    }

    setLoading(true);
    try {
      const payload = {
        ...sessionData,
        user_id: userId,
      };

      const { data, error } = await supabase
        .from('focus_sessions')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      showSuccess('Focus session saved!');
      return data;
    } catch (error: any) {
      console.error('Error saving focus session:', error.message);
      showError('Failed to save focus session.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    addFocusSession,
    loading,
  };
};