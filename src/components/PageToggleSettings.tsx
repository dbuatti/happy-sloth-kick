import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/context/SettingsContext';
import { Json } from '@/types';
import { toast } from 'react-hot-toast';

const pageOptions = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'daily_tasks', name: 'Daily Tasks' },
  { id: 'task_calendar', name: 'Task Calendar' },
  { id: 'time_block_schedule', name: 'Time Block Schedule' },
  { id: 'focus_mode', name: 'Focus Mode' },
  { id: 'sleep_tracker', name: 'Sleep Tracker' },
  { id: 'dev_space', name: 'Dev Space' },
  { id: 'people_memory', name: 'People Memory' },
  { id: 'archive', name: 'Archive' },
];

const PageToggleSettings: React.FC = () => {
  const { settings, loading, updateSettings } = useSettings();

  const handleTogglePageVisibility = async (pageId: string, checked: boolean) => {
    try {
      const updatedVisiblePages = {
        ...(settings?.visible_pages as Record<string, boolean> || {}),
        [pageId]: checked,
      };
      await updateSettings({ visible_pages: updatedVisiblePages as Json });
      toast.success('Page visibility updated!');
    } catch (error) {
      toast.error('Failed to update page visibility.');
      console.error(error);
    }
  };

  if (loading) {
    return <p>Loading settings...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Page Visibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pageOptions.map((page) => (
          <div key={page.id} className="flex items-center justify-between">
            <Label htmlFor={`toggle-${page.id}`}>{page.name}</Label>
            <Switch
              id={`toggle-${page.id}`}
              checked={settings?.visible_pages?.[page.id] ?? true} // Default to true if not set
              onCheckedChange={(checked) => handleTogglePageVisibility(page.id, checked)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PageToggleSettings;