"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, CalendarDays, ListTodo, Brain, BookOpen, Settings, BarChart3, Archive, Moon, Sun, FlaskConical, Clock, Users, Link as LinkIcon, LayoutDashboard } from "lucide-react"; // Removed HeartPulse (Mindfulness) and Leaf (Meditation)
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "next-themes";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isDemo?: boolean;
  demoUserId?: string;
}

export function Sidebar({ className, isDemo = false, demoUserId, ...props }: SidebarProps) {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  const base = isDemo ? "/demo" : "";

  const navItems = [
    {
      name: "Dashboard",
      href: `${base}/dashboard`,
      icon: LayoutDashboard,
      visible: true,
    },
    {
      name: "Daily Tasks",
      href: `${base}/daily-tasks`,
      icon: ListTodo,
      visible: true,
    },
    {
      name: "Calendar",
      href: `${base}/calendar`,
      icon: CalendarDays,
      visible: true,
    },
    {
      name: "Focus Mode",
      href: `${base}/focus`,
      icon: Brain,
      visible: true,
    },
    // Removed "Mindfulness" and "Meditation" links
    {
      name: "Sleep",
      href: `${base}/sleep`,
      icon: Moon,
      visible: true,
    },
    {
      name: "Project Balance",
      href: `${base}/projects`,
      icon: BookOpen,
      visible: true,
    },
    {
      name: "Schedule",
      href: `${base}/schedule`,
      icon: Clock,
      visible: true,
    },
    {
      name: "Dev Space",
      href: `${base}/dev-space`,
      icon: FlaskConical,
      visible: true,
    },
    {
      name: "My Hub",
      href: `${base}/my-hub`,
      icon: Home,
      visible: true,
    },
    {
      name: "Analytics",
      href: `${base}/analytics`,
      icon: BarChart3,
      visible: true,
    },
    {
      name: "Archive",
      href: `${base}/archive`,
      icon: Archive,
      visible: true,
    },
    {
      name: "Settings",
      href: `${base}/settings`,
      icon: Settings,
      visible: true,
    },
    {
      name: "Help",
      href: `${base}/help`,
      icon: Home, // Consider a more appropriate icon for Help
      visible: true,
    },
  ];

  const sidebarContent = (
    <div className={cn("pb-12", className)} {...props}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Overview
          </h2>
          <div className="space-y-1">
            {navItems.filter(item => item.visible).map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  location.pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent"
                )}
                onClick={() => isMobile && setIsSheetOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-0 right-0 px-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="mr-2 h-5 w-5" />
          ) : (
            <Moon className="mr-2 h-5 w-5" />
          )}
          Toggle Theme
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
            <ListTodo className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <ScrollArea className="h-full py-4">
            {sidebarContent}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="hidden md:block w-64 border-r bg-sidebar-background text-sidebar-foreground h-screen fixed top-0 left-0">
      <ScrollArea className="h-full">
        {sidebarContent}
      </ScrollArea>
    </div>
  );
}