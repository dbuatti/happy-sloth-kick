import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, RefreshCcw } from 'lucide-react';
import { useProjects, Project } from '@/hooks/useProjects';
import AddProjectDialog from '@/components/project-tracker/AddProjectDialog';
import ProjectList from '@/components/project-tracker/ProjectList';
import ProjectCelebrationBanner from '@/components/project-tracker/ProjectCelebrationBanner';
import ProjectRecommendationBanner from '@/components/project-tracker/ProjectRecommendationBanner';
import ConfirmDeleteProjectDialog from '@/components/project-tracker/ConfirmDeleteProjectDialog';
import ConfirmResetIndividualProjectDialog from '@/components/project-tracker/ConfirmResetIndividualProjectDialog';
import ConfirmResetAllProjectsDialog from '@/components/project-tracker/ConfirmResetAllProjectsDialog';
import ProjectNotesDialog from '@/components/project-tracker/ProjectNotesDialog';
import ProjectActionsBar from '@/components/project-tracker/ProjectActionsBar';

interface ProjectBalanceTrackerProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const ProjectBalanceTracker: React.FC<ProjectBalanceTrackerProps> = ({ isDemo = false, demoUserId }) => {
  const {
    projects,
    loading,
    sectionTitle,
    addProject,
    updateProject,
    deleteProject,
    incrementProjectCount,
    decrementProjectCount,
    resetAllProjectCounts,
    updateProjectTrackerTitle,
    sortOption,
    setSortOption,
  } = useProjects({ userId: demoUserId });

  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);

  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);

  const [showConfirmResetIndividualDialog, setShowConfirmResetIndividualDialog] = useState(false);
  const [projectToResetIndividualId, setProjectToResetIndividualId] = useState<string | null>(null);

  const [showConfirmResetAllDialog, setShowConfirmResetAllDialog] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);

  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [projectForNotes, setProjectForNotes] = useState<Project | null>(null);

  const allProjectsBalanced = useMemo(() => projects.length > 0 && projects.every(p => p.current_count === 10), [projects]);
  const leastWorkedOnProject = useMemo(() => {
    if (projects.length === 0) return null;
    return projects.reduce((prev, current) => (prev.current_count < current.current_count ? prev : current));
  }, [projects]);

  const handleAddProject = async (name: string, description: string, link: string) => {
    setIsSavingProject(true);
    await addProject({ name, description, link });
    setIsSavingProject(false);
    setIsAddProjectDialogOpen(false);
  };

  const handleEditProject = (project: Project) => {
    setEditingProjectId(project.id);
  };

  const handleSaveEditedProject = async (projectId: string, name: string, description: string, link: string) => {
    setIsSavingProject(true);
    await updateProject({ projectId, updates: { name, description, link } });
    setIsSavingProject(false);
    setEditingProjectId(null);
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null);
  };

  const handleDeleteProjectClick = (projectId: string) => {
    setProjectToDeleteId(projectId);
    setShowConfirmDeleteDialog(true);
  };

  const confirmDeleteProject = async () => {
    if (projectToDeleteId) {
      setIsSavingProject(true);
      await deleteProject(projectToDeleteId);
      setIsSavingProject(false);
      setShowConfirmDeleteDialog(false);
      setProjectToDeleteId(null);
    }
  };

  const handleResetIndividualProjectClick = (projectId: string) => {
    setProjectToResetIndividualId(projectId);
    setShowConfirmResetIndividualDialog(true);
  };

  const confirmResetIndividualProject = async () => {
    if (projectToResetIndividualId) {
      setIsSavingProject(true);
      await updateProject({ projectId: projectToResetIndividualId, updates: { current_count: 0 } });
      setIsSavingProject(false);
      setShowConfirmResetIndividualDialog(false);
      setProjectToResetIndividualId(null);
    }
  };

  const handleResetAllProjectsClick = () => {
    setShowConfirmResetAllDialog(true);
  };

  const confirmResetAllProjects = async () => {
    setIsResettingAll(true);
    await resetAllProjectCounts();
    setIsResettingAll(false);
    setShowConfirmResetAllDialog(false);
  };

  const handleOpenNotes = (project: Project) => {
    setProjectForNotes(project);
    setIsNotesDialogOpen(true);
  };

  const handleSaveNotes = async (projectId: string, notes: string) => {
    setIsSavingProject(true);
    await updateProject({ projectId, updates: { notes } });
    setIsSavingProject(false);
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6 container mx-auto max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <LayoutGrid className="h-7 w-7 text-primary" /> {sectionTitle}
        </h1>
        <Button onClick={handleResetAllProjectsClick} variant="outline" disabled={isResettingAll || isDemo || projects.length === 0}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Reset All
        </Button>
      </div>

      {allProjectsBalanced && projects.length > 0 && (
        <ProjectCelebrationBanner
          onResetAllClick={handleResetAllProjectsClick}
          isResettingAll={isResettingAll}
          isDemo={isDemo}
        />
      )}

      {!allProjectsBalanced && projects.length > 0 && (
        <ProjectRecommendationBanner project={leastWorkedOnProject} />
      )}

      <ProjectActionsBar
        onAddProjectClick={() => setIsAddProjectDialogOpen(true)}
        sortOption={sortOption}
        onSortChange={setSortOption}
        isSavingProject={isSavingProject}
        isDemo={isDemo}
      />

      <Card className="mt-6 shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Your Projects</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ProjectList
            projects={projects}
            loading={loading}
            leastWorkedOnProject={leastWorkedOnProject}
            onIncrement={incrementProjectCount}
            onDecrement={decrementProjectCount}
            onEdit={handleEditProject}
            onSaveEdit={handleSaveEditedProject}
            onCancelEdit={handleCancelEdit}
            onDelete={handleDeleteProjectClick}
            onResetIndividual={handleResetIndividualProjectClick}
            onOpenNotes={handleOpenNotes}
            editingProjectId={editingProjectId}
            isSavingProject={isSavingProject}
            isDemo={isDemo}
          />
        </CardContent>
      </Card>

      <AddProjectDialog
        isOpen={isAddProjectDialogOpen}
        onClose={() => setIsAddProjectDialogOpen(false)}
        onSave={handleAddProject}
        isSaving={isSavingProject}
      />

      <ConfirmDeleteProjectDialog
        isOpen={showConfirmDeleteDialog}
        onClose={() => setShowConfirmDeleteDialog(false)}
        onConfirm={confirmDeleteProject}
        isSaving={isSavingProject}
      />

      <ConfirmResetIndividualProjectDialog
        isOpen={showConfirmResetIndividualDialog}
        onClose={() => setShowConfirmResetIndividualDialog(false)}
        onConfirm={confirmResetIndividualProject}
        isSaving={isSavingProject}
      />

      <ConfirmResetAllProjectsDialog
        isOpen={showConfirmResetAllDialog}
        onClose={() => setShowConfirmResetAllDialog(false)}
        onConfirm={confirmResetAllProjects}
        isResetting={isResettingAll}
      />

      <ProjectNotesDialog
        project={projectForNotes}
        isOpen={isNotesDialogOpen}
        onClose={() => setIsNotesDialogOpen(false)}
        onSave={handleSaveNotes}
      />
    </main>
  );
};

export default ProjectBalanceTracker;