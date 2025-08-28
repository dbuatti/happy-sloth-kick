"use client";

import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  Settings,
  BarChart3,
  Archive,
  HelpCircle,
  Moon,
  Code,
  Menu,
  Palette,
  Sun,
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

interface SidebarProps {
  children: React.ReactNode;
  isDemo?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ children, isDemo = false }) => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { settings } = useSettings();

  const navItems = [
    {
      name: "Dashboard",
      href: isDemo ? "/demo/dashboard" : "/dashboard",
      icon: LayoutDashboard,
      visible: settings?.visible_pages?.dashboard !== false,
    },
    {
      name: "Daily Tasks",
      href: isDemo ? "/demo/daily-tasks" : "/daily-tasks",
      icon: ListTodo,
      visible: settings?.visible_pages?.dailyTasks !== false,
    },
    {
      name: "Schedule",
      href: isDemo ? "/demo/schedule" : "/schedule",
      icon: CalendarDays,
      visible: settings?.visible_pages?.schedule !== false,
    },
    {
      name: "Projects",
      href: isDemo ? "/demo/projects" : "/projects",
      icon: BarChart3,
      visible: settings?.visible_pages?.projects !== false,
    },
    {
      name: "Sleep",
      href: isDemo ? "/demo/sleep" : "/sleep",
      icon: Moon,
      visible: settings?.visible_pages?.sleep !== false,
    },
    {
      name: "Dev Space",
      href: isDemo ? "/demo/dev-space" : "/dev-space",
      icon: Code,
      visible: settings?.visible_pages?.devSpace !== false,
    },
    {
      name: "My Hub",
      href: isDemo ? "/demo/my-hub" : "/my-hub",
      icon: Settings,
      visible: settings?.visible_pages?.myHub !== false,
    },
  ].filter(item => item.visible);

  const bottomNavItems = [
    {
      name: "Settings",
      href: isDemo ? "/demo/settings" : "/settings",
      icon: Settings,
      visible: settings?.visible_pages?.settings !== false,
    },
    {
      name: "Analytics",
      href: isDemo ? "/demo/analytics" : "/analytics",
      icon: BarChart3,
      visible: settings?.visible_pages?.analytics !== false,
    },
    {
      name: "Archive",
      href: isDemo ? "/demo/archive" : "/archive",
      icon: Archive,
      visible: settings?.visible_pages?.archive !== false,
    },
    {
      name: "Help",
      href: isDemo ? "/demo/help" : "/help",
      icon: HelpCircle,
      visible: settings?.visible_pages?.help !== false,
    },
  ].filter(item => item.visible);

  const themeOptions = [
    { name: "Default", value: "theme-default" },
    { name: "ADHD Friendly", value: "adhd-friendly" },
    { name: "Calm Mist", value: "calm-mist" },
    { name: "Warm Dawn", value: "warm-dawn" },
    { name: "Gentle Night", value: "gentle-night" },
    { name: "Focus Flow", value: "focus-flow" },
    { name: "Retro Wave", value: "retro-wave" },
    { name: "Sepia Dusk", value: "sepia-dusk" },
    { name: "Vibrant Flow", value: "vibrant-flow" },
    { name: "Honeycomb", value: "honeycomb" },
    { name: "Forest Calm", value: "forest-calm" },
    { name: "Rainbow Whimsy", value: "rainbow-whimsy" },
  ];

  const currentThemeClass = document.documentElement.className.split(' ').find(cls => cls.startsWith('theme-') || themeOptions.some(opt => opt.value === cls));
  const currentThemeName = themeOptions.find(opt => opt.value === currentThemeClass)?.name || "Default";

  const renderNavItems = (items: typeof navItems) => (
    <nav className="grid items-start gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.name}
            to={item.href}
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
          <ListTodo className="h-6 w-6" />
          <span className="">TaskMaster</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <div className="grid items-start px-4 text-sm font-medium">
          {renderNavItems(navItems)}
          <Separator className="my-4" />
          {renderNavItems(bottomNavItems)}
        </div>
      </div>
      <div className="mt-auto p-4 border-t flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Theme: {currentThemeName}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Color Palette</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const currentThemeIndex = themeOptions.findIndex(opt => opt.value === currentThemeClass);
              const nextThemeIndex = (currentThemeIndex + 1) % themeOptions.length;
              document.documentElement.className = document.documentElement.className.replace(currentThemeClass || '', '');
              document.documentElement.classList.add(themeOptions[nextThemeIndex].value);
            }}
            aria-label="Change color palette"
          >
            <Palette className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        {sidebarContent}
      </div>
      <div className="flex flex-col">
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