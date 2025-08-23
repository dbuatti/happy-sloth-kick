import React, { createContext, useContext, ReactNode } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { UserSettings } from '@/types';

interface SettingsContextType {
  settings: UserSettings | undefined;
  isLoading: boolean;
  error: Error | null;
  updateSettings: (updates: Partial<UserSettings>) => Promise<UserSettings | undefined>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings, isLoading, error, updateSettings } = useUserSettings();

  return (
    <SettingsContext.Provider value={{ settings, isLoading, error, updateSettings }}>
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