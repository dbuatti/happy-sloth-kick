import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'react-hot-toast';

const ScheduleSettings: React.FC = () => {
  const { settings, loading, updateSettings } = useSettings();

  const handleToggleShowFocusTasksOnly = async (checked: boolean) => {
    try {
      await updateSettings({ schedule_show_focus_tasks_only: checked });
      toast.success('Schedule display settings updated!');
    } catch (error) {
      toast.error('Failed to update settings.');
      console.error(error);
    }
  };

  if (loading) {
    return <p>Loading settings...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Schedule Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="show-focus-tasks-only">Show Focus Tasks Only in Schedule</Label>
          <Switch
            id="show-focus-tasks-only"
            checked={settings?.schedule_show_focus_tasks_only ?? true}
            onCheckedChange={handleToggleShowFocusTasksOnly}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduleSettings;