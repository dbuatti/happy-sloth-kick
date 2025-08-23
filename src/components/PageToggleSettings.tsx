import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/context/SettingsContext';
import { Json } from '@/types';
import { toast } from 'react-hot-toast';

const PageToggleSettings: React.FC = () => {
  const { settings, updateSettings } = useSettings();

  const handleTogglePageVisibility = async (pageKey: string, isVisible: boolean) => {
    const newVisiblePages = { ...(settings?.visible_pages as Json), [pageKey]: isVisible };
    try {
      await updateSettings({ visible_pages: newVisiblePages as Json });
      toast.success('Page visibility updated!');
    } catch (error) {
      toast.error('Failed to update page visibility.');
      console.error('Error updating page visibility:', error);
    }
  };

  const availablePages = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'focusMode', label: 'Focus Mode' },
    { key: 'devSpace', label: 'Dev Space' },
    { key: 'sleepTracker', label: 'Sleep Tracker' },
    { key: 'myHub', label: 'My Hub' },
    { key: 'archive', label: 'Archive' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'projectTracker', label: 'Project Tracker' },
    { key: 'gratitudeJournal', label: 'Gratitude Journal' },
    { key: 'worryJournal', label: 'Worry Journal' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Visibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {availablePages.map((page) => (
          <div key={page.key} className="flex items-center justify-between">
            <Label htmlFor={`toggle-${page.key}`}>{page.label}</Label>
            <Switch
              id={`toggle-${page.key}`}
              checked={settings?.visible_pages?.[page.key] ?? true}
              onCheckedChange={(checked) => handleTogglePageVisibility(page.key, checked)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PageToggleSettings;