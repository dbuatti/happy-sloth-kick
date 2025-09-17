import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';


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
}

const defaultSettings: Omit<UserSettings, 'user_id'> = {
  project_tracker_title: 'Project Balance Tracker',
  focused_task_id: null,
  future_tasks_days_visible: 7,
  meditation_notes: null,
  dashboard_layout: null,
  visible_pages: {
    dashboard: true,
    dailyTasks: true,
    schedule: true,
    projects: true,
    sleep: true,
    devSpace: true,
    settings: true,
    analytics: true,
    archive: true,
    help: true,
  },
  schedule_show_focus_tasks_only: true,
  dashboard_panel_sizes: [66, 34], // Default sizes for the two main dashboard panels
};

export const useUserSettings = (props?: { userId?: string }) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;
  const isDemo = !!props?.userId;
  const queryClient = useQueryClient();

  const { data: settings = null, isLoading: loading, error } = useQuery<UserSettings | null, Error>({
    queryKey: ['userSettings', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
        throw error;
      }

      if (data) {
        return {
          user_id: userId,
          ...defaultSettings,
          ...data,
          dashboard_layout: { ...defaultSettings.dashboard_layout, ...(data.dashboard_layout || {}) },
          visible_pages: { ...defaultSettings.visible_pages, ...(data.visible_pages || {}) }, // Merge visible_pages
          dashboard_panel_sizes: data.dashboard_panel_sizes || defaultSettings.dashboard_panel_sizes,
        };
      } else {
        // If in demo mode, don't try to insert. Just use defaults.
        if (isDemo) {
          return {
            user_id: userId,
            ...defaultSettings
          };
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
            return { ...defaultSettings, ...refetchedSettings, user_id: userId };
          } else {
            throw insertError;
          }
        } else {
          return newData;
        }
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (error) {
      console.error('Error fetching user settings:', error);
      showError('Failed to load user settings.');
    }
  }, [error]);

  const updateSettingsMutation = useMutation<boolean, Error, Partial<Omit<UserSettings, 'user_id'>>>({
    mutationFn: async (updates) => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      showSuccess('Settings updated!');
      queryClient.invalidateQueries({ queryKey: ['userSettings', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData', userId] }); // Invalidate dashboard data if layout changes
    },
    onError: (err) => {
      console.error('Error updating settings:', err);
      showError('Failed to update settings.');
    },
  });

  return { settings, loading, updateSettings: updateSettingsMutation.mutateAsync };
};