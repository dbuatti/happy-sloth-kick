import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, ListTodo, Brain, Moon, Link as LinkIcon, Users, Archive, Settings, LogOut, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { SidebarProps } from '@/types';
import { toast } from 'react-hot-toast';

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed, isDemo = false, demoUserId, setIsCommandPaletteOpen }) => {
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();

  const navItems = useMemo(() => [
    { id: 'dashboard', name: 'Dashboard', icon: Brain, path: '/', isVisible: settings?.visible_pages?.dashboard ?? true },
    { id: 'daily-tasks', name: 'Daily Tasks', icon: ListTodo, path: '/daily-tasks', isVisible: settings?.visible_pages?.daily_tasks ?? true },
    { id: 'task-calendar', name: 'Task Calendar', icon: Calendar, path: '/task-calendar', isVisible: settings?.visible_pages?.task_calendar ?? true },
    { id: 'time-block-schedule', name: 'Time Block Schedule', icon: Clock, path: '/time-block-schedule', isVisible: settings?.visible_pages?.time_block_schedule ?? true },
    { id: 'focus-mode', name: 'Focus Mode', icon: Brain, path: '/focus-mode', isVisible: settings?.visible_pages?.focus_mode ?? true },
    { id: 'sleep-tracker', name: 'Sleep Tracker', icon: Moon, path: '/sleep-tracker', isVisible: settings?.visible_pages?.sleep_tracker ?? true },
    { id: 'dev-space', name: 'Dev Space', icon: LinkIcon, path: '/dev-space', isVisible: settings?.visible_pages?.dev_space ?? true },
    { id: 'people-memory', name: 'People Memory', icon: Users, path: '/people-memory', isVisible: settings?.visible_pages?.people_memory ?? true },
    { id: 'archive', name: 'Archive', icon: Archive, path: '/archive', isVisible: settings?.visible_pages?.archive ?? true },
  ], [settings?.visible_pages]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully!');
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out.');
    }
  };

  return (
    <TooltipProvider>
      <aside className={`flex flex-col h-full bg-gray-800 text-white transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex items-center justify-center h-16 border-b border-gray-700">
          {!isCollapsed && <span className="text-2xl font-bold">My App</span>}
          <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="ml-auto mr-2">
            {isCollapsed ? <ListTodo className="h-5 w-5" /> : <ListTodo className="h-5 w-5" />}
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul>
            {navItems.filter(item => item.isVisible).map((item) => (
              <li key={item.id}>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.path}
                      className={`flex items-center p-3 rounded-md mx-2 my-1 text-sm font-medium ${
                        location.pathname === item.path
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span className="ml-3">{item.name}</span>}
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right">{item.name}</TooltipContent>}
                </Tooltip>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-gray-700 py-4">
          <ul>
            <li>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full flex items-center p-3 rounded-md mx-2 my-1 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={() => setIsCommandPaletteOpen(true)}
                  >
                    <ListTodo className="h-5 w-5" />
                    {!isCollapsed && <span className="ml-3">Command Palette</span>}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">Command Palette</TooltipContent>}
              </Tooltip>
            </li>
            <li>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    to="/settings"
                    className={`flex items-center p-3 rounded-md mx-2 my-1 text-sm font-medium ${
                      location.pathname === '/settings'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Settings className="h-5 w-5" />
                    {!isCollapsed && <span className="ml-3">Settings</span>}
                  </Link>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">Settings</TooltipContent>}
              </Tooltip>
            </li>
            <li>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={handleSignOut}
                    className="w-full flex items-center p-3 rounded-md mx-2 my-1 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    <LogOut className="h-5 w-5" />
                    {!isCollapsed && <span className="ml-3">Sign Out</span>}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">Sign Out</TooltipContent>}
              </Tooltip>
            </li>
          </ul>
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default Sidebar;