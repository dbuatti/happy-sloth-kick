import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Monitor, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator"; // Import Separator

const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Theme selector" className="h-7 w-7">
        {/* Placeholder icon */}
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-palette"><circle cx="12" cy="12" r="10"/><path d="M12 7V2"/><path d="M12 22v-5"/><path d="M17 12h5"/><path d="M2 12h5"/><path d="M19.07 4.93l-1.41 1.41"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M4.93 19.07l1.41-1.41"/></svg>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Theme selector" className="h-7 w-7">
          {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeSelector;