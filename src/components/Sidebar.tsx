import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  Calendar,
  Brain,
  Moon,
  Link as LinkIcon,
  Users,
  Archive,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Command,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { SidebarProps } from '@/types';

const navItems = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'daily-tasks', name: 'Daily Tasks', icon: ListTodo, path: '/daily-tasks' },
  { id: 'task-calendar', name: 'Task Calendar', icon: Calendar, path: '/task-calendar' },
  { id: 'time-block-schedule', name: 'Time Block Schedule', icon: Clock, path: '/time-block-schedule' },
  { id: 'focus-mode', name: 'Focus Mode', icon: Brain, path: '/focus-mode' },
  { id: 'my-hub', name: 'My Hub', icon: Moon, path: '/my-hub' },
  { id: 'dev-space', name: 'Dev Space', icon: LinkIcon, path: '/dev-space' },
  { id: 'people-memory', name: 'People Memory', icon: Users, path: '/people-memory' },
  { id: 'project-balance-tracker', name: 'Project Balance Tracker', icon: LayoutDashboard, path: '/project-balance-tracker' },
  { id: 'sleep-page', name: 'Sleep Tracker', icon: Moon, path: '/sleep-page' },
  { id: 'mindfulness', name: 'Mindfulness Tools', icon: Brain, path: '/mindfulness' },
  { id: 'analytics', name: 'Analytics', icon: LayoutDashboard, path: '/analytics' },
  { id: 'archive', name: 'Archive', icon: Archive, path: '/archive' },
  { id: 'settings', name: 'Settings', icon: Settings, path: '/settings' },
];

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed, isDemo = false, demoUserId, setIsCommandPaletteOpen }) => {
  const { user, signOut } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const location = useLocation();
  const { settings } = useSettings();

  const visiblePages = useMemo(() => {
    if (!settings?.visible_pages) return navItems.map(item => item.id);
    return navItems.filter(item => settings.visible_pages?.includes(item.id)).map(item => item.id);
  }, [settings?.visible_pages]);

  const filteredNavItems = useMemo(() => {
    return navItems.filter(item => visiblePages.includes(item.id));
  }, [visiblePages]);

  const handleSignOut = async () => {
    try {
      await signOut();
      // Redirect to login page or home
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out.');
    }
  };

  return (
    <aside className={`relative h-full flex flex-col bg-gray-100 dark:bg-gray-900 border-r dark:border-gray-800 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between p-4 h-16">
        {!isCollapsed && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">LifeOS</h2>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded-full"
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <TooltipProvider key={item.id}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to={isDemo ? `/demo${item.path}` : item.path}
                  className={`flex items-center p-2 rounded-md text-sm font-medium ${location.pathname === (isDemo ? `/demo${item.path}` : item.path)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                >
                  <item.icon className={`h-5 w-5 ${!isCollapsed ? 'mr-3' : ''}`} />
                  {!isCollapsed && item.name}
                </Link>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">{item.name}</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        ))}
      </nav>
      <div className="p-4 border-t dark:border-gray-800">
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={`w-full flex items-center p-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 ${isCollapsed ? 'justify-center' : ''}`}
                onClick={() => setIsCommandPaletteOpen(true)}
              >
                <Command className={`h-5 w-5 ${!isCollapsed ? 'mr-3' : ''}`} />
                {!isCollapsed && 'Command Palette'}
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Command Palette</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
        {user && (
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={`w-full flex items-center p-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 mt-2 ${isCollapsed ? 'justify-center' : ''}`}
                  onClick={handleSignOut}
                >
                  <LogOut className={`h-5 w-5 ${!isCollapsed ? 'mr-3' : ''}`} />
                  {!isCollapsed && 'Sign Out'}
                </Button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Sign Out</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;