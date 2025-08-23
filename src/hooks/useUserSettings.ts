import { useAuth } from '@/context/AuthContext';
import { UserSettings } from '@/types'; // Removed Json as it's not directly used here
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserSettings = (userId?: string) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = userId || user?.id;
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery<UserSettings, Error>({
    queryKey: ['userSettings', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return { user_id: '', project_tracker_title: 'Project Balance Tracker', future_tasks_days_visible: 7, schedule_show_focus_tasks_only: true }; // Default settings
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', currentUserId)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found
      return data || { user_id: currentUserId, project_tracker_title: 'Project Balance Tracker', future_tasks_days_visible: 7, schedule_show_focus_tasks_only: true };
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
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['userSettings', currentUserId], data);
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettingsMutation.mutateAsync,
  };
};