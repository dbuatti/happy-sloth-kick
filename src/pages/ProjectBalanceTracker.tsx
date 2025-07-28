import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Sparkles, RefreshCcw, Lightbulb, RotateCcw, LayoutGrid, CheckCircle2 } from 'lucide-react'; // Added CheckCircle2
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components

const ProjectBalanceTracker: React.FC = () => {
  const {
    projects,
    loading,
    sectionTitle,
    addProject,
    updateProject,
    deleteProject,
    incrementProjectCount,
    resetAllProjectCounts,
    updateProjectTrackerTitle,
    userId,
    sortOption, // Destructure sortOption
    setSortOption, // Destructure setSortOption
  } = useProjects();

  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isSavingProject, setIsSavingProject] = useState(false); // New state for project add/edit

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempSectionTitle, setTempSectionTitle] = useState(sectionTitle);
  const [isSavingTitle, setIsSavingTitle] = useState(false); // New state for title saving

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [editingProjectDescription, setEditingProjectDescription] = useState('');

  const [showCelebration, setShowCelebration] = useState(false);

  // AlertDialog states
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);
  const [showConfirmResetIndividualDialog, setShowConfirmResetIndividualDialog] = useState(false);
  const [projectToResetId, setProjectToResetId] = useState<string | null>(null);
  const [showConfirmResetAllDialog, setShowConfirmResetAllDialog] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false); // New state for resetting all

  // Memoize least worked on project
  const leastWorkedOnProject = useMemo(() => {
    if (projects.length === 0) return null;
    return projects.reduce((prev, current) =>
      prev.current_count <= current.current_count ? prev : current
    );
  }, [projects]);

  // Check if all projects are at 10
  const allProjectsMaxed = useMemo(() => {
    if (projects.length === 0) return false;
    return projects.every(p => p.current_count === 10);
  }, [projects]);

  // Handle celebration and reset
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
      const success = await addProject(newProjectName.trim(), newProjectDescription.trim() || null);
      if (success) {
        setNewProjectName('');
        setNewProjectDescription('');
        setIsAddProjectOpen(false);
      }
      setIsSavingProject(false);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingProjectName(project.name);
    setEditingProjectDescription(project.description || '');
  };

  const handleSaveProjectEdit = async () => {
    if (editingProjectId && editingProjectName.trim()) {
      setIsSavingProject(true);
      const success = await updateProject(editingProjectId, {
        name: editingProjectName.trim(),
        description: editingProjectDescription.trim() || null,
      });
      if (success) {
        setEditingProjectId(null);
        setEditingProjectName('');
        setEditingProjectDescription('');
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
      setIsSavingProject(true); // Use saving state for delete too
      await deleteProject(projectToDeleteId);
      setProjectToDeleteId(null);
      setShowConfirmDeleteDialog(false);
      setIsSavingProject(false);
    }
  };

  const handleIncrement = async (projectId: string) => {
    // No need for isSavingProject here, as it's a quick update
    await incrementProjectCount(projectId);
  };

  const handleResetIndividualProjectClick = (projectId: string) => {
    setProjectToResetId(projectId);
    setShowConfirmResetIndividualDialog(true);
  };

  const confirmResetIndividualProject = async () => {
    if (projectToResetId) {
      setIsSavingProject(true); // Use saving state for reset
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

  const handleSaveTitle = async () => {
    if (tempSectionTitle.trim()) {
      setIsSavingTitle(true);
      await updateProjectTrackerTitle(tempSectionTitle.trim());
      setIsEditingTitle(false);
      setIsSavingTitle(false);
    }
  };

  const getProgressColor = (count: number) => {
    if (count >= 8) return 'bg-green-500';
    if (count >= 4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4">
        <Card className="w-full max-w-4xl mx-auto shadow-lg">
          <CardHeader className="pb-2">
            {isEditingTitle ? (
              <div className="flex items-center w-full gap-2">
                <Input
                  value={tempSectionTitle}
                  onChange={(e) => setTempSectionTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  className="text-3xl font-bold"
                  autoFocus
                  disabled={isSavingTitle}
                />
                <Button size="sm" onClick={handleSaveTitle} disabled={isSavingTitle || !tempSectionTitle.trim()}>
                  {isSavingTitle ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsEditingTitle(false)} disabled={isSavingTitle}>Cancel</Button>
              </div>
            ) : (
              <CardTitle className="text-3xl font-bold flex items-center gap-2">
                {sectionTitle}
                <Button variant="ghost" size="icon" onClick={() => setIsEditingTitle(true)} className="h-6 w-6">
                  <Edit className="h-4 w-4" />
                </Button>
              </CardTitle>
            )}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <Dialog open={isAddProjectOpen} onOpenChange={setIsAddProjectOpen}>
                <DialogTrigger asChild>
                  <Button disabled={isSavingProject}>
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
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddProjectOpen(false)} disabled={isSavingProject}>Cancel</Button>
                    <Button onClick={handleAddProject} disabled={isSavingProject || !newProjectName.trim()}>
                      {isSavingProject ? 'Adding...' : 'Add Project'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <div className="flex items-center gap-2">
                <Label htmlFor="sort-by">Sort by:</Label>
                <Select value={sortOption} onValueChange={(value: 'name_asc' | 'count_asc' | 'count_desc' | 'created_at_asc' | 'created_at_desc') => setSortOption(value)}>
                  <SelectTrigger className="w-[180px]">
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
              <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 p-4 rounded-lg mb-4 text-center flex flex-col items-center gap-2">
                <Sparkles className="h-8 w-8 text-green-600 dark:text-green-400 animate-bounce" />
                <p className="text-xl font-semibold">Congratulations! All projects are balanced!</p>
                <p>Ready to start a new cycle?</p>
                <Button onClick={handleResetAllClick} className="mt-2" disabled={isResettingAll}>
                  {isResettingAll ? 'Resetting...' : <><RefreshCcw className="mr-2 h-4 w-4" /> Reset All Counters</>}
                </Button>
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card dark:bg-gray-800 border-border">
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 mt-3 sm:mt-0">
                      <Skeleton className="h-4 w-24 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-full" />
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
              <div className="space-y-3">
                {leastWorkedOnProject && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 p-3 rounded-lg flex items-center gap-3">
                    <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Consider focusing on: <span className="font-semibold">{leastWorkedOnProject.name}</span> (Current count: {leastWorkedOnProject.current_count})
                    </p>
                  </div>
                )}

                <ul className="space-y-2">
                  {projects.map(project => (
                    <li
                      key={project.id}
                      className={cn(
                        "border rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
                        "transition-all duration-200 ease-in-out cursor-pointer group",
                        "hover:shadow-md",
                        editingProjectId === project.id ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700" : "bg-card dark:bg-gray-800 border-border"
                      )}
                      onClick={() => handleIncrement(project.id)}
                    >
                      <div className="flex-1 min-w-0">
                        {editingProjectId === project.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editingProjectName}
                              onChange={(e) => setEditingProjectName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveProjectEdit()}
                              className="text-lg font-semibold"
                              autoFocus
                              disabled={isSavingProject}
                            />
                            <Textarea
                              value={editingProjectDescription}
                              onChange={(e) => setEditingProjectDescription(e.target.value)}
                              placeholder="Description..."
                              rows={2}
                              disabled={isSavingProject}
                            />
                          </div>
                        ) : (
                          <>
                            <h3 className="text-lg font-semibold truncate flex items-center gap-2">
                              {project.name}
                              {project.current_count === 10 && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                            </h3>
                            {project.description && (
                              <p className="text-sm text-muted-foreground truncate">{project.description}</p>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 mt-3 sm:mt-0">
                        {editingProjectId === project.id ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSaveProjectEdit(); }} disabled={isSavingProject || !editingProjectName.trim()}>
                              {isSavingProject ? 'Saving...' : 'Save'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingProjectId(null); }} disabled={isSavingProject}>Cancel</Button>
                          </div>
                        ) : (
                          <>
                            <div className="w-24">
                              <Progress value={project.current_count * 10} className="h-2" indicatorClassName={getProgressColor(project.current_count)} />
                              <p className="text-sm text-muted-foreground text-center mt-1">{project.current_count}/10</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}
                              aria-label={`Edit ${project.name}`}
                              disabled={isSavingProject}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              onClick={(e) => { e.stopPropagation(); handleResetIndividualProjectClick(project.id); }}
                              aria-label={`Reset ${project.name}`}
                              disabled={isSavingProject}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleDeleteProjectClick(project.id); }}
                              aria-label={`Delete ${project.name}`}
                              disabled={isSavingProject}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

      {/* Delete Project Confirmation Dialog */}
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

      {/* Reset Individual Project Confirmation Dialog */}
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

      {/* Reset All Projects Confirmation Dialog */}
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