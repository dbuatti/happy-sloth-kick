"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSettings, DEFAULT_SETTINGS, UserSettings } from '@/hooks/useSettings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { Textarea } from '@/components/ui/textarea';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { supabase } from '@/integrations/supabase/client';
import { Settings as SettingsIcon, LogOut, Trash2, RefreshCcw } from 'lucide-react';

interface SettingsPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user, signOut } = useAuth(); // Destructure signOut directly from useAuth
  const userId = demoUserId || user?.id;
  const { settings, isLoading, updateSettings } = useSettings({ userId }); // Destructure isLoading from useSettings
  const navigate = useNavigate();

  const [projectTrackerTitle, setProjectTrackerTitle] = useState(settings?.project_tracker_title || DEFAULT_SETTINGS.project_tracker_title);
  const [scheduleShowFocusTasksOnly, setScheduleShowFocusTasksOnly] = useState(settings?.schedule_show_focus_tasks_only || DEFAULT_SETTINGS.schedule_show_focus_tasks_only);
  const [futureTasksDaysVisible, setFutureTasksDaysVisible] = useState(String(settings?.future_tasks_days_visible || DEFAULT_SETTINGS.future_tasks_days_visible));
  const [meditationNotes, setMeditationNotes] = useState(settings?.meditation_notes || DEFAULT_SETTINGS.meditation_notes || '');
  const [pomodoroWorkDuration, setPomodoroWorkDuration] = useState(String(settings?.pomodoro_work_duration || DEFAULT_SETTINGS.pomodoro_work_duration));
  const [pomodoroShortBreakDuration, setPomodoroShortBreakDuration] = useState(String(settings?.pomodoro_short_break_duration || DEFAULT_SETTINGS.pomodoro_short_break_duration));
  const [pomodoroLongBreakDuration, setPomodoroLongBreakDuration] = useState(String(settings?.pomodoro_long_break_duration || DEFAULT_SETTINGS.pomodoro_long_break_duration));
  const [pomodoroRoundsBeforeLongBreak, setPomodoroRoundsBeforeLongBreak] = useState(String(settings?.pomodoro_rounds_before_long_break || DEFAULT_SETTINGS.pomodoro_rounds_before_long_break));

  const [isConfirmSignOutOpen, setIsConfirmSignOutOpen] = useState(false);
  const [isConfirmDeleteAccountOpen, setIsConfirmDeleteAccountOpen] = useState(false);
  const [isConfirmResetSettingsOpen, setIsConfirmResetSettingsOpen] = useState(false);

  useEffect(() => {
    if (settings) {
      setProjectTrackerTitle(settings.project_tracker_title);
      setScheduleShowFocusTasksOnly(settings.schedule_show_focus_tasks_only);
      setFutureTasksDaysVisible(String(settings.future_tasks_days_visible));
      setMeditationNotes(settings.meditation_notes || '');
      setPomodoroWorkDuration(String(settings.pomodoro_work_duration));
      setPomodoroShortBreakDuration(String(settings.pomodoro_short_break_duration));
      setPomodoroLongBreakDuration(String(settings.pomodoro_long_break_duration));
      setPomodoroRoundsBeforeLongBreak(String(settings.pomodoro_rounds_before_long_break));
    }
  }, [settings]);

  const handleSaveSettings = useCallback(async () => {
    if (isDemo) {
      showError('Settings cannot be saved in demo mode.');
      return;
    }

    const updates: Partial<UserSettings> = {
      project_tracker_title: projectTrackerTitle,
      schedule_show_focus_tasks_only: scheduleShowFocusTasksOnly,
      future_tasks_days_visible: parseInt(futureTasksDaysVisible, 10),
      meditation_notes: meditationNotes,
      pomodoro_work_duration: parseInt(pomodoroWorkDuration, 10),
      pomodoro_short_break_duration: parseInt(pomodoroShortBreakDuration, 10),
      pomodoro_long_break_duration: parseInt(pomodoroLongBreakDuration, 10),
      pomodoro_rounds_before_long_break: parseInt(pomodoroRoundsBeforeLongBreak, 10),
    };

    if (isNaN(updates.future_tasks_days_visible!) || updates.future_tasks_days_visible! < -1) {
      showError('Future tasks days visible must be a number (-1 for all).');
      return;
    }
    if (isNaN(updates.pomodoro_work_duration!) || updates.pomodoro_work_duration! <= 0) {
      showError('Pomodoro work duration must be a positive number.');
      return;
    }
    if (isNaN(updates.pomodoro_short_break_duration!) || updates.pomodoro_short_break_duration! <= 0) {
      showError('Pomodoro short break duration must be a positive number.');
      return;
    }
    if (isNaN(updates.pomodoro_long_break_duration!) || updates.pomodoro_long_break_duration! <= 0) {
      showError('Pomodoro long break duration must be a positive number.');
      return;
    }
    if (isNaN(updates.pomodoro_rounds_before_long_break!) || updates.pomodoro_rounds_before_long_break! <= 0) {
      showError('Pomodoro rounds before long break must be a positive number.');
      return;
    }

    await updateSettings(updates);
  }, [
    isDemo,
    projectTrackerTitle,
    scheduleShowFocusTasksOnly,
    futureTasksDaysVisible,
    meditationNotes,
    pomodoroWorkDuration,
    pomodoroShortBreakDuration,
    pomodoroLongBreakDuration,
    pomodoroRoundsBeforeLongBreak,
    updateSettings,
    settings,
  ]);

  const handleSignOut = useCallback(async () => {
    if (isDemo) {
      navigate('/demo');
      return;
    }
    await signOut();
    navigate('/');
  }, [signOut, navigate, isDemo]);

  const handleDeleteAccount = useCallback(async () => {
    if (isDemo) {
      showError('Account deletion is not available in demo mode.');
      return;
    }
    if (!userId) {
      showError('User not authenticated.');
      return;
    }

    try {
      const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
      if (profileError) throw profileError;

      const { error: settingsError } = await supabase.from('user_settings').delete().eq('user_id', userId);
      if (settingsError) throw settingsError;

      await signOut();
      showSuccess('Account and data deleted successfully.');
      navigate('/');
    } catch (error: any) {
      showError(`Failed to delete account: ${error.message}`);
      console.error('Error deleting account:', error);
    } finally {
      setIsConfirmDeleteAccountOpen(false);
    }
  }, [isDemo, userId, signOut, navigate]);

  const handleResetSettings = useCallback(async () => {
    if (isDemo) {
      showError('Settings cannot be reset in demo mode.');
      return;
    }
    if (!userId) {
      showError('User not authenticated.');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ ...DEFAULT_SETTINGS, user_id: userId })
        .eq('user_id', userId);

      if (error) throw error;

      showSuccess('Settings reset to default!');
      await updateSettings({});
    } catch (error: any) {
      showError(`Failed to reset settings: ${error.message}`);
      console.error('Error resetting settings:', error);
    } finally {
      setIsConfirmResetSettingsOpen(false);
    }
  }, [isDemo, userId, updateSettings]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto p-4 lg:p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6 flex items-center gap-2">
        <SettingsIcon className="h-8 w-8 text-primary" /> Settings
      </h1>

      <div className="space-y-6">
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
                disabled={isDemo}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="schedule-focus-tasks-only">Schedule: Show Focus Tasks Only</Label>
              <Switch
                id="schedule-focus-tasks-only"
                checked={scheduleShowFocusTasksOnly}
                onCheckedChange={setScheduleShowFocusTasksOnly}
                disabled={isDemo}
              />
            </div>
            <div>
              <Label htmlFor="future-tasks-days-visible">Future Tasks Days Visible (-1 for all)</Label>
              <Input
                id="future-tasks-days-visible"
                type="number"
                value={futureTasksDaysVisible}
                onChange={(e) => setFutureTasksDaysVisible(e.target.value)}
                disabled={isDemo}
              />
            </div>
            <div>
              <Label htmlFor="meditation-notes">Meditation Notes</Label>
              <Textarea
                id="meditation-notes"
                value={meditationNotes}
                onChange={(e) => setMeditationNotes(e.target.value)}
                rows={4}
                disabled={isDemo}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pomodoro Timer Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pomodoro-work-duration">Work Duration (minutes)</Label>
              <Input
                id="pomodoro-work-duration"
                type="number"
                value={pomodoroWorkDuration}
                onChange={(e) => setPomodoroWorkDuration(e.target.value)}
                min="1"
                disabled={isDemo}
              />
            </div>
            <div>
              <Label htmlFor="pomodoro-short-break-duration">Short Break Duration (minutes)</Label>
              <Input
                id="pomodoro-short-break-duration"
                type="number"
                value={pomodoroShortBreakDuration}
                onChange={(e) => setPomodoroShortBreakDuration(e.target.value)}
                min="1"
                disabled={isDemo}
              />
            </div>
            <div>
              <Label htmlFor="pomodoro-long-break-duration">Long Break Duration (minutes)</Label>
              <Input
                id="pomodoro-long-break-duration"
                type="number"
                value={pomodoroLongBreakDuration}
                onChange={(e) => setPomodoroLongBreakDuration(e.target.value)}
                min="1"
                disabled={isDemo}
              />
            </div>
            <div>
              <Label htmlFor="pomodoro-rounds-before-long-break">Rounds Before Long Break</Label>
              <Input
                id="pomodoro-rounds-before-long-break"
                type="number"
                value={pomodoroRoundsBeforeLongBreak}
                onChange={(e) => setPomodoroRoundsBeforeLongBreak(e.target.value)}
                min="1"
                disabled={isDemo}
              />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSaveSettings} className="w-full" disabled={isDemo}>
          Save Settings
        </Button>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => setIsConfirmResetSettingsOpen(true)} className="w-full" disabled={isDemo}>
              <RefreshCcw className="h-4 w-4 mr-2" /> Reset Settings to Default
            </Button>
            <Button variant="outline" onClick={() => setIsConfirmSignOutOpen(true)} className="w-full">
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
            <Button variant="destructive" onClick={() => setIsConfirmDeleteAccountOpen(true)} className="w-full" disabled={isDemo}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmationDialog
        isOpen={isConfirmSignOutOpen}
        onClose={() => setIsConfirmSignOutOpen(false)}
        onConfirm={handleSignOut}
        title="Confirm Sign Out"
        description="Are you sure you want to sign out?"
        confirmText="Sign Out"
        confirmVariant="default"
      />

      <ConfirmationDialog
        isOpen={isConfirmDeleteAccountOpen}
        onClose={() => setIsConfirmDeleteAccountOpen(false)}
        onConfirm={handleDeleteAccount}
        title="Confirm Account Deletion"
        description="WARNING: This action is irreversible. All your data will be permanently deleted. Are you absolutely sure?"
        confirmText="Delete Account"
        confirmVariant="destructive"
      />

      <ConfirmationDialog
        isOpen={isConfirmResetSettingsOpen}
        onClose={() => setIsConfirmResetSettingsOpen(false)}
        onConfirm={handleResetSettings}
        title="Confirm Reset Settings"
        description="Are you sure you want to reset all your settings to their default values?"
        confirmText="Reset Settings"
        confirmVariant="destructive"
      />
    </div>
  );
};

export default SettingsPage;