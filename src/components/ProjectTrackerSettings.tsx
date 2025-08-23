import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Edit, Save, X } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'react-hot-toast';

const ProjectTrackerSettings: React.FC = () => {
  const { settings, updateSettings, loading: settingsLoading } = useSettings();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [projectTrackerTitle, setProjectTrackerTitle] = useState(settings?.project_tracker_title || 'Project Balance Tracker');

  useEffect(() => {
    setProjectTrackerTitle(settings?.project_tracker_title || 'Project Balance Tracker');
  }, [settings?.project_tracker_title]);

  const handleSaveTitle = async () => {
    if (!projectTrackerTitle.trim()) {
      toast.error('Title cannot be empty.');
      return;
    }
    try {
      await updateSettings({ project_tracker_title: projectTrackerTitle.trim() });
      setIsEditingTitle(false);
      toast.success('Project tracker title updated!');
    } catch (error) {
      toast.error('Failed to update title.');
      console.error(error);
    }
  };

  if (settingsLoading) {
    return <p>Loading settings...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Project Tracker Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="projectTrackerTitle" className="text-base">Tracker Title</Label>
          {isEditingTitle ? (
            <div className="flex items-center space-x-2">
              <Input
                id="projectTrackerTitle"
                value={projectTrackerTitle}
                onChange={(e) => setProjectTrackerTitle(e.target.value)}
                className="w-64"
              />
              <Button size="sm" onClick={handleSaveTitle}>
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setIsEditingTitle(false); setProjectTrackerTitle(settings?.project_tracker_title || 'Project Balance Tracker'); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">{settings?.project_tracker_title}</span>
              <Button variant="ghost" size="sm" onClick={() => setIsEditingTitle(true)}>
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