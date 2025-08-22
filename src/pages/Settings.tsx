import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { useWorkHours } from '@/hooks/useWorkHours';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TimePicker } from '@/components/ui/time-picker';
import { format, parseISO } from 'date-fns';
import { showError, showSuccess } from '@/utils/toast';
import { UserSettings, WorkHour } from '@/types/task';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const { settings, loading: settingsLoading, updateSettings } = useSettings(userId);
  const { allWorkHours, loading: workHoursLoading, saveWorkHours } = useWorkHours(userId);

  const [projectTrackerTitle, setProjectTrackerTitle] = useState('');
  const [scheduleShowFocusTasksOnly, setScheduleShowFocusTasksOnly] = useState(true);
  const [futureTasksDaysVisible, setFutureTasksDaysVisible] = useState(7);
  const [localWorkHours, setLocalWorkHours] = useState<WorkHour[]>([]);

  useEffect(() => {
    if (settings) {
      setProjectTrackerTitle(settings.project_tracker_title);
      setScheduleShowFocusTasksOnly(settings.schedule_show_focus_tasks_only);
      setFutureTasksDaysVisible(settings.future_tasks_days_visible);
    }
  }, [settings]);

  useEffect(() => {
    if (allWorkHours) {
      setLocalWorkHours(allWorkHours);
    }
  }, [allWorkHours]);

  const handleSaveSettings = async () => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      await updateSettings({
        project_tracker_title: projectTrackerTitle,
        schedule_show_focus_tasks_only: scheduleShowFocusTasksOnly,
        future_tasks_days_visible: futureTasksDaysVisible,
      });
      showSuccess('Settings saved successfully!');
    } catch (error) {
      showError('Failed to save settings.');
      console.error('Error saving settings:', error);
    }
  };

  const handleWorkHourChange = (day: string, field: 'start_time' | 'end_time' | 'enabled', value: string | boolean) => {
    setLocalWorkHours(prevHours => {
      const existing = prevHours.find(wh => wh.day_of_week === day);
      if (existing) {
        return prevHours.map(wh =>
          wh.day_of_week === day ? { ...wh, [field]: value } : wh
        );
      } else {
        // Create a new entry if it doesn't exist
        const newHour: WorkHour = {
          id: crypto.randomUUID(), // Generate a new ID for new entries
          user_id: userId!,
          day_of_week: day,
          start_time: '09:00:00', // Default start
          end_time: '17:00:00',   // Default end
          enabled: true,
          ...({ [field]: value } as Partial<WorkHour>), // Apply the specific field change
        };
        return [...prevHours, newHour];
      }
    });
  };

  const handleSaveWorkHours = async () => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      await saveWorkHours(localWorkHours);
      showSuccess('Work hours saved successfully!');
    } catch (error) {
      showError('Failed to save work hours.');
      console.error('Error saving work hours:', error);
    }
  };

  if (settingsLoading || workHoursLoading) {
    return <div className="p-4 md:p-6">Loading settings...</div>;
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
            <div>
              <Label htmlFor="project-tracker-title">Project Tracker Title</Label>
              <Input
                id="project-tracker-title"
                value={projectTrackerTitle}
                onChange={(e) => setProjectTrackerTitle(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="schedule-focus-tasks">Show only focus tasks in schedule</Label>
              <Switch
                id="schedule-focus-tasks"
                checked={scheduleShowFocusTasksOnly}
                onCheckedChange={setScheduleShowFocusTasksOnly}
              />
            </div>
            <div>
              <Label htmlFor="future-tasks-days">Future tasks visible days</Label>
              <Input
                id="future-tasks-days"
                type="number"
                value={futureTasksDaysVisible}
                onChange={(e) => setFutureTasksDaysVisible(parseInt(e.target.value))}
                min={1}
              />
            </div>
            <Button onClick={handleSaveSettings}>Save General Settings</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
              const dayWorkHour = localWorkHours.find(wh => wh.day_of_week === day);
              const startTime = dayWorkHour?.start_time ? parseISO(`2000-01-01T${dayWorkHour.start_time}`) : undefined;
              const endTime = dayWorkHour?.end_time ? parseISO(`2000-01-01T${dayWorkHour.end_time}`) : undefined;
              const enabled = dayWorkHour?.enabled ?? false;

              return (
                <div key={day} className="flex items-center justify-between space-x-2">
                  <Label className="w-24 capitalize">{day}</Label>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked: boolean) => handleWorkHourChange(day, 'enabled', checked)}
                  />
                  <TimePicker
                    date={startTime}
                    setDate={(date: Date | undefined) => handleWorkHourChange(day, 'start_time', date ? format(date, 'HH:mm:ss') : '00:00:00')}
                    disabled={!enabled}
                  />
                  <span>-</span>
                  <TimePicker
                    date={endTime}
                    setDate={(date: Date | undefined) => handleWorkHourChange(day, 'end_time', date ? format(date, 'HH:mm:ss') : '00:00:00')}
                    disabled={!enabled}
                  />
                </div>
              );
            })}
            <Button onClick={handleSaveWorkHours}>Save Work Hours</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;