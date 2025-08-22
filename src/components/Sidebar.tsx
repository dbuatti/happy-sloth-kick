import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ListTodo, Calendar, Archive, Settings, HelpCircle, LogOut, Sun, Moon, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import { useTheme } from '@/context/ThemeContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarProps } from '@/types/props';

const Sidebar: React.FC<SidebarProps> = ({ isDemo: propIsDemo, demoUserId }) => {
  const { user, signOut } = useAuth();
  const userId = user?.id || demoUserId;
  const isDemo = propIsDemo || user?.id === 'd889323b-350c-4764-9788-6359f85f6142';
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const dailyProgress = useDailyTaskCount(new Date(), userId); // Corrected useDailyTaskCount usage
  const dailyTaskCountLoading = false; // Placeholder, as useDailyTaskCount doesn't return isLoading directly

  const navItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: isDemo ? '/demo/dashboard' : '/dashboard',
      count: null,
    },
    {
      name: 'My Hub',
      icon: ListTodo,
      path: isDemo ? '/demo/my-hub' : '/my-hub',
      count: dailyTaskCountLoading ? null : dailyProgress.totalPendingCount,
    },
    {
      name: 'Calendar',
      icon: Calendar,
      path: isDemo ? '/demo/calendar' : '/calendar',
      count: null,
    },
    {
      name: 'Archive',
      icon: Archive,
      path: isDemo ? '/demo/archive' : '/archive',
      count: null,
    },
  ];

  const settingsItems = [
    { name: 'Settings', icon: Settings, path: '/settings' },
    { name: 'Help', icon: HelpCircle, path: '/help' },
  ];

  const renderNavItems = (items: (typeof navItems[number] | typeof settingsItems[number])[]) => (
    <nav className="grid items-start gap-2">
      {items.map((item) => (
        <Link
          key={item.name}
          to={item.path}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-gray-900 transition-all hover:text-gray-900 dark:text-gray-50 dark:hover:text-gray-50',
            {
              'bg-gray-100 dark:bg-gray-800': location.pathname === item.path,
            }
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.name}
          {'count' in item && item.count !== null && (
            <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
              {item.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="text-lg">My Productivity App</span>
          </Link>
          <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
        <div className="flex-1">
          <div className="grid items-start px-2 text-sm font-medium lg:px-4">
            {renderNavItems(navItems)}
            <div className="mt-4 border-t pt-4 dark:border-gray-700">
              {renderNavItems(settingsItems)}
            </div>
            {user && (
              <Button variant="ghost" className="w-full justify-start mt-4" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-3" /> Log Out
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;