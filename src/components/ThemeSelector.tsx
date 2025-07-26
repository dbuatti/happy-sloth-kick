import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Monitor, Sun, Moon, Palette } from "lucide-react";
import { themes, ThemeName } from "@/lib/themes";
import { useState, useEffect } from "react";

const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Theme selector">
        <Palette className="h-5 w-5" />
      </Button>
    );
  }

  // Determine if we're in a custom theme
  const isCustomTheme = theme && 
    ['adhd-friendly', 'calm-mist', 'warm-dawn', 'gentle-night', 'cosmic-dusk', 'focus-flow'].includes(theme);

  // Get the base theme name (without -dark suffix)
  const baseTheme = isCustomTheme ? theme : 'light';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Theme selector">
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="h-4 w-4 mr-2" />
          System
        </DropdownMenuItem>
        
        <div className="my-1 h-px bg-muted" />
        
        {Object.entries(themes).map(([themeName, themeData]) => (
          <DropdownMenuItem 
            key={themeName} 
            onClick={() => setTheme(themeName as ThemeName)}
            className={isCustomTheme && themeName === baseTheme ? 'font-bold' : ''}
          >
            <Palette className="h-4 w-4 mr-2" />
            {themeData.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeSelector;