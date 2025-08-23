import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/context/SettingsContext';
import { Json, UserSettings } from '@/types';
import { toast } from 'react-hot-toast';

const TaskSettings: React.FC = () => {
  const { settings, updateSettings } = useSettings();

  const handleToggleShowCompletedTasks = async (checked: boolean) => {
    try {
      await updateSettings({ visible_pages: { ...(settings?.visible_pages as Json), show_completed_tasks: checked } as Json });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="show-completed-tasks">Show Completed Tasks</Label>
          <Switch
            id="show-completed-tasks"
            checked={settings?.visible_pages?.show_completed_tasks ?? false}
            onCheckedChange={handleToggleShowCompletedTasks}
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

export default TaskSettings;