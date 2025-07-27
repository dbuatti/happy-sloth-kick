import React, { createContext, useContext, useState, useEffect } from 'react';

interface UIContextType {
  isFocusModeActive: boolean;
  setIsFocusModeActive: (isActive: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);

  return (
    <UIContext.Provider value={{ isFocusModeActive, setIsFocusModeActive }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};