import React, { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { Project, NewProjectData, UpdateProjectData, ProjectBalanceTrackerProps } from '@/types'; // Added UpdateProjectData
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Confetti from 'react-confetti';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ExternalLink, Edit, Trash2 } from 'lucide-react'; // Removed CheckCircle2
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';

const ProjectBalanceTracker: React.FC<ProjectBalanceTrackerProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id; // currentUserId is used in useProjects
  const [sortOption, setSortOption] = useState('created_at');
  const { projects, isLoading, error, addProject, updateProject, deleteProject } = useProjects(sortOption);

  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectLink, setNewProjectLink] = useState('');
  const [newProjectNotes, setNewProjectNotes] = useState('');

  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');
  const [editProjectLink, setEditProjectLink] = useState('');
  const [editProjectNotes, setEditProjectNotes] = useState('');

  const [showConfetti, setShowConfetti] = useState(false);

  const handleAddProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Project name cannot be empty.');
      return;
    }
    try {
      const newProjectData: NewProjectData = {
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || null,
        link: newProjectLink.trim() || null,
        notes: newProjectNotes.trim() || null,
      };
      await addProject(newProjectData);
      toast.success('Project added successfully!');
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectLink('');
      setNewProjectNotes('');
      setIsAddProjectDialogOpen(false);
    } catch (err) {
      toast.error(`Failed to add project: ${(err as Error).message}`);
      console.error('Error adding project:', err);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectDescription(project.description || '');
    setEditProjectLink(project.link || '');
    setEditProjectNotes(project.notes || '');
    setIsEditProjectDialogOpen(true);
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !editProjectName.trim()) {
      toast.error('Project name cannot be empty.');
      return;
    }
    try {
      const updates: UpdateProjectData = { // Corrected type
        name: editProjectName.trim(),
        description: editProjectDescription.trim() || null,
        link: editProjectLink.trim() || null,
        notes: editProjectNotes.trim() || null,
      };
      await updateProject({ id: editingProject.id, updates });
      toast.success('Project updated successfully!');
      setIsEditProjectDialogOpen(false);
      setEditingProject(null);
    } catch (err) {
      toast.error(`Failed to update project: ${(err as Error).message}`);
      console.error('Error updating project:', err);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(projectId);
        toast.success('Project deleted successfully!');
      } catch (err) {
        toast.error(`Failed to delete project: ${(err as Error).message}`);
        console.error('Error deleting project:', err);
      }
    }
  };

  const handleIncrementCount = async (project: Project) => {
    try {
      const newCount = project.current_count + 1;
      await updateProject({ id: project.id, updates: { current_count: newCount } });
      toast.success(`Count for ${project.name} incremented!`);
      if (newCount >= 10) { // Example: show confetti for reaching 10
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    } catch (err) {
      toast.error(`Failed to update count: ${(err as Error).message}`);
      console.error('Error incrementing count:', err);
    }
  };

  const handleDecrementCount = async (project: Project) => {
    try {
      const newCount = Math.max(0, project.current_count - 1);
      await updateProject({ id: project.id, updates: { current_count: newCount } });
      toast.success(`Count for ${project.name} decremented!`);
    } catch (err) {
      toast.error(`Failed to update count: ${(err as Error).message}`);
      console.error('Error decrementing count:', err);
    }
  };

  const sortedProjects = useMemo(() => {
    if (!projects) return [];
    let sorted = [...projects];
    if (sortOption === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'current_count') {
      sorted.sort((a, b) => b.current_count - a.current_count);
    } else { // created_at
      sorted.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
    }
    return sorted;
  }, [projects, sortOption]);

  if (isLoading || authLoading) {
    return <div className="flex justify-center items-center h-full">Loading projects...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-full text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      {showConfetti && <Confetti />}
      <h1 className="text-3xl font-bold mb-6">Project Balance Tracker</h1>

      <div className="flex justify-between items-center mb-6">
        <Dialog open={isAddProjectDialogOpen} onOpenChange={setIsAddProjectDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Project</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="link" className="text-right">
                  Link
                </Label>
                <Input
                  id="link"
                  value={newProjectLink}
                  onChange={(e) => setNewProjectLink(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={newProjectNotes}
                  onChange={(e) => setNewProjectNotes(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddProject}>Save Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex items-center space-x-2">
          <Label htmlFor="sort">Sort by:</Label>
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger id="sort" className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date Added</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="current_count">Count</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedProjects.map((project) => (
          <Card key={project.id} className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{project.name}</CardTitle>
              <div className="flex items-center space-x-1">
                {project.link && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={project.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleEditProject(project)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteProject(project.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              {project.description && <p className="text-sm text-gray-500 mb-2">{project.description}</p>}
              {project.notes && <p className="text-sm text-gray-600 italic mb-2">{project.notes}</p>}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleDecrementCount(project)}>-</Button>
                  <span className="text-2xl font-bold">{project.current_count}</span>
                  <Button variant="outline" size="sm" onClick={() => handleIncrementCount(project)}>+</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={isEditProjectDialogOpen} onOpenChange={setIsEditProjectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="edit-description"
                value={editProjectDescription}
                onChange={(e) => setEditProjectDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-link" className="text-right">
                Link
              </Label>
              <Input
                id="edit-link"
                value={editProjectLink}
                onChange={(e) => setEditProjectLink(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="edit-notes"
                value={editProjectNotes}
                onChange={(e) => setEditProjectNotes(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateProject}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectBalanceTracker;