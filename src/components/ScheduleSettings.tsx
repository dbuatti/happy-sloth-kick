import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSettings } from '@/context/SettingsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Filter } from 'lucide-react';

const ScheduleSettings: React.FC = () => {
  const { settings, loading, updateSettings } = useSettings();

  const handleToggleFocusTasks = (checked: boolean) => {
    updateSettings({ schedule_show_focus_tasks_only: checked });
  };

  if (loading) {
    return (
      <Card className="w-full shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Filter className="h-6 w-6 text-primary" /> Schedule Options
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Filter className="h-6 w-6 text-primary" /> Schedule Options
        </CardTitle>
        <p className="text-sm text-muted-foreground">Customize your time-blocking experience.</p>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="schedule-focus-toggle" className="text-base font-medium flex items-center gap-2">
            Only show 'Focus Mode' tasks
          </Label>
          <Switch
            id="schedule-focus-toggle"
            checked={settings?.schedule_show_focus_tasks_only ?? true}
            onCheckedChange={handleToggleFocusTasks}
            aria-label="Toggle showing only focus mode tasks in schedule"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          When enabled, the task list in the schedule view will only show tasks from sections included in Focus Mode.
        </p>
      </CardContent>
    </Card>
  );
};

export default ScheduleSettings;