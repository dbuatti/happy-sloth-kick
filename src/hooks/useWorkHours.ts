import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError } from '@/utils/toast';
import { format } from 'date-fns';

interface WorkHour {
  day_of_week: string;
  start_time: string;
  end_time: string;
  enabled: boolean;
}

const dayMap: { [key: number]: string } = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

export const useWorkHours = (date: Date) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [workHours, setWorkHours] = useState<WorkHour | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkHoursForDay = useCallback(async () => {
    if (!userId) {
      setWorkHours(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const dayOfWeekString = dayMap[date.getDay()];

    try {
      const { data, error } = await supabase
        .from('user_work_hours')
        .select('*')
        .eq('user_id', userId)
        .eq('day_of_week', dayOfWeekString)
        .eq('enabled', true) // Only fetch enabled work hours
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }

      setWorkHours(data || null);
    } catch (error: any) {
      console.error('Error fetching work hours for day:', error.message);
      showError('Failed to load work hours for the day.');
      setWorkHours(null);
    } finally {
      setLoading(false);
    }
  }, [userId, date]);

  useEffect(() => {
    fetchWorkHoursForDay();
  }, [fetchWorkHoursForDay]);

  return { workHours, loading };
};