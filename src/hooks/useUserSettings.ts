import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';


export interface UserSettings {
  user_id: string;
  project_tracker_title: string;
  focused_task_id: string | null;
  future_tasks_days_visible: number;
  meditation_notes: string | null;
  dashboard_layout: any | null; // jsonb can be any
  visible_pages?: Record<string, boolean>;
  schedule_show_focus_tasks_only: boolean;
  dashboard_panel_sizes: number[] | null; // New: Stores the sizes of resizable panels
  min_schedule_hour: number; // New: Minimum hour to display in schedule (0-23)
  max_schedule_hour: number; // New: Maximum hour to display in schedule (0-24, where 24 means end of day)
}

const defaultSettings: Omit<UserSettings, 'user_id'> = {
  project_tracker_title: 'Project Balance Tracker',
  focused_task_id: null,
  future_tasks_days_visible: 7,
  meditation_notes: null,
  dashboard_layout: null,
  visible_pages: {},
  schedule_show_focus_tasks_only: true,
  dashboard_panel_sizes: [66, 34], // Default sizes for the two main dashboard panels
  min_schedule_hour: 0, // Default to 00:00
  max_schedule_hour: 24, // Default to 24:00 (end of day)
};

export const useUserSettings = (props?: { userId?: string }) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const isDemo = !!props?.userId;

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
        setSettings({
          ...defaultSettings,
          ...data,
          dashboard_layout: { ...defaultSettings.dashboard_layout, ...(data.dashboard_layout || {}) },
          dashboard_panel_sizes: data.dashboard_panel_sizes || defaultSettings.dashboard_panel_sizes,
          min_schedule_hour: data.min_schedule_hour ?? defaultSettings.min_schedule_hour,
          max_schedule_hour: data.max_schedule_hour ?? defaultSettings.max_schedule_hour,
        });
      } else {
        // If in demo mode, don't try to insert. Just use defaults.
        if (isDemo) {
          setSettings({
            user_id: userId,
            ...defaultSettings
          });
          return;
        }
        // No settings found, create default ones for a real user
        const { data: newData, error: insertError } = await supabase
          .from('user_settings')
          .insert({ user_id: userId, ...defaultSettings })
          .select()
          .single();
        if (insertError) {
          if (insertError.code === '23505') { // unique_violation, handle race condition
            const { data: refetchedSettings, error: refetchError } = await supabase
              .from('user_settings')
              .select('*')
              .eq('user_id', userId)
              .single();
            if (refetchError) throw refetchError;
            setSettings({ ...defaultSettings, ...refetchedSettings });
          } else {
            throw insertError;
          }
        } else {
          setSettings(newData);
        }
      }
    } catch (error: any) {
      console.error('Error fetching user settings:', error);
      showError('Failed to load user settings.');
    } finally {
      setLoading(false);
    }
  }, [userId, isDemo]);

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