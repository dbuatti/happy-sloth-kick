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
        "light", // Added back
        "dark",  // Added back
        "ocean-breeze",
        "sunset-glow",
        "forest-deep",
        "midnight-serenity",
        "desert-bloom"
      ]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}