"use client";

import React, { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useCommandPalette } from "@/context/CommandPaletteContext";
import { useLocation, useNavigate } from "react-router-dom";
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
  Home,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";

const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, setIsCommandPaletteOpen, closeCommandPalette } = useCommandPalette();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { settings } = useSettings();

  const baseRoute = location.pathname.startsWith('/demo') ? "/demo" : "";

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
      icon: Sparkles,
      visible: settings?.visible_pages?.resonanceGoals !== false,
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

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setIsCommandPaletteOpen]);

  const handleSelect = (path: string) => {
    navigate(path);
    closeCommandPalette();
  };

  return (
    <CommandDialog open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {user && (
          <CommandGroup heading="Navigation">
            {navItems.filter(item => item.visible).map((item) => (
              <CommandItem key={item.path} onSelect={() => handleSelect(item.path)}>
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!user && (
          <CommandGroup heading="Guest Navigation">
            <CommandItem onSelect={() => handleSelect("/")}>
              <Home className="mr-2 h-4 w-4" />
              <span>Landing Page</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect("/auth")}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Login / Signup</span>
            </CommandItem>
          </CommandGroup>
        )}
        <CommandSeparator />
        {/* Add more command groups here for actions like "Add Task", "Create Project", etc. */}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;