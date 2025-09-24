import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { LayoutGrid, RefreshCcw } from 'lucide-react'; // Removed Plus
import { useProjects, Project } from '@/hooks/useProjects';
import ProjectList from '@/components/project-tracker/ProjectList';
import AddProjectDialog from '@/components/project-tracker/AddProjectDialog';
import ConfirmDeleteProjectDialog from '@/components/project-tracker/ConfirmDeleteProjectDialog';
import ConfirmResetIndividualProjectDialog from '@/components/project-tracker/ConfirmResetIndividualProjectDialog';
import ConfirmResetAllProjectsDialog from '@/components/project-tracker/ConfirmResetAllProjectsDialog';
import ProjectCelebrationBanner from '@/components/project-tracker/ProjectCelebrationBanner';
import ProjectRecommendationBanner from '@/components/project-tracker/ProjectRecommendationBanner';
import ProjectActionsBar from '@/components/project-tracker/ProjectActionsBar';
import ProjectNotesDialog from '@/components/project-tracker/ProjectNotesDialog';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';

interface ProjectBalanceTrackerProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const ProjectBalanceTracker: React.FC<ProjectBalanceTrackerProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
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
    // updateProjectTrackerTitle, // Removed as it's not used directly here
    sortOption,
    setSortOption,
  } = useProjects({ userId: demoUserId });
  const { settings } = useSettings({ userId: demoUserId });

  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const [isConfirmResetIndividualDialogOpen, setIsConfirmResetIndividualDialogOpen] = useState(false);
  const [projectToResetIndividual, setProjectToResetIndividual] = useState<string | null>(null);

  const [isConfirmResetAllDialogOpen, setIsConfirmResetAllDialogOpen] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);

  const [isProjectNotesDialogOpen, setIsProjectNotesDialogOpen] = useState(false);
  const [projectForNotes, setProjectForNotes] = useState<Project | null>(null);

  const allProjectsBalanced = projects.length > 0 && projects.every(p => p.current_count === 10);
  const leastWorkedOnProject = projects.length > 0
    ? projects.reduce((prev, current) => (prev.current_count < current.current_count ? prev : current))
    : null;

  const handleAddProject = async (name: string, description: string, link: string) => {
    setIsSavingProject(true);
    await addProject({ name, description, link });
    setIsSavingProject(false);
    setIsAddProjectDialogOpen(false);
  };

  const handleEditProject = (project: Project) => {
    setEditingProjectId(project.id);
  };

  const handleSaveEditProject = async (projectId: string, name: string, description: string, link: string) => {
    setIsSavingProject(true);
    await updateProject({ projectId, updates: { name, description, link } });
    setIsSavingProject(false);
    setEditingProjectId(null);
  };

  const handleCancelEditProject = () => {
    setEditingProjectId(null);
  };

  const handleDeleteProjectClick = (projectId: string) => {
    setProjectToDelete(projectId);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (projectToDelete) {
      setIsSavingProject(true);
      await deleteProject(projectToDelete);
      setIsSavingProject(false);
      setIsConfirmDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const handleResetIndividualProjectClick = (projectId: string) => {
    setProjectToResetIndividual(projectId);
    setIsConfirmResetIndividualDialogOpen(true);
  };

  const confirmResetIndividualProject = async () => {
    if (projectToResetIndividual) {
      setIsSavingProject(true);
      await updateProject({ projectId: projectToResetIndividual, updates: { current_count: 0 } });
      setIsSavingProject(false);
      setIsConfirmResetIndividualDialogOpen(false);
      setProjectToResetIndividual(null);
    }
  };

  const handleResetAllProjectsClick = () => {
    setIsConfirmResetAllDialogOpen(true);
  };

  const confirmResetAllProjects = async () => {
    setIsResettingAll(true);
    await resetAllProjectCounts();
    setIsResettingAll(false);
    setIsConfirmResetAllDialogOpen(false);
  };

  const handleOpenNotes = (project: Project) => {
    setProjectForNotes(project);
    setIsProjectNotesDialogOpen(true);
  };

  const handleSaveNotes = async (projectId: string, notes: string) => {
    await updateProject({ projectId, updates: { notes } });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-center mb-8">
          <LayoutGrid className="inline-block h-10 w-10 mr-3 text-primary" />
          {settings?.project_tracker_title || sectionTitle}
        </h1>

        {allProjectsBalanced && projects.length > 0 && (
          <ProjectCelebrationBanner
            onResetAllClick={handleResetAllProjectsClick}
            isResettingAll={isResettingAll}
            isDemo={isDemo}
          />
        )}

        {!allProjectsBalanced && leastWorkedOnProject && (
          <ProjectRecommendationBanner project={leastWorkedOnProject} />
        )}

        <ProjectActionsBar
          onAddProjectClick={() => setIsAddProjectDialogOpen(true)}
          sortOption={sortOption}
          onSortChange={setSortOption}
          isSavingProject={isSavingProject}
          isDemo={isDemo}
        />

        <div className="mt-6">
          <ProjectList
            projects={projects}
            loading={loading}
            leastWorkedOnProject={leastWorkedOnProject}
            onIncrement={incrementProjectCount}
            onDecrement={decrementProjectCount}
            onEdit={handleEditProject}
            onSaveEdit={handleSaveEditProject}
            onCancelEdit={handleCancelEditProject}
            onDelete={handleDeleteProjectClick}
            onResetIndividual={handleResetIndividualProjectClick}
            onOpenNotes={handleOpenNotes}
            editingProjectId={editingProjectId}
            isSavingProject={isSavingProject}
            isDemo={isDemo}
          />
        </div>
      </div>

      <AddProjectDialog
        isOpen={isAddProjectDialogOpen}
        onClose={() => setIsAddProjectDialogOpen(false)}
        onSave={handleAddProject}
        isSaving={isSavingProject}
      />

      <ConfirmDeleteProjectDialog
        isOpen={isConfirmDeleteDialogOpen}
        onClose={() => setIsConfirmDeleteDialogOpen(false)}
        onConfirm={confirmDeleteProject}
        isSaving={isSavingProject}
      />

      <ConfirmResetIndividualProjectDialog
        isOpen={isConfirmResetIndividualDialogOpen}
        onClose={() => setIsConfirmResetIndividualDialogOpen(false)}
        onConfirm={confirmResetIndividualProject}
        isSaving={isSavingProject}
      />

      <ConfirmResetAllProjectsDialog
        isOpen={isConfirmResetAllDialogOpen}
        onClose={() => setIsConfirmResetAllDialogOpen(false)}
        onConfirm={confirmResetAllProjects}
        isResetting={isResettingAll}
      />

      <ProjectNotesDialog
        project={projectForNotes}
        isOpen={isProjectNotesDialogOpen}
        onClose={() => setIsProjectNotesDialogOpen(false)}
        onSave={handleSaveNotes}
      />
    </div>
  );
};

export default ProjectBalanceTracker;