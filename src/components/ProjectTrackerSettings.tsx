import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { useSettings } from '@/hooks/useSettings';
import { showError, showSuccess } from '@/utils/toast';

const ProjectTrackerSettings: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const { resetAllProjectCounts } = useProjects({ userId });
  const { settings, isLoading, error, updateSettings } = useSettings({ userId });

  const [projectTrackerTitle, setProjectTrackerTitle] = useState('');

  useEffect(() => {
    if (settings) {
      setProjectTrackerTitle(settings.project_tracker_title);
    }
  }, [settings]);

  const handleSaveTitle = async () => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    if (!projectTrackerTitle.trim()) {
      showError('Title cannot be empty.');
      return;
    }
    try {
      await updateSettings({ project_tracker_title: projectTrackerTitle.trim() });
      showSuccess('Project tracker title updated!');
    } catch (err: any) {
      showError('Failed to update title.');
      console.error('Error updating project tracker title:', err);
    }
  };

  const handleResetCounts = async () => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    try {
      await resetAllProjectCounts();
      showSuccess('All project counts reset!');
    } catch (err: any) {
      showError('Failed to reset project counts.');
      console.error('Error resetting project counts:', err);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Tracker Settings</CardTitle>
        </CardHeader>
        <CardContent>Loading settings...</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Tracker Settings</CardTitle>
        </CardHeader>
        <CardContent className="text-red-500">Error loading settings.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Tracker Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="project-tracker-title">Tracker Title</Label>
          <Input
            id="project-tracker-title"
            value={projectTrackerTitle}
            onChange={(e) => setProjectTrackerTitle(e.target.value)}
          />
          <Button onClick={handleSaveTitle} className="mt-2">
            Save Title
          </Button>
        </div>
        <div>
          <Button variant="destructive" onClick={handleResetCounts}>
            Reset All Project Counts
          </Button>
          <p className="text-sm text-gray-500 mt-1">
            This will set all project counts back to 0.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectTrackerSettings;