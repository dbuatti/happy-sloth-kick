import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const DarkModeToggle = () => {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false); // Track actual mode

  useEffect(() => {
    setMounted(true);
    // Initial check for dark mode based on the html element's class
    setIsDarkMode(document.documentElement.classList.contains('dark'));

    // Observe changes to the class attribute on the html element
    // This ensures the toggle icon updates correctly if the theme changes via system preference or other means
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="Toggle dark mode" />;
  }

  const handleToggle = () => {
    // Toggle between 'light' and 'dark' modes.
    // next-themes will apply this mode to the currently active theme (system, light, dark, or custom).
    setTheme(isDarkMode ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label="Toggle dark mode"
    >
      {isDarkMode ? ( // Use the derived `isDarkMode` state for the icon
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
};

export default DarkModeToggle;