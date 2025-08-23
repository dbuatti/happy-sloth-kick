import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit, Save } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'react-hot-toast';

const ProjectTrackerSettings: React.FC = () => {
  const { settings, updateSettings, isLoading: settingsLoading } = useSettings();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [projectTrackerTitle, setProjectTrackerTitle] = useState(settings?.project_tracker_title || 'Project Balance Tracker');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setProjectTrackerTitle(settings.project_tracker_title || 'Project Balance Tracker');
    }
  }, [settings]);

  const handleSaveTitle = async () => {
    setIsSaving(true);
    try {
      await updateSettings({ project_tracker_title: projectTrackerTitle });
      toast.success('Project tracker title updated!');
      setIsEditingTitle(false);
    } catch (error) {
      toast.error('Failed to update title.');
      console.error('Error updating project tracker title:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (settingsLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Project Tracker Settings</CardTitle></CardHeader>
        <CardContent><p>Loading settings...</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Tracker Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="project-tracker-title">Tracker Title</Label>
          {isEditingTitle ? (
            <div className="flex items-center space-x-2">
              <Input
                id="project-tracker-title"
                value={projectTrackerTitle}
                onChange={(e) => setProjectTrackerTitle(e.target.value)}
                className="w-48"
              />
              <Button size="sm" onClick={handleSaveTitle} disabled={isSaving}>
                <Save className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span>{projectTrackerTitle}</span>
              <Button variant="ghost" size="icon" onClick={() => setIsEditingTitle(true)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectTrackerSettings;