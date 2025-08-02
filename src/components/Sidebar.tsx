import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, HelpCircle, Archive as ArchiveIcon, Target, LayoutGrid, CalendarClock, Menu, Leaf, Moon, Volume2, VolumeX, Brain, LayoutDashboard } from 'lucide-react';
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
    <nav className="flex-1 px-2 space-y-0.5">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center space-x-2 px-2 py-1.5 rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground/80 hover:bg-muted hover:text-foreground'
            )}
            onClick={onLinkClick}
          >
            <Icon className="h-4 w-4" />
            <span className="font-medium text-sm">{item.name}</span>
            {item.showCount && !countLoading && dailyTaskCount > 0 && (
              <Badge className="ml-auto px-2 py-0.5 text-xs rounded-full bg-primary-foreground text-primary flex-shrink-0">
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
        <header className="flex items-center justify-between p-3 bg-card/80 backdrop-blur shadow-sm">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="h-8 w-8">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 bg-card flex flex-col">
              <div className="p-3 flex justify-between items-center">
                <h1 className="text-xl font-bold">TaskMaster</h1>
              </div>
              <NavigationLinks onLinkClick={() => setIsSheetOpen(false)} />
              <div className="p-3 border-t border-border flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  &copy; {new Date().getFullYear()} TaskMaster
                </p>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="icon" onClick={toggleSound} aria-label={isSoundEnabled ? "Disable sound" : "Enable sound"} className="h-7 w-7">
                    {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="text-xl font-bold">TaskMaster</h1>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" onClick={toggleSound} aria-label={isSoundEnabled ? "Disable sound" : "Enable sound"} className="h-7 w-7">
              {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
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
      <div className="w-60 bg-card/80 backdrop-blur shadow-md h-screen flex flex-col">
        <div className="p-3 flex justify-between items-center">
          <h1 className="text-xl font-bold">TaskMaster</h1>
        </div>
        <NavigationLinks />
        <div className="p-3 border-t border-border flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} TaskMaster
          </p>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" onClick={toggleSound} aria-label={isSoundEnabled ? "Disable sound" : "Enable sound"} className="h-7 w-7">
              {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
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