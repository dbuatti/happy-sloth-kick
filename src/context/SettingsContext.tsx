"use client";

import React, { createContext, useContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface UserSettings {
  user_id: string;
  project_tracker_title: string;
  focused_task_id: string | null;
  dashboard_layout: any | null; // JSONB type
  visible_pages: any | null; // JSONB type
  schedule_show_focus_tasks_only: boolean;
  future_tasks_days_visible: number;
  meditation_notes: string | null;
  dashboard_panel_sizes: any | null; // JSONB type
  pomodoro_work_duration: number;
  pomodoro_short_break_duration: number;
  pomodoro_long_break_duration: number;
  pomodoro_rounds_before_long_break: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  user_id: '',
  project_tracker_title: 'Project Balance Tracker',
  focused_task_id: null,
  dashboard_layout: null,
  visible_pages: null,
  schedule_show_focus_tasks_only: true,
  future_tasks_days_visible: 7,
  meditation_notes: null,
  dashboard_panel_sizes: null,
  pomodoro_work_duration: 25,
  pomodoro_short_break_duration: 5,
  pomodoro_long_break_duration: 15,
  pomodoro_rounds_before_long_break: 4,
};

interface SettingsContextType {
  settings: UserSettings;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  updateSettings: (updates: Partial<UserSettings>) => Promise<boolean>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: React.ReactNode;
  userId?: string; // Allow userId to be passed for demo mode
}

// The actual hook that fetches and manages settings
export const useSettings = ({ userId: propUserId }: { userId?: string } = {}) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = propUserId ?? user?.id;
  const queryClient = useQueryClient();

  const { data: settings, isLoading, isError, error } = useQuery<UserSettings, Error>({
    queryKey: ['user_settings', currentUserId],
    queryFn: async () => {
      if (!currentUserId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', currentUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        return { ...DEFAULT_SETTINGS, ...data };
      } else {
        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert({ ...DEFAULT_SETTINGS, user_id: currentUserId })
          .select()
          .single();

        if (insertError) throw insertError;
        showSuccess('Default settings created!');
        return newSettings;
      }
    },
    enabled: !!currentUserId && !authLoading,
    staleTime: 5 * 60 * 1000,
  });

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    if (!currentUserId) {
      showError('User not authenticated.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', currentUserId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['user_settings', currentUserId] });
      showSuccess('Settings updated!');
      return true;
    } catch (err: any) {
      showError(`Failed to update settings: ${err.message}`);
      console.error('Error updating settings:', err);
      return false;
    }
  }, [currentUserId, queryClient]);

  return {
    settings: settings || DEFAULT_SETTINGS,
    isLoading,
    isError,
    error,
    updateSettings,
  };
};

// The provider component
export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children, userId }) => {
  const settingsHookValue = useSettings({ userId });

  return (
    <SettingsContext.Provider value={settingsHookValue}>
      {children}
    </SettingsContext.Provider>
  );
};

// Consumer hook for components that need settings
export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
};