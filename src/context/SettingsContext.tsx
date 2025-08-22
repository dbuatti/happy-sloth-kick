import React, { createContext, useContext, ReactNode } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { UserSettings } from '@/types';
import { UseMutateAsyncFunction } from '@tanstack/react-query';

interface SettingsContextType {
  settings: UserSettings | null | undefined;
  loading: boolean;
  updateSettings: UseMutateAsyncFunction<any, Error, Partial<Omit<UserSettings, "user_id">>, unknown>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings, loading, updateSettings } = useUserSettings();

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
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