import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  fetchUserSettings,
  updateUserSettings,
} from '@/integrations/supabase/api';
import { UserSettings } from '@/types/task';
import { showError, showSuccess } from '@/utils/toast';
import { SettingsContextType } from '@/types/props';

interface UseSettingsProps {
  userId?: string | null;
}

export const useSettings = (props?: UseSettingsProps): SettingsContextType => {
  const { user } = useAuth();
  const activeUserId = props?.userId || user?.id;
  const queryClient = useQueryClient();

  const settingsQueryKey = ['userSettings', activeUserId];

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery<UserSettings | null, Error>({
    queryKey: settingsQueryKey,
    queryFn: () => fetchUserSettings(activeUserId!),
    enabled: !!activeUserId,
    initialData: {
      user_id: activeUserId || '',
      project_tracker_title: 'Project Balance Tracker',
      focused_task_id: null,
      meditation_notes: null,
      dashboard_layout: null,
      visible_pages: null,
      schedule_show_focus_tasks_only: true,
      future_tasks_days_visible: 7,
    },
  });

  const updateSettingsCallback = useCallback(
    async (updates: Partial<UserSettings>): Promise<UserSettings | null> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return null;
      }
      try {
        const updated = await updateUserSettings(activeUserId, updates);
        if (updated) {
          queryClient.invalidateQueries({ queryKey: settingsQueryKey });
          showSuccess('Settings updated successfully!');
          return updated;
        }
        return null;
      } catch (err: any) {
        showError('Failed to update settings.');
        return null;
      }
    },
    [activeUserId, queryClient, settingsQueryKey]
  );

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettingsCallback,
  };
};