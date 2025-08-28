import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CalendarDays } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

const ScheduleSettings: React.FC = () => {
  const { settings, updateSettings } = useSettings();

  const handleToggleFocusTasksOnly = async (checked: boolean) => {
    await updateSettings({ schedule_show_focus_tasks_only: checked });
  };

  return (
    <Card className="w-full shadow-lg rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" /> Schedule Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">Configure how tasks appear in your daily schedule.</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <Label htmlFor="schedule-show-focus-tasks-only">Show Focus Tasks Only</Label>
          <Switch
            id="schedule-show-focus-tasks-only"
            checked={settings?.schedule_show_focus_tasks_only ?? true}
            onCheckedChange={handleToggleFocusTasksOnly}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          When enabled, only tasks marked as "Do Today" or in focus mode sections will appear in the unscheduled tasks panel of your daily schedule.
        </p>
      </CardContent>
    </Card>
  );
};

export default ScheduleSettings;