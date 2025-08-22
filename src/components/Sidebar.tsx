import React from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  Calendar,
  Archive,
  Settings,
  HelpCircle,
  LogOut,
  Moon,
  Sun,
  Menu,
  Focus,
  Bed,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { SidebarProps } from '@/types/props';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/useIsMobile';

const Sidebar: React.FC<SidebarProps> = ({ isDemo }) => {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();

  const navItems = [
    { to: isDemo ? '/demo/dashboard' : '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: isDemo ? '/demo/my-hub' : '/my-hub', icon: ListTodo, label: 'My Hub' },
    { to: isDemo ? '/demo/calendar' : '/calendar', icon: Calendar, label: 'Calendar' },
    { to: isDemo ? '/demo/focus-mode' : '/focus-mode', icon: Focus, label: 'Focus Mode' },
    { to: isDemo ? '/demo/sleep' : '/sleep', icon: Bed, label: 'Sleep' },
    { to: isDemo ? '/demo/archive' : '/archive', icon: Archive, label: 'Archive' },
    { to: '/settings', icon: Settings, label: 'Settings' },
    { to: '/help', icon: HelpCircle, label: 'Help' },
  ];

  const renderNavItems = () => (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {navItems.map((item) => (
        <TooltipProvider key={item.to}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to={item.to}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </nav>
  );

  const renderThemeToggle = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="mt-auto"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Toggle Theme</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const renderLogoutButton = () => (
    user && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="mt-2"
              onClick={() => signOut()}
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Log Out</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Log Out</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  );

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="fixed top-4 left-4 z-40 sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <Link to="/" className="flex items-center gap-2 font-semibold">
                <span>My Productivity App</span>
              </Link>
            </div>
            <div className="flex-1">
              {renderNavItems()}
            </div>
            <div className="mt-auto flex flex-col items-center p-4">
              {renderThemeToggle()}
              {renderLogoutButton()}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex md:w-[220px] lg:w-[280px]">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span>My Productivity App</span>
        </Link>
      </div>
      <div className="flex-1">
        {renderNavItems()}
      </div>
      <div className="mt-auto flex flex-col items-center p-4">
        {renderThemeToggle()}
        {renderLogoutButton()}
      </div>
    </aside>
  );
};

export default Sidebar;