import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProjects } from '@/hooks/useProjects';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { Project } from '@/types/task';

const ProjectTrackerSettings: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const { projects, isLoading: projectsLoading, error: projectsError, addProject, updateProject, deleteProject, resetAllProjectCounts } = useProjects(userId);
  const { settings, isLoading: settingsLoading, error: settingsError, updateSettings } = useSettings(userId);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectLink, setNewProjectLink] = useState('');
  const [projectTrackerTitle, setProjectTrackerTitle] = useState('');

  useEffect(() => {
    if (settings) {
      setProjectTrackerTitle(settings.project_tracker_title);
    }
  }, [settings]);

  const handleAddProject = async () => {
    if (!newProjectName.trim()) {
      showError('Project name cannot be empty.');
      return;
    }
    await addProject(newProjectName.trim(), newProjectDescription.trim(), newProjectLink.trim());
    setNewProjectName('');
    setNewProjectDescription('');
    setNewProjectLink('');
  };

  const handleUpdateProject = async (projectId: string, updates: Partial<Project>) => {
    await updateProject(projectId, updates);
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject(projectId);
  };

  const handleSaveProjectTrackerTitle = async () => {
    if (!projectTrackerTitle.trim()) {
      showError('Project tracker title cannot be empty.');
      return;
    }
    await updateSettings({ project_tracker_title: projectTrackerTitle.trim() });
  };

  const handleResetAllCounts = async () => {
    await resetAllProjectCounts();
  };

  if (projectsLoading || settingsLoading) {
    return <div className="p-4">Loading project settings...</div>;
  }

  if (projectsError || settingsError) {
    return <div className="p-4 text-red-500">Error loading project settings.</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Tracker Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="project-tracker-title">Tracker Title</Label>
          <Input
            id="project-tracker-title"
            value={projectTrackerTitle}
            onChange={(e) => setProjectTrackerTitle(e.target.value)}
            onBlur={handleSaveProjectTrackerTitle}
            placeholder="e.g., Project Balance Tracker"
          />
          <Button variant="outline" className="mt-2" onClick={handleSaveProjectTrackerTitle}>Save Title</Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Add New Project</h3>
          <Input
            placeholder="Project Name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
          <Input
            placeholder="Description (optional)"
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
          />
          <Input
            placeholder="Link (optional)"
            value={newProjectLink}
            onChange={(e) => setNewProjectLink(e.target.value)}
          />
          <Button onClick={handleAddProject}>Add Project</Button>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Existing Projects</h3>
          {projects.length === 0 ? (
            <p className="text-gray-500">No projects added yet.</p>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-2 border rounded-md">
                <Input
                  value={project.name}
                  onChange={(e) => handleUpdateProject(project.id, { name: e.target.value })}
                  className="flex-grow mr-2"
                />
                <Button variant="destructive" size="sm" onClick={() => handleDeleteProject(project.id)}>
                  Delete
                </Button>
              </div>
            ))
          )}
        </div>

        <Button variant="outline" onClick={handleResetAllCounts}>Reset All Project Counts</Button>
      </CardContent>
    </Card>
  );
};

export default ProjectTrackerSettings;