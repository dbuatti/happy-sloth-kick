import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  ListTodo,
  Brain,
  Moon,
  Link as LinkIcon,
  Users,
  Archive,
  Settings,
  LogOut,
  Clock, // Imported Clock icon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { SidebarProps } from '@/types';
import { toast } from 'react-hot-toast'; // Imported toast

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed, isDemo = false, demoUserId, setIsCommandPaletteOpen }) => {
  const { user, signOut: authSignOut } = useAuth(); // Renamed signOut to authSignOut to avoid conflict
  const { settings } = useSettings();
  const location = useLocation();

  const navItems = useMemo(() => {
    const baseItems = [
      { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { id: 'daily-tasks', name: 'Daily Tasks', icon: ListTodo, path: '/daily-tasks' },
      { id: 'task-calendar', name: 'Task Calendar', icon: Calendar, path: '/task-calendar' },
      { id: 'time-block-schedule', name: 'Time Block Schedule', icon: Clock, path: '/time-block-schedule' },
      { id: 'focus-mode', name: 'Focus Mode', icon: Brain, path: '/focus-mode' },
      { id: 'sleep-tracker', name: 'Sleep Tracker', icon: Moon, path: '/sleep-tracker' },
      { id: 'quick-links', name: 'Quick Links', icon: LinkIcon, path: '/quick-links' },
      { id: 'people-memory', name: 'People Memory', icon: Users, path: '/people-memory' },
      { id: 'dev-space', name: 'Dev Space', icon: LayoutDashboard, path: '/dev-space' }, // Reusing LayoutDashboard for now
      { id: 'archive', name: 'Archive', icon: Archive, path: '/archive' },
      { id: 'analytics', name: 'Analytics', icon: LayoutDashboard, path: '/analytics' }, // Reusing LayoutDashboard for now
    ];

    if (!settings?.visible_pages) {
      return baseItems;
    }

    const visiblePageIds = settings.visible_pages as string[];
    return baseItems.filter(item => visiblePageIds.includes(item.id));
  }, [settings?.visible_pages]);

  const handleSignOut = async () => {
    try {
      await authSignOut();
      toast.success('Signed out successfully!');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out.');
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-gray-800 text-white transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4 h-16">
        {!isCollapsed && <h1 className="text-2xl font-bold">My App</h1>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white hover:bg-gray-700"
        >
          {isCollapsed ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </Button>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`flex items-center p-2 rounded-md text-sm font-medium ${
              location.pathname === item.path ? 'bg-gray-700' : 'hover:bg-gray-700'
            }`}
          >
            <item.icon className="h-5 w-5 mr-3" />
            {!isCollapsed && item.name}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <Button
          variant="ghost"
          className="w-full justify-start text-white hover:bg-gray-700"
          onClick={() => setIsCommandPaletteOpen(true)}
        >
          <Settings className="h-5 w-5 mr-3" />
          {!isCollapsed && 'Settings'}
        </Button>
        {user && (
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-gray-700 mt-2"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5 mr-3" />
            {!isCollapsed && 'Sign Out'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;