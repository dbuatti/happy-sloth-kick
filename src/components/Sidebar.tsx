import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Home, 
  Settings, 
  Target, 
  User, 
  Archive,
  Brain,
  BarChart3,
  Lightbulb,
  Users,
  Link as LinkIcon,
  Bed,
  BookOpen,
  Timer
} from 'lucide-react';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import { useSettings } from '@/context/SettingsContext';
import { cn } from '@/lib/utils';

interface SidebarProps {
  demoUserId?: string;
  isDemo?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ demoUserId, isDemo = false }) => {
  const location = useLocation();
  const { settings } = useSettings();
  
  // Fix the useDailyTaskCount call by providing currentDate
  const { dailyProgress, loading: countLoading } = useDailyTaskCount({ 
    userId: demoUserId, 
    currentDate: new Date() // Add required currentDate parameter
  });

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/daily', icon: CheckCircle2, label: 'Daily Tasks' },
    { path: '/focus', icon: Target, label: 'Focus Mode' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/schedule', icon: Clock, label: 'Schedule' },
    { path: '/projects', icon: BarChart3, label: 'Projects' },
    { path: '/ideas', icon: Lightbulb, label: 'Ideas' },
    { path: '/people', icon: Users, label: 'People' },
    { path: '/links', icon: LinkIcon, label: 'Quick Links' },
    { path: '/sleep', icon: Bed, label: 'Sleep Tracker' },
    { path: '/journal', icon: BookOpen, label: 'Journal' },
    { path: '/pomodoro', icon: Timer, label: 'Pomodoro' },
    { path: '/archive', icon: Archive, label: 'Archive' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex flex-col h-full border-r bg-card">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold">TaskFlow</h1>
        {demoUserId && (
          <p className="text-xs text-muted-foreground mt-1">Demo Mode</p>
        )}
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Button
                variant={isActive(item.path) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive(item.path) && "bg-secondary"
                )}
                asChild
              >
                <Link to={item.path}>
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                  {item.path === '/daily' && !countLoading && (
                    <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center">
                      {dailyProgress.completed}/{dailyProgress.total}
                    </span>
                  )}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link to="/profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link to="/settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;