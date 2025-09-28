"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface CommandPaletteContextType {
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (isOpen: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextType | undefined>(undefined);

export const CommandPaletteProvider = ({ children }: { children: ReactNode }) => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const openCommandPalette = () => setIsCommandPaletteOpen(true);
  const closeCommandPalette = () => setIsCommandPaletteOpen(false);
  const toggleCommandPalette = () => setIsCommandPaletteOpen((prev) => !prev);

  return (
    <CommandPaletteContext.Provider
      value={{
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        openCommandPalette,
        closeCommandPalette,
        toggleCommandPalette,
      }}
    >
      {children}
    </CommandPaletteContext.Provider>
  );
};

export const useCommandPalette = () => {
  const context = useContext(CommandPaletteContext);
  if (context === undefined) {
    throw new Error("useCommandPalette must be used within a CommandPaletteProvider");
  }
  return context;
};