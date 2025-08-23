import React, { createContext, useContext, ReactNode } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { UserSettings } from '@/types';

interface SettingsContextType {
  settings: UserSettings | undefined;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  loading: boolean;
  error: Error | null;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode; isDemo?: boolean; demoUserId?: string }> = ({ children, isDemo, demoUserId }) => {
  const { userSettings, isLoading, error, updateSettings } = useUserSettings(isDemo ? demoUserId : undefined);

  const value = {
    settings: userSettings,
    updateSettings,
    loading: isLoading,
    error,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};