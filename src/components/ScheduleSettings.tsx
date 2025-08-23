import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'react-hot-toast';
import { Json } from '@/types';

const ScheduleSettings: React.FC = () => {
  const { settings, isLoading, updateSettings } = useSettings();

  const handleToggleShowFocusTasksOnly = async (checked: boolean) => {
    try {
      await updateSettings({ schedule_show_focus_tasks_only: checked });
      toast.success('Setting updated!');
    } catch (error) {
      toast.error('Failed to update setting.');
      console.error('Error updating setting:', error);
    }
  };

  const handleFutureTasksDaysVisibleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      try {
        await updateSettings({ future_tasks_days_visible: value });
        toast.success('Setting updated!');
      } catch (error) {
        toast.error('Failed to update setting.');
        console.error('Error updating setting:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Schedule Settings</CardTitle></CardHeader>
        <CardContent><p>Loading settings...</p></CardContent>
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
          <Label htmlFor="schedule-show-focus-tasks-only">Show Focus Tasks Only in Schedule</Label>
          <Switch
            id="schedule-show-focus-tasks-only"
            checked={settings?.schedule_show_focus_tasks_only ?? true}
            onCheckedChange={handleToggleShowFocusTasksOnly}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="future-tasks-days-visible">Future Tasks Visible Days</Label>
          <Input
            id="future-tasks-days-visible"
            type="number"
            min="0"
            value={settings?.future_tasks_days_visible ?? 7}
            onChange={handleFutureTasksDaysVisibleChange}
            className="w-24"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduleSettings;