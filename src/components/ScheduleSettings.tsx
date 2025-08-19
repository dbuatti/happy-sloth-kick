import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useSettings } from '@/context/SettingsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Filter, Clock } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

const ScheduleSettings: React.FC = () => {
  const { settings, loading, updateSettings } = useSettings();

  const [localMinHour, setLocalMinHour] = useState(settings?.min_schedule_hour ?? 0);
  const [localMaxHour, setLocalMaxHour] = useState(settings?.max_schedule_hour ?? 24);

  const debouncedMinHour = useDebounce(localMinHour, 500);
  const debouncedMaxHour = useDebounce(localMaxHour, 500);

  useEffect(() => {
    if (settings) {
      setLocalMinHour(settings.min_schedule_hour ?? 0);
      setLocalMaxHour(settings.max_schedule_hour ?? 24);
    }
  }, [settings]);

  useEffect(() => {
    if (!loading && settings && debouncedMinHour !== (settings.min_schedule_hour ?? 0)) {
      updateSettings({ min_schedule_hour: debouncedMinHour });
    }
  }, [debouncedMinHour, settings, loading, updateSettings]);

  useEffect(() => {
    if (!loading && settings && debouncedMaxHour !== (settings.max_schedule_hour ?? 24)) {
      updateSettings({ max_schedule_hour: debouncedMaxHour });
    }
  }, [debouncedMaxHour, settings, loading, updateSettings]);

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

        <div className="space-y-2">
          <h4 className="text-base font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Viewable Hours
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min-schedule-hour">Start Hour (0-23)</Label>
              <Input
                id="min-schedule-hour"
                type="number"
                min={0}
                max={23}
                value={localMinHour}
                onChange={(e) => setLocalMinHour(parseInt(e.target.value) || 0)}
                className="h-9 text-base"
              />
            </div>
            <div>
              <Label htmlFor="max-schedule-hour">End Hour (1-24)</Label>
              <Input
                id="max-schedule-hour"
                type="number"
                min={1}
                max={24}
                value={localMaxHour}
                onChange={(e) => setLocalMaxHour(parseInt(e.target.value) || 24)}
                className="h-9 text-base"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Set the range of hours displayed in your daily and weekly schedules.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduleSettings;