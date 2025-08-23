import { createContext, useContext, ReactNode } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { UserSettings } from '@/types';

interface SettingsContextType {
  settings: UserSettings | undefined;
  isLoading: boolean;
  error: Error | null;
  updateSettings: (updates: Partial<Omit<UserSettings, 'user_id'>>) => Promise<boolean>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { userSettings, isLoading, error, updateSettings } = useUserSettings();

  return (
    <SettingsContext.Provider value={{ settings: userSettings, isLoading, error, updateSettings }}>
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