"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      attribute="data-theme"
      enableSystem
      defaultTheme="system"
      themes={[
        "light",
        "dark",
        "adhd-friendly",
        "calm-mist",
        "warm-dawn",
        "gentle-night",
        "cosmic-dusk",
        "focus-flow"
      ]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}