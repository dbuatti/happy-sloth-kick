import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Settings as SettingsIcon, HelpCircle, Archive as ArchiveIcon, Timer, LayoutGrid, CalendarClock, Menu } from 'lucide-react';
import ThemeSelector from './ThemeSelector';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useUI } from '@/context/UIContext';

interface SidebarProps {
  children: React.ReactNode;
}

const navItems = [
  { name: 'Daily Tasks', path: '/', icon: Home },
  { name: 'Focus Mode', path: '/focus', icon: Timer },
  { name: 'Project Balance', path: '/projects', icon: LayoutGrid },
  { name: 'Time Blocks', path: '/schedule', icon: CalendarClock },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Archive', path: '/archive', icon: ArchiveIcon },
  { name: 'Settings', path: '/settings', icon: SettingsIcon },
  { name: 'Help', path: '/help', icon: HelpCircle },
];

const NavigationLinks = ({ onLinkClick }: { onLinkClick?: () => void }) => {
  const location = useLocation();
  return (
    <nav className="flex-1 px-4 space-y-2">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200",
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary dark:hover:text-primary-foreground'
            )}
            onClick={onLinkClick}
          >
            <Icon className="h-5 w-5" />
            <span className="font-medium">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { isFocusModeActive } = useUI();

  if (isFocusModeActive) {
    return <div className="flex-1 flex flex-col">{children}</div>;
  }

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between p-4 bg-card shadow-md">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-card flex flex-col">
              <div className="p-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">TaskMaster</h1>
              </div>
              <NavigationLinks onLinkClick={() => setIsSheetOpen(false)} />
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  &copy; {new Date().getFullYear()} TaskMaster
                </p>
                <div className="flex items-center space-x-2">
                  <ThemeSelector />
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">TaskMaster</h1>
          <div className="flex items-center space-x-2">
            <ThemeSelector />
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="w-64 bg-card shadow-lg h-screen flex flex-col">
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">TaskMaster</h1>
        </div>
        <NavigationLinks />
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} TaskMaster
          </p>
          <div className="flex items-center space-x-2">
            <ThemeSelector />
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
};

export default Sidebar;