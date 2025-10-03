import React, { useState, useEffect, useCallback } from 'react';
import { useSettingsContext } from '@/context/SettingsContext'; // Corrected import
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { showSuccess, showError } from '@/utils/toast';

const ScheduleSettings: React.FC = () => {
  const { settings, isLoading, updateSettings } = useSettingsContext(); // Corrected destructuring and hook

  const [scheduleShowFocusTasksOnly, setScheduleShowFocusTasksOnly] = useState(settings.schedule_show_focus_tasks_only);
  const [futureTasksDaysVisible, setFutureTasksDaysVisible] = useState(String(settings.future_tasks_days_visible));

  useEffect(() => {
    if (settings) {
      setScheduleShowFocusTasksOnly(settings.schedule_show_focus_tasks_only);
      setFutureTasksDaysVisible(String(settings.future_tasks_days_visible));
    }
  }, [settings]);

  const handleSaveSettings = useCallback(async () => {
    const parsedDays = parseInt(futureTasksDaysVisible, 10);
    if (isNaN(parsedDays) || parsedDays < -1) {
      showError('Future tasks days visible must be a number (-1 for all).');
      return;
    }

    await updateSettings({
      schedule_show_focus_tasks_only: scheduleShowFocusTasksOnly,
      future_tasks_days_visible: parsedDays,
    });
    showSuccess('Schedule settings updated!');
  }, [scheduleShowFocusTasksOnly, futureTasksDaysVisible, updateSettings]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Schedule Settings</CardTitle></CardHeader>
        <CardContent className="text-center text-muted-foreground">Loading...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="schedule-focus-tasks-only">Show Focus Tasks Only</Label>
          <Switch
            id="schedule-focus-tasks-only"
            checked={scheduleShowFocusTasksOnly}
            onCheckedChange={setScheduleShowFocusTasksOnly}
          />
        </div>
        <div>
          <Label htmlFor="future-tasks-days-visible">Future Tasks Days Visible (-1 for all)</Label>
          <Input
            id="future-tasks-days-visible"
            type="number"
            value={futureTasksDaysVisible}
            onChange={(e) => setFutureTasksDaysVisible(e.target.value)}
          />
        </div>
        <Button onClick={handleSaveSettings} className="w-full">Save Schedule Settings</Button>
      </CardContent>
    </Card>
  );
};

export default ScheduleSettings;