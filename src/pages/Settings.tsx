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
import TimePicker from '@/components/ui/time-picker';
import { format, parseISO } from 'date-fns';
import { showError, showSuccess } from '@/utils/toast';
import { WorkHour } from '@/types/task';
import { WorkHourState, SettingsPageProps } from '@/types/props';
import ProjectTrackerSettings from '@/components/ProjectTrackerSettings';

const SettingsPage: React.FC<SettingsPageProps> = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const { settings, isLoading: settingsLoading, error: settingsError, updateSettings } = useSettings({ userId });
  const { allWorkHours, isLoading: workHoursLoading, error: workHoursError, saveWorkHours } = useWorkHours({ userId });

  const [projectTrackerTitle, setProjectTrackerTitle] = useState('');
  const [scheduleShowFocusTasksOnly, setScheduleShowFocusTasksOnly] = useState(true);
  const [futureTasksDaysVisible, setFutureTasksDaysVisible] = useState(7);
  const [localWorkHours, setLocalWorkHours] = useState<WorkHourState[]>([]);

  useEffect(() => {
    if (settings) {
      setProjectTrackerTitle(settings.project_tracker_title);
      setScheduleShowFocusTasksOnly(settings.schedule_show_focus_tasks_only);
      setFutureTasksDaysVisible(settings.future_tasks_days_visible);
    }
  }, [settings]);

  useEffect(() => {
    if (allWorkHours) {
      const allDaysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const initializedHours: WorkHourState[] = allDaysOfWeek.map(day => {
        const existing = allWorkHours.find(wh => wh.day_of_week === day);
        return {
          id: existing?.id,
          day_of_week: day,
          start_time: existing?.start_time || '09:00:00',
          end_time: existing?.end_time || '17:00:00',
          enabled: existing?.enabled ?? false,
        };
      });
      setLocalWorkHours(initializedHours);
    }
  }, [allWorkHours]);

  const handleSaveGeneralSettings = async () => {
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
      showSuccess('General settings saved successfully!');
    } catch (error: any) {
      showError('Failed to save general settings.');
      console.error('Error saving general settings:', error);
    }
  };

  const handleWorkHourChange = (day: string, field: 'start_time' | 'end_time' | 'enabled', value: string | boolean) => {
    setLocalWorkHours(prevHours => {
      return prevHours.map(wh => {
        if (wh.day_of_week === day) {
          return { ...wh, [field]: value };
        }
        return wh;
      });
    });
  };

  const handleSaveWorkHours = async () => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      const hoursToSave: WorkHour[] = localWorkHours.map(localHour => ({
        id: localHour.id || crypto.randomUUID(),
        user_id: userId,
        day_of_week: localHour.day_of_week,
        start_time: localHour.start_time,
        end_time: localHour.end_time,
        enabled: localHour.enabled,
      }));

      await saveWorkHours(hoursToSave);
      showSuccess('Work hours saved successfully!');
    } catch (error: any) {
      showError('Failed to save work hours.');
      console.error('Error saving work hours:', error);
    }
  };

  if (settingsLoading || workHoursLoading) {
    return <div className="p-4 md:p-6">Loading settings...</div>;
  }

  if (settingsError || workHoursError) {
    return <div className="p-4 md:p-6 text-red-500">Error loading settings: {settingsError?.message || workHoursError?.message}</div>;
  }

  const allDaysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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
                onCheckedChange={(checked: boolean) => setScheduleShowFocusTasksOnly(checked)}
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
            <Button onClick={handleSaveGeneralSettings}>Save General Settings</Button>
          </CardContent>
        </Card>

        <ProjectTrackerSettings />

        <Card>
          <CardHeader>
            <CardTitle>Work Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {allDaysOfWeek.map(day => {
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