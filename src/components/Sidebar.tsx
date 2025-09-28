"use client";

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  BarChart3,
  UtensilsCrossed,
  Moon,
  Code,
  Settings,
  Archive,
  HelpCircle,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSettings } from "@/context/SettingsContext";

interface SidebarProps {
  isDemo?: boolean;
  children: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ isDemo = false, children }) => {
  const location = useLocation();
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);

  const baseRoute = isDemo ? "/demo" : "";

  const navItems = [
    {
      name: "Dashboard",
      path: `${baseRoute}/dashboard`,
      icon: LayoutDashboard,
      visible: settings?.visible_pages?.dashboard !== false,
    },
    {
      name: "Daily Tasks",
      path: `${baseRoute}/daily-tasks`,
      icon: ListTodo,
      visible: settings?.visible_pages?.dailyTasks !== false,
    },
    {
      name: "Schedule",
      path: `${baseRoute}/schedule`,
      icon: CalendarDays,
      visible: settings?.visible_pages?.schedule !== false,
    },
    {
      name: "Projects",
      path: `${baseRoute}/projects`,
      icon: BarChart3,
      visible: settings?.visible_pages?.projects !== false,
    },
    {
      name: "Meal Planner",
      path: `${baseRoute}/meal-planner`,
      icon: UtensilsCrossed,
      visible: settings?.visible_pages?.mealPlanner !== false,
    },
    {
      name: "Resonance Goals",
      path: `${baseRoute}/resonance-goals`,
      icon: Sparkles, // Using Sparkles for Resonance Goals
      visible: settings?.visible_pages?.resonanceGoals !== false, // New setting for visibility
    },
    {
      name: "Sleep",
      path: `${baseRoute}/sleep`,
      icon: Moon,
      visible: settings?.visible_pages?.sleep !== false,
    },
    {
      name: "Dev Space",
      path: `${baseRoute}/dev-space`,
      icon: Code,
      visible: settings?.visible_pages?.devSpace !== false,
    },
  ];

  const bottomNavItems = [
    {
      name: "Settings",
      path: `${baseRoute}/settings`,
      icon: Settings,
      visible: settings?.visible_pages?.settings !== false,
    },
    {
      name: "Analytics",
      path: `${baseRoute}/analytics`,
      icon: BarChart3,
      visible: settings?.visible_pages?.analytics !== false,
    },
    {
      name: "Archive",
      path: `${baseRoute}/archive`,
      icon: Archive,
      visible: settings?.visible_pages?.archive !== false,
    },
    {
      name: "Help",
      path: `${baseRoute}/help`,
      icon: HelpCircle,
      visible: settings?.visible_pages?.help !== false,
    },
  ];

  return (
    <div className="flex h-full">
      {/* Mobile Sidebar Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-background border-r transition-transform duration-200 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col py-4 px-3">
          <div className="flex items-center justify-between mb-6 px-3">
            <h2 className="text-2xl font-bold text-primary">Task Master</h2>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex-1 space-y-1">
            {navItems.map(
              (item) =>
                item.visible && (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                      location.pathname === item.path && "bg-muted text-primary"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
            )}
          </nav>
          <div className="mt-auto space-y-1 border-t pt-4">
            {bottomNavItems.map(
              (item) =>
                item.visible && (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                      location.pathname === item.path && "bg-muted text-primary"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
            )}
          </div>
        </div>
      </aside>
      <main className={cn("flex-1 md:ml-64", isOpen && "ml-64 md:ml-64")}>{children}</main>
    </div>
  );
};