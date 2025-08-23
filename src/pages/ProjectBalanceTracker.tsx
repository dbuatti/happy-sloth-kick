import React, { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Trophy, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Confetti from 'react-confetti';
import { Project } from '@/types';

const ProjectBalanceTracker = () => {
  const { userId: currentUserId } = useAuth();
  const [sortOption, setSortOption] = useState('created_at');
  const { projects, isLoading, error, addProject, updateProject, deleteProject, incrementProjectCount, decrementProjectCount } = useProjects(sortOption);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState<string | null>(null);
  const [newProjectLink, setNewProjectLink] = useState<string | null>(null);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const leastWorkedOnProject = useMemo(() => {
    if ((projects as Project[]).length === 0) return null;
    return (projects as Project[]).reduce((prev, current) =>
      prev.current_count <= current.current_count ? prev : current
    );
  }, [projects]);

  const allProjectsMaxed = useMemo(() => {
    if ((projects as Project[]).length === 0) return false;
    return (projects as Project[]).every(p => p.current_count === 10);
  }, [projects]);

  React.useEffect(() => {
    if (allProjectsMaxed && (projects as Project[]).length > 0) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 10000); // Show confetti for 10 seconds
      return () => clearTimeout(timer);
    }
  }, [allProjectsMaxed, (projects as Project[]).length]);

  const handleAddProject = async () => {
    if (newProjectName.trim()) {
      await addProject({ name: newProjectName, description: newProjectDescription, link: newProjectLink });
      setNewProjectName('');
      setNewProjectDescription(null);
      setNewProjectLink(null);
      setIsAddProjectDialogOpen(false);
    }
  };

  const handleUpdateProject = async (projectId: string, updates: Partial<Project>) => {
    await updateProject({ projectId, updates });
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject(projectId);
  };

  if (isLoading) return <div className="text-center py-8">Loading projects...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      {showCelebration && <Confetti recycle={false} numberOfPieces={500} />}
      <h1 className="text-3xl font-bold mb-6">Project Balance Tracker</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Trophy className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(projects as Project[]).length}</div>
            <p className="text-xs text-white/70">Keep up the great work!</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-teal-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Least Worked On</CardTitle>
            <Minus className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leastWorkedOnProject?.name || 'N/A'}</div>
            <p className="text-xs text-white/70">Focus here next</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">All Maxed Out?</CardTitle>
            <Sparkles className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allProjectsMaxed ? 'Yes! 🎉' : 'Not yet...'}</div>
            <p className="text-xs text-white/70">{allProjectsMaxed ? 'Time to celebrate!' : 'Keep pushing!'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">My Projects</h2>
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
                  value={newProjectDescription || ''}
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
                  value={newProjectLink || ''}
                  onChange={(e) => setNewProjectLink(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddProject}>Save Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <Label htmlFor="sort-by" className="mr-2">Sort by:</Label>
        <Select value={sortOption} onValueChange={setSortOption}>
          <SelectTrigger className="w-[180px] inline-flex">
            <SelectValue placeholder="Sort projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Recently Added</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="count_asc">Count (Low to High)</SelectItem>
            <SelectItem value="count_desc">Count (High to Low)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {(projects as Project[]).length === 0 ? (
          <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
            <p className="text-lg">No projects added yet.</p>
            <p className="text-sm">Click "Add New Project" to get started!</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {(projects as Project[]).map(project => (
              <li
                key={project.id}
                className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200"
              >
                <div className="flex-1 mr-4">
                  <h3 className="font-semibold text-lg">{project.name}</h3>
                  {project.description && <p className="text-sm text-gray-600">{project.description}</p>}
                  {project.link && (
                    <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm hover:underline">
                      {project.link}
                    </a>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => decrementProjectCount(project.id)}
                      disabled={project.current_count <= 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-bold text-lg w-8 text-center">{project.current_count}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => incrementProjectCount(project.id)}
                      disabled={project.current_count >= 10}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteProject(project.id)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ProjectBalanceTracker;