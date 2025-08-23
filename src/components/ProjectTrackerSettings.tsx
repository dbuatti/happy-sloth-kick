import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/context/SettingsContext';
import { Edit, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ProjectTrackerSettings: React.FC = () => {
  const { settings, updateSettings, loading: settingsLoading } = useSettings();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(settings?.project_tracker_title || 'Project Balance Tracker');

  useEffect(() => {
    if (settings) {
      setEditedTitle(settings.project_tracker_title);
    }
  }, [settings]);

  const handleSaveTitle = async () => {
    if (editedTitle.trim()) {
      try {
        await updateSettings({ project_tracker_title: editedTitle });
        toast.success('Project tracker title updated!');
        setIsEditingTitle(false);
      } catch (error: any) {
        toast.error(`Failed to update title: ${error.message}`);
      }
    } else {
      toast.error('Title cannot be empty.');
    }
  };

  if (settingsLoading) return <div className="text-center py-4">Loading settings...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Tracker Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <Label htmlFor="projectTrackerTitle" className="text-base">Project Tracker Title</Label>
          {isEditingTitle ? (
            <div className="flex items-center space-x-2">
              <Input
                id="projectTrackerTitle"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-64"
              />
              <Button size="sm" onClick={handleSaveTitle}>
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setIsEditingTitle(false); setEditedTitle(settings?.project_tracker_title || 'Project Balance Tracker'); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-lg font-semibold">{settings?.project_tracker_title}</span>
              <Button variant="ghost" size="sm" onClick={() => setIsEditingTitle(true)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500">Customize the title displayed for your Project Balance Tracker.</p>
      </CardContent>
    </Card>
  );
};

export default ProjectTrackerSettings;