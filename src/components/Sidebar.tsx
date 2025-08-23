import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, ListTodo, Calendar, Brain, Moon, Link as LinkIcon, Users, Archive, Settings, LogOut, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import { useSettings } from '@/context/SettingsContext';
import { useTasks } from '@/hooks/useTasks';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isDemo?: boolean;
  demoUserId?: string;
  setIsCommandPaletteOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed, isDemo = false, demoUserId, setIsCommandPaletteOpen }) => {
  const { user, signOut } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const location = useLocation();
  const { tasks } = useTasks({ userId: currentUserId! }); // Fetch tasks to pass to useDailyTaskCount
  const { dailyTaskCount, isLoading: countLoading } = useDailyTaskCount(tasks);
  const { settings } = useSettings();

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: isDemo ? '/demo/dashboard' : '/' },
    { id: 'tasks', name: 'Tasks', icon: ListTodo, path: isDemo ? '/demo/daily-tasks' : '/tasks' },
    { id: 'schedule', name: 'Schedule', icon: Calendar, path: isDemo ? '/demo/schedule' : '/schedule' },
    { id: 'focus-mode', name: 'Focus Mode', icon: Brain, path: isDemo ? '/demo/focus' : '/focus-mode' },
    { id: 'sleep-tracker', name: 'Sleep Tracker', icon: Moon, path: isDemo ? '/demo/sleep-tracker' : '/sleep-tracker' },
    { id: 'quick-links', name: 'Quick Links', icon: LinkIcon, path: isDemo ? '/demo/quick-links' : '/quick-links' },
    { id: 'people-memory', name: 'People Memory', icon: Users, path: isDemo ? '/demo/people-memory' : '/people-memory' },
    { id: 'archive', name: 'Archive', icon: Archive, path: isDemo ? '/demo/archive' : '/archive' },
    { id: 'my-hub', name: 'My Hub', icon: HelpCircle, path: isDemo ? '/demo/my-hub' : '/my-hub' },
  ];

  const visiblePages = useMemo(() => {
    if (!settings?.visible_pages) return navItems.map(item => item.id);
    return (settings.visible_pages as string[]);
  }, [settings?.visible_pages, navItems]);

  const filteredNavItems = navItems.filter(item => visiblePages.includes(item.id));

  return (
    <div
      className={cn(
        "group flex flex-col h-full bg-gray-100 text-gray-800 transition-all duration-300 ease-in-out border-r",
        isCollapsed ? "w-[50px]" : "w-[200px]"
      )}
    >
      <div className="flex items-center justify-center h-16 border-b">
        <Link to={isDemo ? '/demo' : '/'} className="flex items-center justify-center h-full w-full">
          <span className={cn("font-bold text-xl transition-opacity duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
            Happy Sloth
          </span>
          <span className={cn("font-bold text-xl absolute transition-opacity duration-300", isCollapsed ? "opacity-100 w-auto" : "opacity-0 w-0")}>
            HS
          </span>
        </Link>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-200",
              location.pathname === item.path ? "bg-blue-500 text-white hover:bg-blue-600" : "text-gray-700",
              isCollapsed ? "justify-center" : ""
            )}
          >
            <item.icon className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
            <span className={cn("transition-opacity duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
              {item.name}
            </span>
            {item.id === 'tasks' && !countLoading && dailyTaskCount > 0 && (
              <span className={cn(
                "ml-auto px-2 py-0.5 text-xs font-bold rounded-full",
                location.pathname === item.path ? "bg-white text-blue-500" : "bg-blue-500 text-white",
                isCollapsed ? "absolute top-1 right-1" : ""
              )}>
                {dailyTaskCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="border-t p-2">
        <Button
          variant="ghost"
          className={cn("w-full justify-start", isCollapsed ? "justify-center" : "")}
          onClick={() => setIsCommandPaletteOpen(true)}
        >
          <LayoutDashboard className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
          <span className={cn("transition-opacity duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
            Command Palette
          </span>
        </Button>
        <Link
          to={isDemo ? '/demo/settings' : '/settings'}
          className={cn(
            "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-200",
            location.pathname === (isDemo ? '/demo/settings' : '/settings') ? "bg-blue-500 text-white hover:bg-blue-600" : "text-gray-700",
            isCollapsed ? "justify-center" : ""
          )}
        >
          <Settings className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
          <span className={cn("transition-opacity duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
            Settings
          </span>
        </Link>
        <Button
          variant="ghost"
          className={cn("w-full justify-start", isCollapsed ? "justify-center" : "")}
          onClick={signOut}
        >
          <LogOut className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
          <span className={cn("transition-opacity duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
            Log Out
          </span>
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;