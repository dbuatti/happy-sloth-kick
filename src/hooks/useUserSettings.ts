import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';

export interface UserSettings {
  user_id: string;
  project_tracker_title: string;
  focused_task_id: string | null;
  hide_future_tasks: boolean;
}

const defaultSettings: Omit<UserSettings, 'user_id'> = {
  project_tracker_title: 'Project Balance Tracker',
  focused_task_id: null,
  hide_future_tasks: false,
};

export const useUserSettings = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!userId) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
        throw error;
      }

      if (data) {
        setSettings(data);
      } else {
        // No settings found, create default ones
        const { data: newData, error: insertError } = await supabase
          .from('user_settings')
          .insert({ user_id: userId, ...defaultSettings })
          .select()
          .single();
        if (insertError) throw insertError;
        setSettings(newData);
      }
    } catch (error: any) {
      console.error('Error fetching user settings:', error);
      showError('Failed to load user settings.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<Omit<UserSettings, 'user_id'>>) => {
    if (!userId || !settings) {
      showError('User not authenticated or settings not loaded.');
      return false;
    }
    
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    try {
      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Settings updated!');
      return true;
    } catch (error: any) {
      console.error('Error updating settings:', error);
      showError('Failed to update settings.');
      // Revert optimistic update
      setSettings(settings);
      return false;
    }
  }, [userId, settings]);

  return { settings, loading, updateSettings };
};