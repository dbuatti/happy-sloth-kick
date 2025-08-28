import React, { useState, useMemo } from 'react'; // Removed useEffect
import { Link, useLocation } from 'react-router-dom';
import { Home, CalendarDays, ListTodo, Settings, LogOut, Menu, X } from 'lucide-react'; // Removed X
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';

interface SidebarProps {
  isDemo?: boolean;
  // demoUserId?: string; // Removed as it's not used
}

const Sidebar: React.FC<SidebarProps> = ({ isDemo = false }) => { // Removed demoUserId from destructuring
  const location = useLocation();
  const { signOut } = useAuth();
  const { settings } = useSettings();

  const navItems = useMemo(() => [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Schedule', href: '/schedule', icon: CalendarDays },
    { name: 'Tasks', href: '/tasks', icon: ListTodo },
    { name: 'Settings', href: '/settings', icon: Settings },
  ], []);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden fixed top-4 left-4 z-50">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <div className="flex h-full flex-col border-r bg-background">
          <div className="flex h-16 items-center border-b px-6">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <CalendarDays className="h-6 w-6" />
              <span className="">TaskMaster</span>
            </Link>
          </div>
          <nav className="flex-1 overflow-auto py-4">
            <ul className="grid gap-1 px-2">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                      location.pathname === item.href && "bg-muted text-primary"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto p-4 border-t">
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-primary" onClick={signOut}>
              <LogOut className="mr-3 h-4 w-4" />
              Logout
            </Button>
            {isDemo && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Demo Mode
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Sidebar;