import { useAuth } from '@/context/AuthContext';
import { UserSettings, Json } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserSettings = (userId?: string) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = userId || user?.id;
  const queryClient = useQueryClient();

  const { data: userSettings, isLoading, error } = useQuery<UserSettings, Error>({
    queryKey: ['userSettings', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return { user_id: '', project_tracker_title: 'Project Balance Tracker', future_tasks_days_visible: 7, schedule_show_focus_tasks_only: true }; // Default settings
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', currentUserId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine for initial load
        throw error;
      }

      // If no settings exist, create default ones
      if (!data) {
        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert({ user_id: currentUserId, project_tracker_title: 'Project Balance Tracker', future_tasks_days_visible: 7, schedule_show_focus_tasks_only: true })
          .select('*')
          .single();

        if (insertError) throw insertError;
        return newSettings;
      }

      return data;
    },
    enabled: !!currentUserId && !authLoading,
  });

  const updateSettingsMutation = useMutation<UserSettings, Error, Partial<UserSettings>, unknown>({
    mutationFn: async (updates) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', currentUserId)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['userSettings', currentUserId], data);
    },
  });

  return {
    userSettings,
    isLoading,
    error,
    updateSettings: updateSettingsMutation.mutateAsync,
  };
};