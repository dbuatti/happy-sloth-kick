"use client";

import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  Palette,
  Sun,
  Monitor,
  Moon, // Keep Moon for theme selection
  ListTodo, // Added ListTodo for app logo
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSettings } from "@/context/SettingsContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { navItemsConfig, NavItem } from "@/config/navItems"; // Import the new config

interface SidebarProps {
  children: React.ReactNode;
  isDemo?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ children, isDemo = false }) => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { settings } = useSettings();

  const getFilteredNavItems = (isBottomSection: boolean) => {
    return navItemsConfig.filter(item => {
      const isVisibleInSettings = settings?.visible_pages?.[item.path] !== false;
      const isCoreItem = ['dashboard', 'dailyTasks', 'schedule', 'projects', 'mealPlanner', 'resonanceGoals', 'sleep', 'devSpace'].includes(item.path);
      const isBottomItem = ['settings', 'analytics', 'archive', 'help'].includes(item.path);

      if (isBottomSection) {
        return isBottomItem && isVisibleInSettings;
      } else {
        return isCoreItem && isVisibleInSettings;
      }
    });
  };

  const topNavItems = getFilteredNavItems(false);
  const bottomNavItems = getFilteredNavItems(true);

  const renderNavItems = (items: NavItem[]) => (
    <nav className="grid items-start gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === (isDemo ? `/demo/${item.path}` : `/${item.path}`);
        return (
          <Link
            key={item.name}
            to={isDemo ? `/demo/${item.path}` : `/${item.path}`}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
              isActive && "bg-muted text-primary",
            )}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarContent = (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link to={isDemo ? "/demo/dashboard" : "/dashboard"} className="flex items-center gap-2 font-semibold">
          <ListTodo className="h-6 w-6" /> {/* Keep ListTodo for app logo */}
          <span className="">TaskMaster</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <div className="grid items-start px-4 text-sm font-medium">
          {renderNavItems(topNavItems)}
          <Separator className="my-4" />
          {renderNavItems(bottomNavItems)}
        </div>
      </div>
      <div className="mt-auto p-4 border-t flex flex-col gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start h-9">
              <Palette className="mr-2 h-4 w-4" />
              <span>Theme: {theme === 'system' ? 'System' : theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'Unknown'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('system')} className={theme === 'system' ? 'font-bold' : ''}>
              <Monitor className="h-3.5 w-3.5 mr-2" />
              System
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('light')} className={theme === 'light' ? 'font-bold' : ''}>
              <Sun className="h-3.5 w-3.5 mr-2" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')} className={theme === 'dark' ? 'font-bold' : ''}>
              <Moon className="h-3.5 w-3.5 mr-2" />
              Dark
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        {sidebarContent}
      </div>
      <div className="flex flex-col h-full">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col w-[280px] sm:w-[320px] p-0">
              {sidebarContent}
            </SheetContent>
          </Sheet>
          <Link to={isDemo ? "/demo/dashboard" : "/dashboard"} className="flex items-center gap-2 font-semibold">
            <ListTodo className="h-6 w-6" />
            <span className="">TaskMaster</span>
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
};