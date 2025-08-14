import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export interface UserSettings {
  user_id: string;
  dashboard_layout?: {
    dailyBriefingVisible?: boolean;
    dailyScheduleVisible?: boolean;
    weeklyFocusVisible?: boolean;
    peopleMemoryVisible?: boolean;
    meditationNotesVisible?: boolean;
    [key: string]: boolean | undefined;
  };
  dashboard_panel_sizes?: number[] | null; // Added null to allow for initial null state
  meditation_notes?: string;
  show_future_tasks_for_days?: number | null; // Added this property
  project_tracker_title?: string; // Added for useProjects
  visible_pages?: { [key: string]: boolean }; // Added for PageToggleSettings
  schedule_show_focus_tasks_only?: boolean; // Added for ScheduleSettings
  // Add other settings as needed
}

interface SettingsContextType {
  settings: UserSettings | null;
  updateSettings: (updates: Partial<Omit<UserSettings, 'user_id'>>) => Promise<boolean>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error fetching user settings:', error);
      }
      setSettings(data || null);
      setLoading(false);
    };

    fetchSettings();

    const settingsSubscription = supabase
      .channel('public:user_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_settings' }, () => { // Removed unused payload
        fetchSettings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(settingsSubscription);
    };
  }, [user?.id]);

  const updateSettings = async (updates: Partial<Omit<UserSettings, 'user_id'>>) => {
    if (!user?.id) return false;
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, ...updates }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      return false;
    }
    return true;
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};