"use client";

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Calendar,
  ListTodo,
  BarChart2,
  Archive,
  Settings,
  HelpCircle,
  BookOpen,
  Moon,
  Sun,
  Laptop,
  Menu,
  X,
  LayoutDashboard,
  Hourglass,
  Brain,
  Book,
  Palette,
  Github,
  Coffee,
  Bed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext"; // Updated import to useAuth
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/context/SettingsContext";

interface SidebarProps {
  isDemo?: boolean;
  demoUserId?: string;
}

export const Sidebar = ({ isDemo = false, demoUserId }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth(); // Using useAuth
  const { settings, updateSetting } = useSettings();

  const userId = isDemo ? demoUserId : user?.id;

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out: " + error.message);
    } else {
      toast.success("Signed out successfully!");
    }
  };

  const navItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/dashboard",
      visible: settings?.visible_pages?.dashboard ?? true,
    },
    {
      name: "Daily Tasks",
      icon: ListTodo,
      path: "/daily-tasks",
      visible: settings?.visible_pages?.daily_tasks ?? true,
    },
    {
      name: "Calendar",
      icon: Calendar,
      path: "/calendar",
      visible: settings?.visible_pages?.calendar ?? true,
    },
    {
      name: "Projects",
      icon: BookOpen,
      path: "/projects",
      visible: settings?.visible_pages?.projects ?? true,
    },
    {
      name: "Schedule",
      icon: Hourglass,
      path: "/schedule",
      visible: settings?.visible_pages?.schedule ?? true,
    },
    {
      name: "Sleep",
      icon: Bed,
      path: "/sleep",
      visible: settings?.visible_pages?.sleep ?? true,
    },
    {
      name: "Dev Space",
      icon: Github,
      path: "/dev-space",
      visible: settings?.visible_pages?.dev_space ?? true,
    },
    {
      name: "My Hub",
      icon: Home,
      path: "/my-hub",
      visible: settings?.visible_pages?.my_hub ?? true,
    },
    {
      name: "Analytics",
      icon: BarChart2,
      path: "/analytics",
      visible: settings?.visible_pages?.analytics ?? true,
    },
    {
      name: "Archive",
      icon: Archive,
      path: "/archive",
      visible: settings?.visible_pages?.archive ?? true,
    },
    {
      name: "Settings",
      icon: Settings,
      path: "/settings",
      visible: settings?.visible_pages?.settings ?? true,
    },
    {
      name: "Help",
      icon: HelpCircle,
      path: "/help",
      visible: settings?.visible_pages?.help ?? true,
    },
  ].filter(item => item.visible);

  const themes = [
    { name: "System", value: "system", icon: Laptop },
    { name: "Light", value: "light", icon: Sun },
    { name: "Dark", value: "dark", icon: Moon },
    { name: "ADHD Friendly", value: "adhd-friendly", icon: Brain },
    { name: "Calm Mist", value: "calm-mist", icon: Coffee },
    { name: "Warm Dawn", value: "warm-dawn", icon: Sun },
    { name: "Gentle Night", value: "gentle-night", icon: Moon },
    { name: "Focus Flow", value: "focus-flow", icon: Book },
    { name: "Retro Wave", value: "retro-wave", icon: Palette },
    { name: "Sepia Dusk", value: "sepia-dusk", icon: Palette },
    { name: "Vibrant Flow", value: "vibrant-flow", icon: Palette },
    { name: "Honeycomb", value: "honeycomb", icon: Palette },
    { name: "Forest Calm", value: "forest-calm", icon: Palette },
    { name: "Rainbow Whimsy", value: "rainbow-whimsy", icon: Palette },
  ];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile Sidebar Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={toggleSidebar}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col border-r bg-sidebar transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <h1 className="text-lg font-semibold text-sidebar-foreground">
            My App
          </h1>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={toggleSidebar}
          >
            <X className="h-5 w-5 text-sidebar-foreground" />
          </Button>
        </div>
        <ScrollArea className="flex-grow py-4">
          <nav className="grid items-start gap-2 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === (isDemo ? `/demo${item.path}` : item.path);
              return (
                <Link
                  key={item.name}
                  to={isDemo ? `/demo${item.path}` : item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-primary",
                    isActive && "bg-sidebar-accent text-sidebar-primary"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
        <div className="mt-auto border-t p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="ml-2">Toggle Theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {themes.map((t) => {
                const Icon = t.icon;
                return (
                  <DropdownMenuItem key={t.value} onClick={() => setTheme(t.value)}>
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{t.name}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          {user && (
            <Button
              variant="outline"
              className="mt-2 w-full justify-start"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          )}
        </div>
      </aside>
    </>
  );
};