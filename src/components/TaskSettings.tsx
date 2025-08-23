import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/context/SettingsContext';
import { Json } from '@/types';
import { toast } from 'react-hot-toast';

const TaskSettings: React.FC = () => {
  const { settings, loading, updateSettings } = useSettings();

  const handleToggleShowCompletedTasks = async (checked: boolean) => {
    try {
      await updateSettings({ visible_pages: { ...settings?.visible_pages, show_completed_tasks: checked } as Json });
      toast.success('Task display settings updated!');
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
        <CardTitle className="text-lg font-medium">Task Settings</CardTitle>
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
      </CardContent>
    </Card>
  );
};

export default TaskSettings;