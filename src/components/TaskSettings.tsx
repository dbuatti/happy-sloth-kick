"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/context/SettingsContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const TaskSettings: React.FC = () => {
  const { settings, isLoading, updateSetting } = useSettings(); // Renamed loading to isLoading, updateSettings to updateSetting

  const handleSwitchChange = async (key: "schedule_show_focus_tasks_only", checked: boolean) => {
    await updateSetting(key, checked);
  };

  const handleInputChange = async (key: "future_tasks_days_visible" | "project_tracker_title" | "meditation_notes", value: string | number) => {
    if (key === "future_tasks_days_visible") {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0) {
        toast.error("Please enter a valid number for days visible.");
        return;
      }
      await updateSetting(key, numValue);
    } else {
      await updateSetting(key, value);
    }
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Task Settings</h2>

      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="show-focus-tasks-only">Show Focus Tasks Only in Schedule</Label>
          <Switch
            id="show-focus-tasks-only"
            checked={settings.schedule_show_focus_tasks_only}
            onCheckedChange={(checked) => handleSwitchChange("schedule_show_focus_tasks_only", checked)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="future-tasks-days-visible">Future Tasks Days Visible</Label>
          <Input
            id="future-tasks-days-visible"
            type="number"
            value={settings.future_tasks_days_visible}
            onChange={(e) => handleInputChange("future_tasks_days_visible", e.target.value)}
            min="0"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="project-tracker-title">Project Tracker Title</Label>
          <Input
            id="project-tracker-title"
            value={settings.project_tracker_title}
            onChange={(e) => handleInputChange("project_tracker_title", e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="meditation-notes">Meditation Notes</Label>
          <Textarea
            id="meditation-notes"
            value={settings.meditation_notes || ""}
            onChange={(e) => handleInputChange("meditation_notes", e.target.value)}
            rows={5}
            placeholder="Write down your meditation insights or practices here..."
          />
        </div>
      </div>
    </div>
  );
};

export default TaskSettings;