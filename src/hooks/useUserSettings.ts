import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { UserSettings, Json } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

const defaultSettings: Omit<UserSettings, 'user_id'> = {
  project_tracker_title: 'Project Balance Tracker',
  focused_task_id: null,
  meditation_notes: null,
  dashboard_layout: null,
  visible_pages: null,
  schedule_show_focus_tasks_only: true,
  future_tasks_days_visible: 7,
};

export const useUserSettings = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const invalidateSettingsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['userSettings', userId] });
  }, [queryClient, userId]);

  const { data: settings, isLoading, error } = useQuery<UserSettings, Error>({
    queryKey: ['userSettings', userId],
    queryFn: async () => {
      if (!userId) return { user_id: '', ...defaultSettings }; // Return default settings if no user
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') { // No rows found
        // Insert default settings if none exist
        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert({ user_id: userId, ...defaultSettings })
          .select('*')
          .single();
        if (insertError) throw insertError;
        return newSettings;
      }
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !authLoading,
    initialData: { user_id: userId || '', ...defaultSettings }, // Provide initial data to prevent undefined
  });

  const updateSettingsMutation = useMutation<UserSettings, Error, Partial<UserSettings>, unknown>({
    mutationFn: async (updates) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateSettingsQueries();
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettingsMutation.mutateAsync,
  };
};