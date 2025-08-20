import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ListTodo, CalendarDays, BookOpen, Brain, Timer, Archive, Settings, BarChart3, Lightbulb, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import { useSettings } from '@/context/SettingsContext';

interface SidebarProps {
  children: React.ReactNode;
  isDemo?: boolean;
  demoUserId?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ children, isDemo = false, demoUserId }) => {
  const location = useLocation();
  const { completedCount, totalCount, isLoading: countLoading } = useDailyTaskCount({ userId: demoUserId, currentDate: new Date() }); // Pass currentDate
  const { settings } = useSettings();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, visible: settings?.visible_pages?.dashboard ?? true },
    { name: 'Daily Tasks', href: '/daily-tasks', icon: ListTodo, visible: settings?.visible_pages?.daily_tasks ?? true, count: { completed: completedCount, total: totalCount, loading: countLoading } },
    { name: 'Schedule', href: '/schedule', icon: CalendarDays, visible: settings?.visible_pages?.schedule ?? true },
    { name: 'Calendar', href: '/calendar', icon: CalendarDays, visible: settings?.visible_pages?.calendar ?? true },
    { name: 'Projects', href: '/projects', icon: Lightbulb, visible: settings?.visible_pages?.projects ?? true },
    { name: 'Focus Mode', href: '/focus', icon: Timer, visible: settings?.visible_pages?.focus_mode ?? true },
    { name: 'Meditation', href: '/meditation', icon: BookOpen, visible: settings?.visible_pages?.meditation ?? true },
    { name: 'Mindfulness Tools', href: '/mindfulness', icon: Brain, visible: settings?.visible_pages?.mindfulness_tools ?? true },
    { name: 'Sleep', href: '/sleep', icon: Users, visible: settings?.visible_pages?.sleep ?? true },
    { name: 'Dev Space', href: '/dev-space', icon: Lightbulb, visible: settings?.visible_pages?.dev_space ?? true },
    { name: 'Archive', href: '/archive', icon: Archive, visible: settings?.visible_pages?.archive ?? true },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, visible: settings?.visible_pages?.analytics ?? true },
    { name: 'Settings', href: '/settings', icon: Settings, visible: settings?.visible_pages?.settings ?? true },
  ];

  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-background border-r p-4 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">TaskMaster</h1>
        </div>
        <nav className="flex-grow">
          <ul className="space-y-2">
            {navItems.map((item) => (
              item.visible && (
                <li key={item.name}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start",
                      location.pathname === (isDemo ? `/demo${item.href}` : item.href) && "bg-muted hover:bg-muted"
                    )}
                    asChild
                  >
                    <Link to={isDemo ? `/demo${item.href}` : item.href}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.name}
                      {item.name === 'Daily Tasks' && item.count && (
                        <span className="ml-auto text-xs font-semibold">
                          {item.count.loading ? (
                            <span className="animate-pulse">...</span>
                          ) : (
                            `${item.count.completed}/${item.count.total}`
                          )}
                        </span>
                      )}
                    </Link>
                  </Button>
                </li>
              )
            ))}
          </ul>
        </nav>
        <div className="mt-auto pt-4 border-t">
          {!isDemo && (
            <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
              Sign Out
            </Button>
          )}
        </div>
      </aside>
      {children}
    </div>
  );
};

export default Sidebar;