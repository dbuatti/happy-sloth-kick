"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/context/SettingsContext";

const ScheduleSettings: React.FC = () => {
  const { settings, isLoading, updateSetting } = useSettings(); // Renamed loading to isLoading, updateSettings to updateSetting

  const handleSwitchChange = async (key: "schedule_show_focus_tasks_only", checked: boolean) => {
    await updateSetting(key, checked);
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Schedule Settings</h2>

      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="show-focus-tasks-only">Show Focus Tasks Only</Label>
          <Switch
            id="show-focus-tasks-only"
            checked={settings.schedule_show_focus_tasks_only}
            onCheckedChange={(checked) => handleSwitchChange("schedule_show_focus_tasks_only", checked)}
          />
        </div>
      </div>
    </div>
  );
};

export default ScheduleSettings;