import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Settings as SettingsIcon, HelpCircle, Archive as ArchiveIcon, Timer, LayoutGrid, CalendarClock, Menu, Leaf, Moon, Volume2, VolumeX, Brain, Target, LayoutDashboard, Sparkles } from 'lucide-react';
import ThemeSelector from './ThemeSelector';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import { Badge } from '@/components/ui/badge';
import { useSound } from '@/context/SoundContext';

interface SidebarProps {
  children: React.ReactNode;
}

const navItems = [
  { name: 'Daily Tasks', path: '/daily-tasks', icon: Home, showCount: true },
  { name: 'Focus Mode', path: '/focus', icon: Target },
  { name: 'Mindfulness', path: '/mindfulness', icon: Brain },
  { name: 'Meditation', path: '/meditation', icon: Leaf },
  { name: 'Sleep Tracker', path: '/sleep', icon: Moon },
  { name: 'Project Balance', path: '/projects', icon: LayoutGrid },
  { name: 'Time Blocks', path: '/schedule', icon: CalendarClock },
  { name: 'My Hub', path: '/my-hub', icon: LayoutDashboard },
  { name: 'Help', path: '/help', icon: HelpCircle },
];

const NavigationLinks = ({ onLinkClick }: { onLinkClick?: () => void }) => {
  const location = useLocation();
  const { dailyTaskCount, loading: countLoading } = useDailyTaskCount();

  return (
    <nav className="flex-1 px-3 space-y-1">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground/80 hover:bg-muted hover:text-foreground'
            )}
            onClick={onLinkClick}
          >
            <Icon className="h-5 w-5" />
            <span className="font-medium">{item.name}</span>
            {item.showCount && !countLoading && dailyTaskCount > 0 && (
              <Badge className="ml-auto px-2 py-0.5 text-xs rounded-full bg-primary-foreground text-primary">
                {dailyTaskCount}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const { isSoundEnabled, toggleSound } = useSound();

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between p-4 bg-card/80 backdrop-blur shadow-sm">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-card flex flex-col">
              <div className="p-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold">TaskMaster</h1>
              </div>
              <NavigationLinks onLinkClick={() => setIsSheetOpen(false)} />
              <div className="p-4 border-t border-border flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  &copy; {new Date().getFullYear()} TaskMaster
                </p>
                <div className="flex items-center space-x-2">
                  <ThemeSelector />
                  <Button variant="ghost" size="icon" onClick={toggleSound} aria-label={isSoundEnabled ? "Disable sound" : "Enable sound"}>
                    {isSoundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="text-xl font-bold">TaskMaster</h1>
          <div className="flex items-center space-x-2">
            <ThemeSelector />
            <Button variant="ghost" size="icon" onClick={toggleSound} aria-label={isSoundEnabled ? "Disable sound" : "Enable sound"}>
              {isSoundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
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
      <div className="w-64 bg-card/80 backdrop-blur shadow-md h-screen flex flex-col">
        <div className="p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">TaskMaster</h1>
        </div>
        <NavigationLinks />
        <div className="p-4 border-t border-border flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} TaskMaster
          </p>
          <div className="flex items-center space-x-2">
            <ThemeSelector />
            <Button variant="ghost" size="icon" onClick={toggleSound} aria-label={isSoundEnabled ? "Disable sound" : "Enable sound"}>
              {isSoundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
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