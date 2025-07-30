import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError } from '@/utils/toast';

type SessionType = 'work' | 'short_break' | 'long_break' | 'custom';

export const useFocusSessions = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const logSession = useCallback(async (type: SessionType, durationSeconds: number, start: Date, end: Date, taskId: string | null, completedDuringSession: boolean) => {
    if (!userId) {
      console.warn('useFocusSessions: No user ID, skipping session logging.');
      return;
    }
    try {
      const { error } = await supabase.from('focus_sessions').insert({
        user_id: userId,
        session_type: type,
        duration_minutes: Math.round(durationSeconds / 60),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        task_id: taskId,
        completed_during_session: completedDuringSession,
      });
      if (error) throw error;
      console.log('Focus session logged successfully!');
    }
    catch (error: any) {
      console.error('Error logging focus session:', error.message);
      showError('Failed to log focus session.');
    }
  }, [userId]);

  return { logSession };
};