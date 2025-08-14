import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettings, UserSettings } from '@/context/SettingsContext'; // Import UserSettings

interface ScheduleSettingsProps {
  settings: UserSettings | null;
  updateSettings: (updates: Partial<Omit<UserSettings, 'user_id'>>) => Promise<boolean>;
}

const ScheduleSettings: React.FC<ScheduleSettingsProps> = ({ settings, updateSettings }) => {
  const handleToggle = (checked: boolean) => {
    updateSettings({ schedule_show_focus_tasks_only: checked }); // Corrected property name
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Schedule View Options</h3>
      <p className="text-sm text-muted-foreground">Customize how tasks are displayed in your schedule view.</p>

      <div className="flex items-center justify-between">
        <Label htmlFor="schedule-focus-toggle">Show only Focus Mode tasks</Label>
        <Switch
          id="schedule-focus-toggle"
          checked={settings?.schedule_show_focus_tasks_only ?? true} // Corrected property name
          onCheckedChange={handleToggle}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        When enabled, only tasks from sections marked for "Focus Mode" will appear in the unscheduled tasks list.
      </p>
    </div>
  );
};

export default ScheduleSettings;