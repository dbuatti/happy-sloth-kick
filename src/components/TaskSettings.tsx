import React, { useState, useEffect, useCallback } from 'react';
import { useSettingsContext } from '@/context/SettingsContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { showSuccess } from '@/utils/toast'; // Removed showError
import { Textarea } from '@/components/ui/textarea';

const TaskSettings: React.FC = () => {
  const { settings, isLoading, updateSettings } = useSettingsContext();

  const [projectTrackerTitle, setProjectTrackerTitle] = useState(settings.project_tracker_title);
  const [meditationNotes, setMeditationNotes] = useState(settings.meditation_notes || '');

  useEffect(() => {
    if (settings) {
      setProjectTrackerTitle(settings.project_tracker_title);
      setMeditationNotes(settings.meditation_notes || '');
    }
  }, [settings]);

  const handleSaveSettings = useCallback(async () => {
    await updateSettings({
      project_tracker_title: projectTrackerTitle,
      meditation_notes: meditationNotes,
    });
    showSuccess('Task settings updated!');
  }, [projectTrackerTitle, meditationNotes, updateSettings]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Task Settings</CardTitle></CardHeader>
        <CardContent className="text-center text-muted-foreground">Loading...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Settings</CardTitle>
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
        <div>
          <Label htmlFor="meditation-notes">Meditation Notes</Label>
          <Textarea
            id="meditation-notes"
            value={meditationNotes}
            onChange={(e) => setMeditationNotes(e.target.value)}
            rows={4}
          />
        </div>
        <Button onClick={handleSaveSettings} className="w-full">Save Task Settings</Button>
      </CardContent>
    </Card>
  );
};

export default TaskSettings;