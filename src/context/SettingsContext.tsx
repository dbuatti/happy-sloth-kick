"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface UserSettings {
  user_id: string;
  project_tracker_title: string;
  focused_task_id: string | null;
  dashboard_layout: number[] | null;
  visible_pages: Record<string, boolean> | null; // Changed type here
  schedule_show_focus_tasks_only: boolean;
  future_tasks_days_visible: number;
  meditation_notes: string | null;
  dashboard_panel_sizes: number[] | null;
}

const defaultSettings: UserSettings = {
  user_id: "",
  project_tracker_title: "Project Balance Tracker",
  focused_task_id: null,
  dashboard_layout: null,
  visible_pages: { // Default all pages to visible
    dashboard: true,
    dailyTasks: true,
    schedule: true,
    projects: true,
    mealPlanner: true,
    resonanceGoals: true,
    sleep: true,
    devSpace: true,
    settings: true,
    analytics: true,
    archive: true,
    help: true,
  },
  schedule_show_focus_tasks_only: true,
  future_tasks_days_visible: 7,
  meditation_notes: null,
  dashboard_panel_sizes: [33, 33, 34], // Default layout
};

interface SettingsContextType {
  settings: UserSettings;
  isLoading: boolean;
  error: Error | null;
  updateSetting: (key: keyof UserSettings, value: any) => Promise<void>;
  refetchSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children, userId: propUserId }: { children: ReactNode; userId?: string }) => {
  const { user } = useAuth();
  const currentUserId = propUserId || user?.id;
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchSettings = useCallback(async () => {
    if (!currentUserId) {
      setSettings(defaultSettings);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", currentUserId)
        .single();

      if (error && error.code !== "PGRST116") { // PGRST116 means no rows found
        throw error;
      }

      if (data) {
        setSettings({ ...defaultSettings, ...data, user_id: currentUserId });
      } else {
        // If no settings exist, create default ones
        const { data: newSettings, error: insertError } = await supabase
          .from("user_settings")
          .insert({ ...defaultSettings, user_id: currentUserId })
          .select("*")
          .single();

        if (insertError) {
          throw insertError;
        }
        setSettings({ ...defaultSettings, ...newSettings, user_id: currentUserId });
      }
    } catch (err) {
      console.error("Failed to fetch or create settings:", err);
      setError(err instanceof Error ? err : new Error("An unknown error occurred"));
      setSettings(defaultSettings); // Fallback to default settings on error
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings, refreshKey]);

  const updateSetting = useCallback(async (key: keyof UserSettings, value: any) => {
    if (!currentUserId) {
      toast.error("User not authenticated. Cannot update settings.");
      return;
    }

    // Optimistic update
    setSettings((prev) => ({ ...prev, [key]: value }));

    try {
      const { error } = await supabase
        .from("user_settings")
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq("user_id", currentUserId);

      if (error) {
        throw error;
      }
      toast.success("Setting updated successfully!");
    } catch (err) {
      console.error("Failed to update setting:", err);
      setError(err instanceof Error ? err : new Error("An unknown error occurred"));
      toast.error("Failed to update setting: " + (err instanceof Error ? err.message : "Unknown error"));
      // Revert optimistic update on error
      fetchSettings();
    }
  }, [currentUserId, fetchSettings]);

  const refetchSettings = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const contextValue = {
    settings,
    isLoading,
    error,
    updateSetting,
    refetchSettings,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};