import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ListTodo,
  Calendar,
  Brain,
  Moon,
  Users,
  Archive,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Command,
} from 'lucide-react';
import { SidebarProps } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'react-hot-toast';

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed, setIsCommandPaletteOpen }) => {
  const { user, signOut: authSignOut } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();

  const handleSignOut = async () => {
    await authSignOut();
    toast.success('Logged out successfully!');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', key: 'dashboard' },
    { to: '/', icon: ListTodo, label: 'Tasks', key: 'tasks' },
    { to: '/schedule', icon: Calendar, label: 'Schedule', key: 'schedule' },
    { to: '/focus-mode', icon: Brain, label: 'Focus Mode', key: 'focusMode' },
    { to: '/dev-space', icon: Moon, label: 'Dev Space', key: 'devSpace' },
    { to: '/sleep-tracker', icon: Moon, label: 'Sleep Tracker', key: 'sleepTracker' },
    { to: '/my-hub', icon: Users, label: 'My Hub', key: 'myHub' },
    { to: '/archive', icon: Archive, label: 'Archive', key: 'archive' },
    { to: '/analytics', icon: LayoutDashboard, label: 'Analytics', key: 'analytics' },
    { to: '/project-tracker', icon: LayoutDashboard, label: 'Project Tracker', key: 'projectTracker' },
    { to: '/gratitude-journal', icon: LayoutDashboard, label: 'Gratitude Journal', key: 'gratitudeJournal' },
    { to: '/worry-journal', icon: LayoutDashboard, label: 'Worry Journal', key: 'worryJournal' },
  ];

  const filteredNavItems = navItems.filter(item => settings?.visible_pages?.[item.key] ?? true);

  return (
    <div
      className={cn(
        "h-full border-r bg-background transition-all duration-300 flex flex-col",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b">
        {!isCollapsed && <h1 className="text-xl font-semibold">My App</h1>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <nav className="flex-1 grid items-start gap-2 p-2 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
              location.pathname === item.to && "bg-muted text-primary",
              isCollapsed && "justify-center"
            )}
          >
            <item.icon className="h-4 w-4" />
            {!isCollapsed && item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto p-2 border-t">
        <Button
          variant="ghost"
          className={cn(
            "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
            isCollapsed && "justify-center"
          )}
          onClick={() => setIsCommandPaletteOpen(true)}
        >
          <Command className="h-4 w-4" />
          {!isCollapsed && "Command Palette"}
        </Button>
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
            location.pathname === '/settings' && "bg-muted text-primary",
            isCollapsed && "justify-center"
          )}
        >
          <Settings className="h-4 w-4" />
          {!isCollapsed && "Settings"}
        </Link>
        <Button
          variant="ghost"
          className={cn(
            "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
            isCollapsed && "justify-center"
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && "Logout"}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;