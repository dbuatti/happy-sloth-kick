import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { UserSettings, Json } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

const defaultSettings: Omit<UserSettings, 'user_id'> = {
  project_tracker_title: 'Project Balance Tracker',
  focused_task_id: null,
  meditation_notes: null,
  dashboard_layout: {
    lg: [
      { i: 'welcome', x: 0, y: 0, w: 6, h: 2 },
      { i: 'daily-schedule', x: 6, y: 0, w: 6, h: 2 },
      { i: 'weekly-focus', x: 0, y: 2, w: 12, h: 1 },
      { i: 'quick-links', x: 0, y: 3, w: 6, h: 2 },
      { i: 'people-memory', x: 6, y: 3, w: 6, h: 2 },
    ],
    md: [
      { i: 'welcome', x: 0, y: 0, w: 6, h: 2 },
      { i: 'daily-schedule', x: 6, y: 0, w: 6, h: 2 },
      { i: 'weekly-focus', x: 0, y: 2, w: 12, h: 1 },
      { i: 'quick-links', x: 0, y: 3, w: 6, h: 2 },
      { i: 'people-memory', x: 6, y: 3, w: 6, h: 2 },
    ],
    sm: [
      { i: 'welcome', x: 0, y: 0, w: 4, h: 2 },
      { i: 'daily-schedule', x: 0, y: 2, w: 4, h: 2 },
      { i: 'weekly-focus', x: 0, y: 4, w: 4, h: 1 },
      { i: 'quick-links', x: 0, y: 5, w: 4, h: 2 },
      { i: 'people-memory', x: 0, y: 7, w: 4, h: 2 },
    ],
  },
  dashboard_panel_sizes: [33, 67], // Default split for dashboard panels
  visible_pages: null,
  schedule_show_focus_tasks_only: true,
  future_tasks_days_visible: 7,
};

const fetchUserSettings = async (userId: string): Promise<UserSettings | null> => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
    throw error;
  }

  if (!data) {
    return null;
  }

  // Merge with default settings to ensure all properties are present
  return {
    user_id: userId,
    ...defaultSettings,
    ...data,
    dashboard_layout: { ...defaultSettings.dashboard_layout, ...(data.dashboard_layout as Json || {}) },
    dashboard_panel_sizes: (data.dashboard_layout as any)?.dashboard_panel_sizes || defaultSettings.dashboard_panel_sizes, // Ensure this is correctly typed
  };
};

const updateUserSettings = async (userId: string, updates: Partial<Omit<UserSettings, 'user_id'>>): Promise<UserSettings> => {
  const { data, error } = await supabase
    .from('user_settings')
    .update(updates)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data as UserSettings;
};

const insertUserSettings = async (settings: UserSettings): Promise<UserSettings> => {
  const { data, error } = await supabase
    .from('user_settings')
    .insert(settings)
    .select('*')
    .single();
  if (error) throw error;
  return data as UserSettings;
};

export const useUserSettings = () => {
  const { userId, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery<UserSettings | null, Error>({
    queryKey: ['userSettings', userId],
    queryFn: async () => {
      if (!userId) return null;
      const userSettings = await fetchUserSettings(userId);
      if (!userSettings) {
        // If no settings exist, create default ones
        const newSettings = { ...defaultSettings, user_id: userId };
        return insertUserSettings(newSettings);
      }
      return userSettings;
    },
    enabled: !!userId && !authLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });

  const updateSettingsMutation = useMutation<UserSettings, Error, Partial<Omit<UserSettings, 'user_id'>>>({
    mutationFn: async (updates) => {
      if (!userId) throw new Error('User not authenticated.');
      return updateUserSettings(userId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings', userId] });
    },
  });

  return {
    settings,
    loading: isLoading || authLoading,
    error,
    updateSettings: updateSettingsMutation.mutateAsync,
  };
};