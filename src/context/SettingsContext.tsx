import React, { createContext, useContext } from 'react';
import { useUserSettings, UserSettings } from '@/hooks/useUserSettings';

interface SettingsContextType {
  settings: UserSettings | null;
  loading: boolean;
  updateSettings: (updates: Partial<Omit<UserSettings, 'user_id'>>) => Promise<boolean>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const userSettings = useUserSettings();
  return (
    <SettingsContext.Provider value={userSettings}>
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