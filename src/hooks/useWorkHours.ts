import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast'; // Added showSuccess and showError

export interface WorkHour {
  id?: string; // Optional for existing records
  day_of_week: string;
  start_time: string;
  end_time: string;
  enabled: boolean;
  user_id?: string; // Optional, will be set by hook
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

const defaultTime = {
  start: '09:00',
  end: '17:00',
};

export const allDaysOfWeek = [
  { id: 'monday', name: 'Monday' },
  { id: 'tuesday', name: 'Tuesday' },
  { id: 'wednesday', name: 'Wednesday' },
  { id: 'thursday', name: 'Thursday' },
  { id: 'friday', name: 'Friday' },
  { id: 'saturday', name: 'Saturday' },
  { id: 'sunday', name: 'Sunday' },
];

interface UseWorkHoursProps {
  date?: Date; // Make date optional
  userId?: string;
}

export const useWorkHours = ({ date, userId: propUserId }: UseWorkHoursProps = {}) => { // Default to empty object
  const { user } = useAuth();
  const userId = propUserId || user?.id;
  const [workHours, setWorkHours] = useState<WorkHour | WorkHour[] | null>(null); // Can be single or array
  const [loading, setLoading] = useState(true);

  const fetchWorkHours = useCallback(async () => {
    if (!userId) {
      setWorkHours(date ? null : []); // Set to null for single day, empty array for all days
      setLoading(false);
      console.log('useWorkHours: No user ID, skipping fetch.');
      return;
    }

    setLoading(true);
    try {
      if (date) {
        // Fetch for a specific day
        const dayOfWeekString = dayMap[date.getDay()];
        console.log(`useWorkHours: Fetching for user ${userId}, day ${dayOfWeekString}`);
        const { data, error } = await supabase
          .from('user_work_hours')
          .select('*')
          .eq('user_id', userId)
          .eq('day_of_week', dayOfWeekString)
          .eq('enabled', true)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        setWorkHours(data || null);
        console.log('useWorkHours: Fetched single day data:', data);
      } else {
        // Fetch all work hours for the user
        console.log(`useWorkHours: Fetching all work hours for user ${userId}`);
        const { data, error } = await supabase
          .from('user_work_hours')
          .select('*')
          .eq('user_id', userId);

        if (error) throw error;

        const fetchedHoursMap = new Map((data || []).map(wh => [wh.day_of_week, wh]));
        const allHours = allDaysOfWeek.map(day => ({
          day_of_week: day.id,
          start_time: fetchedHoursMap.get(day.id)?.start_time || defaultTime.start,
          end_time: fetchedHoursMap.get(day.id)?.end_time || defaultTime.end,
          enabled: fetchedHoursMap.has(day.id) ? fetchedHoursMap.get(day.id)?.enabled || false : false,
          id: fetchedHoursMap.get(day.id)?.id,
        }));
        setWorkHours(allHours);
        console.log('useWorkHours: Fetched all days data:', allHours);
      }
    } catch (error: any) {
      console.error('Error fetching work hours:', error.message);
      showError('Failed to load work hours.');
      setWorkHours(date ? null : []);
    } finally {
      setLoading(false);
    }
  }, [userId, date]);

  useEffect(() => {
    fetchWorkHours();
  }, [fetchWorkHours]);

  // Function to save/update work hours (can be used for single or multiple)
  const saveWorkHours = useCallback(async (hoursToSave: WorkHour | WorkHour[]) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      const updatesArray = Array.isArray(hoursToSave) ? hoursToSave : [hoursToSave];
      
      const payload = updatesArray.map(wh => ({
        user_id: userId,
        day_of_week: wh.day_of_week,
        start_time: wh.start_time,
        end_time: wh.end_time,
        enabled: wh.enabled,
        ...(wh.id && { id: wh.id }), // Include ID only if it exists
      }));

      console.log('Saving work hours updates:', payload);

      const { error } = await supabase
        .from('user_work_hours')
        .upsert(payload, { onConflict: 'user_id, day_of_week' });

      if (error) throw error;
      showSuccess('Work hours saved successfully!');
      await fetchWorkHours(); // Re-fetch to ensure state is consistent and IDs are updated
      return true;
    } catch (error: any) {
      showError('Failed to save work hours.');
      console.error('Error saving work hours:', error.message);
      return false;
    }
  }, [userId, fetchWorkHours]);

  return { workHours, loading, saveWorkHours, allDaysOfWeek, defaultTime };
};