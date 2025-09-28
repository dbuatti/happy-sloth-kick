"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/context/SettingsContext";
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
} from "lucide-react";

const pageDefinitions = [
  { name: "Dashboard", path: "dashboard", icon: LayoutDashboard },
  { name: "Daily Tasks", path: "dailyTasks", icon: ListTodo },
  { name: "Schedule", path: "schedule", icon: CalendarDays },
  { name: "Projects", path: "projects", icon: BarChart3 },
  { name: "Meal Planner", path: "mealPlanner", icon: UtensilsCrossed },
  { name: "Resonance Goals", path: "resonanceGoals", icon: Sparkles },
  { name: "Sleep", path: "sleep", icon: Moon },
  { name: "Dev Space", path: "devSpace", icon: Code },
  { name: "Settings", path: "settings", icon: Settings },
  { name: "Analytics", path: "analytics", icon: BarChart3 },
  { name: "Archive", path: "archive", icon: Archive },
  { name: "Help", path: "help", icon: HelpCircle },
];

const PageToggleSettings: React.FC = () => {
  const { settings, isLoading, updateSetting } = useSettings(); // Renamed loading to isLoading, updateSettings to updateSetting

  const handleToggleChange = async (pagePath: string, checked: boolean) => {
    const updatedVisiblePages = {
      ...(settings.visible_pages || {}),
      [pagePath]: checked,
    };
    await updateSetting("visible_pages", updatedVisiblePages);
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Page Visibility Settings</h2>
      <p className="text-muted-foreground">
        Control which pages appear in your sidebar navigation.
      </p>

      <div className="grid gap-4">
        {pageDefinitions.map((page) => {
          const Icon = page.icon;
          const isVisible = settings?.visible_pages?.[page.path] !== false; // Corrected access
          return (
            <div key={page.path} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor={`toggle-${page.path}`}>{page.name}</Label>
              </div>
              <Switch
                id={`toggle-${page.path}`}
                checked={isVisible}
                onCheckedChange={(checked) => handleToggleChange(page.path, checked)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PageToggleSettings;