import { useAuth } from '@/context/AuthContext';
import { UserSettings } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserSettings = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: userSettings, isLoading, error } = useQuery<UserSettings, Error>({
    queryKey: ['userSettings', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const updateSettingsMutation = useMutation<UserSettings, Error, Partial<Omit<UserSettings, 'user_id'>>, unknown>({
    mutationFn: async (updates) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(['userSettings', userId], updatedSettings);
    },
  });

  const updateSettings = async (updates: Partial<Omit<UserSettings, 'user_id'>>) => {
    try {
      await updateSettingsMutation.mutateAsync(updates);
      return true;
    } catch (err) {
      console.error('Error updating user settings:', err);
      return false;
    }
  };

  return {
    userSettings,
    isLoading,
    error,
    updateSettings,
  };
};