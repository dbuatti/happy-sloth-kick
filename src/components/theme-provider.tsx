"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      attribute="class"
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
        "focus-flow",
        "retro-wave",
        "sepia-dusk",
        "vibrant-flow",
        "honeycomb",
        "forest-calm",
        "rainbow-whimsy" // Added the new theme
      ]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}