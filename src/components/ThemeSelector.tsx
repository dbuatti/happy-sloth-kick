import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Monitor, Palette, Sun, Moon } from "lucide-react";
import { themes } from "@/lib/themes";
import { useState, useEffect } from "react";

const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Add console log here to see what theme is being set
  useEffect(() => {
    if (mounted) {
      console.log("Current theme from next-themes:", theme);
    }
  }, [theme, mounted]);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Theme selector" className="h-7 w-7">
        <Palette className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Theme selector" className="h-7 w-7">
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('system')} className={theme === 'system' ? 'font-bold' : ''}>
          <Monitor className="h-3.5 w-3.5 mr-2" />
          System
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => setTheme('light')} className={theme === 'light' ? 'font-bold' : ''}>
          <Sun className="h-3.5 w-3.5 mr-2" />
          Light
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setTheme('dark')} className={theme === 'dark' ? 'font-bold' : ''}>
          <Moon className="h-3.5 w-3.5 mr-2" />
          Dark
        </DropdownMenuItem>

        <div className="my-1 h-px bg-muted" />
        
        {Object.entries(themes).map(([themeName, themeData]) => (
          <DropdownMenuItem 
            key={themeName} 
            onClick={() => setTheme(themeName)}
            className={theme === themeName ? 'font-bold' : ''}
          >
            <Palette className="h-3.5 w-3.5 mr-2" />
            {themeData.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeSelector;