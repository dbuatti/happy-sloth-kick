import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Sparkles, RefreshCcw, Lightbulb, RotateCcw, LayoutGrid, CheckCircle2, Minus, Link as LinkIcon } from 'lucide-react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useProjects, Project } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/Progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ProjectBalanceTracker: React.FC = () => {
  const {
    projects,
    loading,
    sectionTitle, // Keep sectionTitle for display
    addProject,
    updateProject,
    deleteProject,
    incrementProjectCount,
    decrementProjectCount,
    resetAllProjectCounts,
    userId,
    sortOption,
    setSortOption,
  } = useProjects();

  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectLink, setNewProjectLink] = useState('');
  const [isSavingProject, setIsSavingProject] = useState(false);

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [editingProjectDescription, setEditingProjectDescription] = useState('');
  const [editingProjectLink, setEditingProjectLink] = useState('');

  const [showCelebration, setShowCelebration] = useState(false);

  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);
  const [showConfirmResetIndividualDialog, setShowConfirmResetIndividualDialog] = useState(false);
  const [projectToResetId, setProjectToResetId] = useState<string | null>(null);
  const [showConfirmResetAllDialog, setShowConfirmResetAllDialog] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);

  const leastWorkedOnProject = useMemo(() => {
    if (projects.length === 0) return null;
    return projects.reduce((prev, current) =>
      prev.current_count <= current.current_count ? prev : current
    );
  }, [projects]);

  const allProjectsMaxed = useMemo(() => {
    if (projects.length === 0) return false;
    return projects.every(p => p.current_count === 10);
  }, [projects]);

  React.useEffect(() => {
    if (allProjectsMaxed && projects.length > 0) {
      setShowCelebration(true);
    } else {
      setShowCelebration(false);
    }
  }, [allProjectsMaxed, projects.length]);

  const handleAddProject = async () => {
    if (newProjectName.trim()) {
      setIsSavingProject(true);
      const success = await addProject(newProjectName.trim(), newProjectDescription.trim() || null, newProjectLink.trim() || null);
      if (success) {
        setNewProjectName('');
        setNewProjectDescription('');
        setNewProjectLink('');
        setIsAddProjectOpen(false);
      }
      setIsSavingProject(false);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingProjectName(project.name);
    setEditingProjectDescription(project.description || '');
    setEditingProjectLink(project.link || '');
  };

  const handleSaveProjectEdit = async () => {
    if (editingProjectId && editingProjectName.trim()) {
      setIsSavingProject(true);
      const success = await updateProject(editingProjectId, {
        name: editingProjectName.trim(),
        description: editingProjectDescription.trim() || null,
        link: editingProjectLink.trim() || null,
      });
      if (success) {
        setEditingProjectId(null);
        setEditingProjectName('');
        setEditingProjectDescription('');
        setEditingProjectLink('');
      }
      setIsSavingProject(false);
    }
  };

  const handleDeleteProjectClick = (projectId: string) => {
    setProjectToDeleteId(projectId);
    setShowConfirmDeleteDialog(true);
  };

  const confirmDeleteProject = async () => {
    if (projectToDeleteId) {
      setIsSavingProject(true);
      await deleteProject(projectToDeleteId);
      setProjectToDeleteId(null);
      setShowConfirmDeleteDialog(false);
      setIsSavingProject(false);
    }
  };

  const handleIncrement = async (projectId: string) => {
    await incrementProjectCount(projectId);
  };

  const handleDecrement = async (projectId: string) => {
    await decrementProjectCount(projectId);
  };

  const handleResetIndividualProjectClick = (projectId: string) => {
    setProjectToResetId(projectId);
    setShowConfirmResetIndividualDialog(true);
  };

  const confirmResetIndividualProject = async () => {
    if (projectToResetId) {
      setIsSavingProject(true);
      await updateProject(projectToResetId, { current_count: 0 });
      setProjectToResetId(null);
      setShowConfirmResetIndividualDialog(false);
      setIsSavingProject(false);
    }
  };

  const handleResetAllClick = () => {
    setShowConfirmResetAllDialog(true);
  };

  const confirmResetAll = async () => {
    setIsResettingAll(true);
    const success = await resetAllProjectCounts();
    if (success) {
      setShowCelebration(false);
    }
    setIsResettingAll(false);
    setShowConfirmResetAllDialog(false);
  };

  const getProgressColor = (count: number) => {
    if (count >= 8) return 'bg-primary';
    if (count >= 4) return 'bg-accent';
    return 'bg-destructive';
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4">
        <Card className="w-full max-w-4xl mx-auto shadow-lg p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
              <LayoutGrid className="h-7 w-7" /> {sectionTitle}
            </CardTitle>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
              <Dialog open={isAddProjectOpen} onOpenChange={setIsAddProjectOpen}>
                <DialogTrigger asChild>
                  <Button disabled={isSavingProject} className="w-full sm:w-auto"> {/* Added w-full */}
                    <Plus className="mr-2 h-4 w-4" /> Add Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-3">
                    <div>
                      <Label htmlFor="project-name">Project Name</Label>
                      <Input
                        id="project-name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="e.g., Learn Rust, Garden Design"
                        autoFocus
                        disabled={isSavingProject}
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-description">Description (Optional)</Label>
                      <Textarea
                        id="project-description"
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        placeholder="Notes about this project..."
                        rows={2}
                        disabled={isSavingProject}
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-link">Link (Optional)</Label>
                      <Input
                        id="project-link"
                        type="url"
                        value={newProjectLink}
                        onChange={(e) => setNewProjectLink(e.target.value)}
                        placeholder="e.g., https://github.com/my-project"
                        disabled={isSavingProject}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddProjectOpen(false)} disabled={isSavingProject}>Cancel</Button>
                    <Button onClick={handleAddProject} disabled={isSavingProject || !newProjectName.trim()}>
                      {isSavingProject ? 'Adding...' : 'Add Project'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <div className="flex items-center gap-2 w-full sm:w-auto"> {/* Added w-full */}
                <Label htmlFor="sort-by">Sort by:</Label>
                <Select value={sortOption} onValueChange={(value: 'name_asc' | 'count_asc' | 'count_desc' | 'created_at_asc' | 'created_at_desc') => setSortOption(value)}>
                  <SelectTrigger className="w-full sm:w-[180px]"> {/* Adjusted width */}
                    <SelectValue placeholder="Sort projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name_asc">Alphabetical (A-Z)</SelectItem>
                    <SelectItem value="count_asc">Tally (Low to High)</SelectItem>
                    <SelectItem value="count_desc">Tally (High to Low)</SelectItem>
                    <SelectItem value="created_at_asc">Oldest First</SelectItem>
                    <SelectItem value="created_at_desc">Newest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {showCelebration && (
              <div className="bg-primary/5 dark:bg-primary/10 text-primary p-4 rounded-lg mb-4 text-center flex flex-col items-center gap-2">
                <Sparkles className="h-8 w-8 text-primary animate-bounce" />
                <p className="text-xl font-semibold">Congratulations! All projects are balanced!</p>
                <p>Ready to start a new cycle?</p>
                <Button onClick={handleResetAllClick} className="mt-2" disabled={isResettingAll}>
                  {isResettingAll ? 'Resetting...' : <><RefreshCcw className="mr-2 h-4 w-4" /> Reset All Counters</>}
                </Button>
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border rounded-lg p-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card dark:bg-gray-800 border-border">
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 mt-3 sm:mt-0">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <Skeleton className="h-7 w-7 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
                <LayoutGrid className="h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No projects added yet!</p>
                <p className="text-sm">Click "Add Project" to start tracking your balance and ensure you're giving attention to all your important areas.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {leastWorkedOnProject && (
                  <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 p-3 rounded-lg flex items-center gap-3">
                    <Lightbulb className="h-5 w-5 text-primary flex-shrink-0" />
                    <p className="text-sm text-foreground">
                      Consider focusing on: <span className="font-semibold">{leastWorkedOnProject.name}</span> (Current count: {leastWorkedOnProject.current_count})
                    </p>
                  </div>
                )}

                <ul className="space-y-2">
                  {projects.map(project => (
                    <li
                      key={project.id}
                      className={cn(
                        "border rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
                        "transition-all duration-200 ease-in-out group",
                        "hover:shadow-md",
                        editingProjectId === project.id ? "bg-accent/5 dark:bg-accent/10 border-accent/30 dark:border-accent/70" : "bg-card dark:bg-gray-800 border-border",
                        leastWorkedOnProject?.id === project.id && "border-2 border-primary dark:border-primary" // Highlight least worked on
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        {editingProjectId === project.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editingProjectName}
                              onChange={(e) => setEditingProjectName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveProjectEdit()}
                              className="text-lg font-semibold"
                              autoFocus // Auto-focus here
                              disabled={isSavingProject}
                            />
                            <Textarea
                              value={editingProjectDescription}
                              onChange={(e) => setEditingProjectDescription(e.target.value)}
                              placeholder="Description..."
                              rows={2}
                              disabled={isSavingProject}
                            />
                            <Input
                              type="url"
                              value={editingProjectLink}
                              onChange={(e) => setNewProjectLink(e.target.value)}
                              placeholder="Project link (optional)"
                              disabled={isSavingProject}
                            />
                          </div>
                        ) : (
                          <>
                            <h3 className="text-xl font-bold truncate flex items-center gap-2">
                              {project.name}
                              {project.current_count === 10 && (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                              )}
                              {project.link && (
                                <a 
                                  href={project.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-primary hover:text-primary/90 dark:text-primary/90 dark:hover:text-primary"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </a>
                              )}
                            </h3>
                            {project.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0 w-full sm:w-auto">
                        {editingProjectId === project.id ? (
                          <div className="flex gap-2 w-full">
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSaveProjectEdit(); }} disabled={isSavingProject || !editingProjectName.trim()} className="flex-1">
                              {isSavingProject ? 'Saving...' : 'Save'}
                            </Button>
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setEditingProjectId(null); }} disabled={isSavingProject} className="flex-1">Cancel</Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); handleDecrement(project.id); }}
                                disabled={project.current_count <= 0}
                              >
                                <Minus className="h-5 w-5" />
                              </Button>
                              <div className="flex-1">
                                <Progress value={project.current_count * 10} className="h-3" indicatorClassName={getProgressColor(project.current_count)} />
                                <p className="text-sm text-muted-foreground text-center mt-1">{project.current_count}/10</p>
                              </div>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); handleIncrement(project.id); }}
                                disabled={project.current_count >= 10}
                              >
                                <Plus className="h-5 w-5" />
                              </Button>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto sm:ml-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}
                                aria-label={`Edit ${project.name}`}
                                disabled={isSavingProject}
                              >
                                <Edit className="h-5 w-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                onClick={(e) => { e.stopPropagation(); handleResetIndividualProjectClick(project.id); }}
                                aria-label={`Reset ${project.name}`}
                                disabled={isSavingProject}
                              >
                                <RotateCcw className="h-5 w-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-destructive"
                                onClick={(e) => { e.stopPropagation(); handleDeleteProjectClick(project.id); }}
                                aria-label={`Delete ${project.name}`}
                                disabled={isSavingProject}
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>

      <AlertDialog open={showConfirmDeleteDialog} onOpenChange={setShowConfirmDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSavingProject}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject} disabled={isSavingProject}>
              {isSavingProject ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmResetIndividualDialog} onOpenChange={setShowConfirmResetIndividualDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Project Counter?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the tally for this project to 0. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSavingProject}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetIndividualProject} disabled={isSavingProject}>
              {isSavingProject ? 'Resetting...' : 'Reset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmResetAllDialog} onOpenChange={setShowConfirmResetAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Project Counters?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the tally for ALL your projects to 0. Are you sure you want to start a new cycle?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResettingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetAll} disabled={isResettingAll}>
              {isResettingAll ? 'Resetting...' : 'Reset All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectBalanceTracker;