import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Monitor, Sun, Moon, Palette } from "lucide-react";
import { themes, ThemeName } from "@/lib/themes";
import { useState, useEffect } from "react";

type AvailableTheme = ThemeName | 'light' | 'dark' | 'system';

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

  const getThemeIcon = (themeName: AvailableTheme) => {
    if (themeName === 'light') return <Sun className="h-4 w-4 mr-2" />;
    if (themeName === 'dark') return <Moon className="h-4 w-4 mr-2" />;
    if (themeName === 'system') return <Monitor className="h-4 w-4 mr-2" />;
    return <Palette className="h-4 w-4 mr-2" />;
  };

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
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="h-4 w-4 mr-2" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="h-4 w-4 mr-2" />
          Dark
        </DropdownMenuItem>
        
        <div className="my-1 h-px bg-muted" />
        
        {Object.entries(themes).map(([themeName, themeData]) => (
          <DropdownMenuItem 
            key={themeName} 
            onClick={() => setTheme(themeName as ThemeName)}
          >
            {getThemeIcon(themeName as AvailableTheme)}
            {themeData.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeSelector;