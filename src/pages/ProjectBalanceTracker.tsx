import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { Project, NewProjectData, UpdateProjectData, ProjectBalanceTrackerProps } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, ExternalLink, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProjectNotesDialog from '@/components/ProjectNotesDialog';
import { toast } from 'react-hot-toast';
import { useSettings } from '@/context/SettingsContext';

const ProjectBalanceTracker: React.FC<ProjectBalanceTrackerProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const { projects, isLoading, error, addProject, updateProject, deleteProject } = useProjects({ userId: currentUserId });
  const { settings } = useSettings();

  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectLink, setNewProjectLink] = useState('');

  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');
  const [editProjectLink, setEditProjectLink] = useState('');

  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [projectWithNotes, setProjectWithNotes] = useState<Project | null>(null);

  const [sortOption, setSortOption] = useState('created_at');

  const sortedProjects = useMemo(() => {
    if (!projects) return [];
    let sorted = [...projects];
    if (sortOption === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'current_count') {
      sorted.sort((a, b) => b.current_count - a.current_count);
    } else { // created_at
      sorted.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    }
    return sorted;
  }, [projects, sortOption]);

  const handleAddProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Project name cannot be empty.');
      return;
    }
    try {
      await addProject({ name: newProjectName, description: newProjectDescription, link: newProjectLink, current_count: 0 });
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectLink('');
      setIsAddProjectDialogOpen(false);
    } catch (err) {
      toast.error('Failed to add project.');
      console.error('Error adding project:', err);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !editProjectName.trim()) {
      toast.error('Project name cannot be empty.');
      return;
    }
    try {
      await updateProject({ id: editingProject.id, updates: { name: editProjectName, description: editProjectDescription, link: editProjectLink } });
      setIsEditProjectDialogOpen(false);
      setEditingProject(null);
    } catch (err) {
      toast.error('Failed to update project.');
      console.error('Error updating project:', err);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(id);
      } catch (err) {
        toast.error('Failed to delete project.');
        console.error('Error deleting project:', err);
      }
    }
  };

  const handleIncrementCount = async (project: Project) => {
    try {
      await updateProject({ id: project.id, updates: { current_count: project.current_count + 1 } });
    } catch (err) {
      toast.error('Failed to update count.');
      console.error('Error updating count:', err);
    }
  };

  const handleDecrementCount = async (project: Project) => {
    try {
      await updateProject({ id: project.id, updates: { current_count: Math.max(0, project.current_count - 1) } });
    } catch (err) {
      toast.error('Failed to update count.');
      console.error('Error updating count:', err);
    }
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectDescription(project.description || '');
    setEditProjectLink(project.link || '');
    setIsEditProjectDialogOpen(true);
  };

  const openNotesDialog = (project: Project) => {
    setProjectWithNotes(project);
    setIsNotesDialogOpen(true);
  };

  if (authLoading || isLoading) {
    return <div className="p-4 text-center">Loading projects...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading projects: {error.message}</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{settings?.project_tracker_title || 'Project Balance Tracker'}</h2>
        <div className="flex items-center space-x-2">
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Newest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="current_count">Count</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isAddProjectDialogOpen} onOpenChange={setIsAddProjectDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Project
              </Button>
            </DialogTrigger>
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
                  <Textarea id="description" value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="link" className="text-right">Link</Label>
                  <Input id="link" type="url" value={newProjectLink} onChange={(e) => setNewProjectLink(e.target.value)} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddProject}>Add Project</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedProjects.length === 0 ? (
          <p className="text-muted-foreground col-span-full">No projects added yet. Start by adding one!</p>
        ) : (
          sortedProjects.map((project) => (
            <Card key={project.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">{project.name}</CardTitle>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openNotesDialog(project)}>
                    <BookOpen className="h-4 w-4" />
                  </Button>
                  {project.link && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={project.link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(project)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteProject(project.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {project.description && <p className="text-sm text-muted-foreground mb-2">{project.description}</p>}
                <div className="flex items-center justify-between mt-4">
                  <Button variant="outline" size="sm" onClick={() => handleDecrementCount(project)}>
                    -
                  </Button>
                  <span className="text-2xl font-bold">{project.current_count}</span>
                  <Button variant="outline" size="sm" onClick={() => handleIncrementCount(project)}>
                    +
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isEditProjectDialogOpen} onOpenChange={setIsEditProjectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">Name</Label>
              <Input id="edit-name" value={editProjectName} onChange={(e) => setEditProjectName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">Description</Label>
              <Textarea id="edit-description" value={editProjectDescription} onChange={(e) => setEditProjectDescription(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-link" className="text-right">Link</Label>
              <Input id="edit-link" type="url" value={editProjectLink} onChange={(e) => setEditProjectLink(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditProjectDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateProject}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {projectWithNotes && (
        <ProjectNotesDialog
          isOpen={isNotesDialogOpen}
          onClose={() => setIsNotesDialogOpen(false)}
          project={projectWithNotes}
        />
      )}
    </div>
  );
};

export default ProjectBalanceTracker;