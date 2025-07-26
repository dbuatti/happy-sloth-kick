import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { themes } from "@/lib/themes"; // Import themes to check for custom themes

const DarkModeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="Toggle dark mode" />;
  }

  const isCustomThemeActive = theme && Object.keys(themes).includes(theme);

  const handleToggle = () => {
    if (isCustomThemeActive) {
      // If a custom theme is active, toggle the 'dark' class on the html element
      // This bypasses next-themes's default behavior of overriding custom themes
      // when setTheme('light') or setTheme('dark') is called.
      document.documentElement.classList.toggle('dark');
    } else {
      // If it's a default theme (system, light, dark), use next-themes's setTheme
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label="Toggle dark mode"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
};

export default DarkModeToggle;