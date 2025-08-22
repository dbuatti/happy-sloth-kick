import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { useWorkHours } from '@/hooks/useWorkHours';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsPageProps } from '@/types/props';
import WorkHoursSettings from '@/components/WorkHoursSettings';
import { showError, showSuccess } from '@/utils/toast';

const SettingsPage: React.FC<SettingsPageProps> = ({ isDemo: propIsDemo, demoUserId }) => {
  const { user } = useAuth();
  const userId = user?.id || demoUserId;
  const isDemo = propIsDemo || user?.id === 'd889323b-350c-4764-9788-6359f85f6142';

  const { settings, isLoading: settingsLoading, error: settingsError, updateSettings } = useSettings({ userId });
  const { allWorkHours, isLoading: workHoursLoading, error: workHoursError, saveWorkHours } = useWorkHours({ userId });

  const [projectTrackerTitle, setProjectTrackerTitle] = useState(settings?.project_tracker_title || 'Project Balance Tracker');
  const [meditationNotes, setMeditationNotes] = useState(settings?.meditation_notes || '');
  const [scheduleShowFocusTasksOnly, setScheduleShowFocusTasksOnly] = useState(settings?.schedule_show_focus_tasks_only ?? true);
  const [futureTasksDaysVisible, setFutureTasksDaysVisible] = useState(settings?.future_tasks_days_visible || 7);

  useEffect(() => {
    if (settings) {
      setProjectTrackerTitle(settings.project_tracker_title);
      setMeditationNotes(settings.meditation_notes || '');
      setScheduleShowFocusTasksOnly(settings.schedule_show_focus_tasks_only);
      setFutureTasksDaysVisible(settings.future_tasks_days_visible);
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      await updateSettings({
        project_tracker_title: projectTrackerTitle,
        meditation_notes: meditationNotes,
        schedule_show_focus_tasks_only: scheduleShowFocusTasksOnly,
        future_tasks_days_visible: futureTasksDaysVisible,
      });
      showSuccess('Settings saved successfully!');
    } catch (error: any) {
      showError('Failed to save settings.');
      console.error('Error saving settings:', error);
    }
  };

  if (settingsLoading || workHoursLoading) {
    return <div className="p-4 md:p-6">Loading settings...</div>;
  }

  if (settingsError || workHoursError) {
    return <div className="p-4 md:p-6 text-red-500">Error loading settings: {settingsError?.message || workHoursError?.message}</div>;
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="project-tracker-title">Project Tracker Title</Label>
              <Input
                id="project-tracker-title"
                value={projectTrackerTitle}
                onChange={(e) => setProjectTrackerTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meditation-notes">Meditation Notes</Label>
              <Textarea
                id="meditation-notes"
                value={meditationNotes}
                onChange={(e) => setMeditationNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="schedule-focus-tasks-only">Show Focus Tasks Only in Schedule</Label>
              <Switch
                id="schedule-focus-tasks-only"
                checked={scheduleShowFocusTasksOnly}
                onCheckedChange={setScheduleShowFocusTasksOnly}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="future-tasks-days-visible">Future Tasks Days Visible</Label>
              <Input
                id="future-tasks-days-visible"
                type="number"
                value={futureTasksDaysVisible}
                onChange={(e) => setFutureTasksDaysVisible(parseInt(e.target.value) || 0)}
              />
            </div>
            <Button onClick={handleSaveSettings}>Save General Settings</Button>
          </CardContent>
        </Card>

        <WorkHoursSettings />
      </div>
    </div>
  );
};

export default SettingsPage;