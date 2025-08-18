import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import { Badge } from '@/components/ui/badge';
import { useSound } from '@/context/SoundContext';
import ThemeSelector from './ThemeSelector';
import { navItems } from '@/lib/navItems';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  children: React.ReactNode;
  isDemo?: boolean;
  demoUserId?: string;
}

const NavigationLinks = ({ onLinkClick, isDemo, demoUserId }: { onLinkClick?: () => void; isDemo?: boolean; demoUserId?: string; }) => {
  const location = useLocation();
  const { dailyTaskCount, loading: countLoading } = useDailyTaskCount({ userId: demoUserId });
  const { settings } = useSettings();
  const { user } = useAuth();

  const visibleNavItems = navItems.filter(item => {
    // Hide Dev Space unless it's the specific user
    if (item.path === '/dev-space') {
      return user?.id === 'abc41fed-55ba-4249-90df-3b5a25b09e87';
    }
    if (!item.toggleable) return true;
    return settings?.visible_pages?.[item.path] !== false;
  });

  return (
    <nav className="flex-1 px-3 space-y-1">
      {visibleNavItems.map((item) => {
        const path = isDemo ? (item.path === '/dashboard' ? '/demo' : `/demo${item.path}`) : item.path;
        const isActive = location.pathname === path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={path}
            className={cn(
              "flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground/80 hover:bg-muted hover:text-foreground'
            )}
            onClick={onLinkClick}
          >
            <Icon className="h-4 w-4" />
            <span className="font-medium text-sm">{item.name}</span>
            {item.showCount && !countLoading && dailyTaskCount > 0 && (
              <Badge className="ml-auto px-2.5 py-1 text-xs rounded-full bg-primary-foreground text-primary flex-shrink-0">
                {dailyTaskCount}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ children, isDemo = false, demoUserId }) => {
  const isMobile = useIsMobile();
  const { isSoundEnabled, toggleSound } = useSound();

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between p-4 bg-card/80 backdrop-blur shadow-sm sticky top-0 z-50">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 bg-card flex flex-col"
              onPointerDownOutside={(e) => {
                if (e.target instanceof HTMLElement && e.target.closest('[data-radix-popper-content-wrapper]')) {
                  e.preventDefault();
                }
              }}
            >
              <div className="p-4 flex justify-between items-center">
                <Link to={isDemo ? '/demo' : '/dashboard'} className="hover:opacity-80 transition-opacity">
                  <h1 className="text-2xl font-bubbly">TaskMaster</h1>
                </Link>
              </div>
              <NavigationLinks onLinkClick={() => setIsSheetOpen(false)} isDemo={isDemo} demoUserId={demoUserId} />
              <div className="p-4 border-t border-border flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  &copy; {new Date().getFullYear()} TaskMaster
                </p>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="icon" onClick={toggleSound} aria-label={isSoundEnabled ? "Disable sound" : "Enable sound"} className="h-8 w-8">
                    {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                  <ThemeSelector />
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Link to={isDemo ? '/demo' : '/dashboard'} className="hover:opacity-80 transition-opacity">
            <h1 className="text-2xl font-bubbly">TaskMaster</h1>
          </Link>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" onClick={toggleSound} aria-label={isSoundEnabled ? "Disable sound" : "Enable sound"} className="h-8 w-8">
              {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <ThemeSelector />
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <div className="w-64 bg-card/80 backdrop-blur shadow-md h-full flex flex-col flex-shrink-0">
        <div className="p-4 flex justify-between items-center">
          <Link to={isDemo ? '/demo' : '/dashboard'} className="hover:opacity-80 transition-opacity">
            <h1 className="text-2xl font-bubbly">TaskMaster</h1>
          </Link>
        </div>
        <NavigationLinks isDemo={isDemo} demoUserId={demoUserId} />
        <div className="p-4 border-t border-border flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} TaskMaster
          </p>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" onClick={toggleSound} aria-label={isSoundEnabled ? "Disable sound" : "Enable sound"} className="h-8 w-8">
              {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <ThemeSelector />
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
};