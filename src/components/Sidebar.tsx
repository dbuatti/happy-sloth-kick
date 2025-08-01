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
    <nav className="flex-1 px-2 space-y-0.5"> {/* Changed px-3 space-y-1 to px-2 space-y-0.5 */}
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center space-x-2 px-2 py-1.5 rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", /* Changed space-x-3 px-3 py-2 to space-x-2 px-2 py-1.5 */
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground/80 hover:bg-muted hover:text-foreground'
            )}
            onClick={onLinkClick}
          >
            <Icon className="h-4 w-4" /> {/* Changed h-5 w-5 to h-4 w-4 */}
            <span className="font-medium text-sm">{item.name}</span> {/* Added text-sm */}
            {item.showCount && !countLoading && dailyTaskCount > 0 && (
              <Badge className="ml-auto px-1.5 py-0.5 text-xs rounded-full bg-primary-foreground text-primary"> {/* Changed px-2 to px-1.5 */}
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
        <header className="flex items-center justify-between p-3 bg-card/80 backdrop-blur shadow-sm"> {/* Changed p-4 to p-3 */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="h-8 w-8"> {/* Changed h-9 w-9 to h-8 w-8 */}
                <Menu className="h-5 w-5" /> {/* Changed h-6 w-6 to h-5 w-5 */}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 bg-card flex flex-col"> {/* Changed w-64 to w-60 */}
              <div className="p-3 flex justify-between items-center"> {/* Changed p-4 to p-3 */}
                <h1 className="text-xl font-bold">TaskMaster</h1> {/* Changed text-2xl to text-xl */}
              </div>
              <NavigationLinks onLinkClick={() => setIsSheetOpen(false)} />
              <div className="p-3 border-t border-border flex justify-between items-center"> {/* Changed p-4 to p-3 */}
                <p className="text-xs text-muted-foreground"> {/* Changed text-sm to text-xs */}
                  &copy; {new Date().getFullYear()} TaskMaster
                </p>
                <div className="flex items-center space-x-1"> {/* Changed space-x-2 to space-x-1 */}
                  <ThemeSelector />
                  <Button variant="ghost" size="icon" onClick={toggleSound} aria-label={isSoundEnabled ? "Disable sound" : "Enable sound"} className="h-7 w-7"> {/* Changed h-8 w-8 to h-7 w-7 */}
                    {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} {/* Changed h-5 w-5 to h-4 w-4 */}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="text-xl font-bold">TaskMaster</h1>
          <div className="flex items-center space-x-1"> {/* Changed space-x-2 to space-x-1 */}
            <ThemeSelector />
            <Button variant="ghost" size="icon" onClick={toggleSound} aria-label={isSoundEnabled ? "Disable sound" : "Enable sound"} className="h-7 w-7"> {/* Changed h-8 w-8 to h-7 w-7 */}
              {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} {/* Changed h-5 w-5 to h-4 w-4 */}
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
      <div className="w-60 bg-card/80 backdrop-blur shadow-md h-screen flex flex-col"> {/* Changed w-64 to w-60 */}
        <div className="p-3 flex justify-between items-center"> {/* Changed p-4 to p-3 */}
          <h1 className="text-xl font-bold">TaskMaster</h1> {/* Changed text-2xl to text-xl */}
        </div>
        <NavigationLinks />
        <div className="p-3 border-t border-border flex justify-between items-center"> {/* Changed p-4 to p-3 */}
          <p className="text-xs text-muted-foreground"> {/* Changed text-sm to text-xs */}
            &copy; {new Date().getFullYear()} TaskMaster
          </p>
          <div className="flex items-center space-x-1"> {/* Changed space-x-2 to space-x-1 */}
            <ThemeSelector />
            <Button variant="ghost" size="icon" onClick={toggleSound} aria-label={isSoundEnabled ? "Disable sound" : "Enable sound"} className="h-7 w-7"> {/* Changed h-8 w-8 to h-7 w-7 */}
              {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} {/* Changed h-5 w-5 to h-4 w-4 */}
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