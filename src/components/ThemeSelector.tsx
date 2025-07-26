import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Monitor, Sun, Moon, Palette } from "lucide-react";
import { themes, ThemeName } from "@/lib/themes";
import { useState, useEffect } from "react";

const ThemeSelector = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
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

  // Get the base theme (without -dark suffix)
  const getBaseTheme = (currentTheme: string | undefined): ThemeName | 'light' | 'dark' | 'system' => {
    if (!currentTheme) return 'light';
    
    // Handle system theme
    if (currentTheme === 'system') return 'system';
    
    // Handle light/dark themes
    if (currentTheme === 'light' || currentTheme === 'dark') return currentTheme;
    
    // Remove -dark suffix if present
    if (currentTheme.endsWith('-dark')) {
      const baseTheme = currentTheme.replace('-dark', '');
      if (Object.keys(themes).includes(baseTheme)) {
        return baseTheme as ThemeName;
      }
    }
    
    // Check if it's a custom theme
    if (Object.keys(themes).includes(currentTheme)) {
      return currentTheme as ThemeName;
    }
    
    return 'light';
  };

  const baseTheme = getBaseTheme(theme);

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
            className={baseTheme === themeName ? 'font-bold' : ''}
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