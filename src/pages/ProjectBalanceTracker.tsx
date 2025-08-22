import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { useSettings } from '@/hooks/useSettings';
import { Project } from '@/types/task';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Minus, Edit, Trash2, RefreshCcw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProjectTrackerSettings from '@/components/ProjectTrackerSettings';
import { ProjectBalanceTrackerPageProps } from '@/types/props';

const ProjectBalanceTrackerPage: React.FC<ProjectBalanceTrackerPageProps> = ({ isDemo: propIsDemo, demoUserId }) => {
  const { user } = useAuth();
  const userId = user?.id || demoUserId;
  const isDemo = propIsDemo || user?.id === 'd889323b-350c-4764-9788-6359f85f6142';

  const {
    projects,
    isLoading: projectsLoading,
    error: projectsError,
    addProject,
    updateProject,
    deleteProject,
    incrementProjectCount,
    decrementProjectCount,
    resetAllProjectCounts,
    sortOption,
    setSortOption,
  } = useProjects(userId);

  const { settings, isLoading: settingsLoading, error: settingsError } = useSettings(userId);

  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectLink, setNewProjectLink] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const totalCount = useMemo(() => {
    return projects.reduce((sum, project) => sum + project.current_count, 0);
  }, [projects]);

  const handleAddProject = async () => {
    if (!newProjectName.trim()) return;
    await addProject(newProjectName.trim(), newProjectDescription.trim(), newProjectLink.trim());
    setNewProjectName('');
    setNewProjectDescription('');
    setNewProjectLink('');
    setIsAddProjectDialogOpen(false);
  };

  const handleResetAllCountsConfirm = async () => {
    await resetAllProjectCounts();
  };

  if (projectsLoading || settingsLoading) {
    return <div className="p-4 md:p-6">Loading projects...</div>;
  }

  if (projectsError || settingsError) {
    return <div className="p-4 md:p-6 text-red-500">Error loading projects: {projectsError?.message || settingsError?.message}</div>;
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">{settings?.project_tracker_title || 'Project Balance Tracker'}</h1>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Button onClick={() => setIsAddProjectDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Project
          </Button>
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Settings
          </Button>
        </div>
        <Select value={sortOption} onValueChange={setSortOption}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="countAsc">Count (Low to High)</SelectItem>
            <SelectItem value="countDesc">Count (High to Low)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.length === 0 ? (
          <p className="text-center text-gray-500 col-span-full">No projects added yet. Click "Add Project" to get started!</p>
        ) : (
          projects.map((project) => (
            <Card key={project.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => deleteProject(project.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {project.description && <p className="text-sm text-gray-600">{project.description}</p>}
                {project.link && (
                  <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm block">
                    {project.link}
                  </a>
                )}
                <div className="flex items-center space-x-2 mt-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => decrementProjectCount(project.id)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Progress value={(project.current_count / totalCount) * 100 || 0} className="flex-grow h-2" />
                  <span className="text-sm font-medium">{project.current_count}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => incrementProjectCount(project.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isAddProjectDialogOpen} onOpenChange={setIsAddProjectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Input id="description" value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link" className="text-right">Link</Label>
              <Input id="link" value={newProjectLink} onChange={(e) => setNewProjectLink(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsAddProjectDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddProject}>Add Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
          </DialogHeader>
          <ProjectTrackerSettings />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsSettingsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectBalanceTrackerPage;