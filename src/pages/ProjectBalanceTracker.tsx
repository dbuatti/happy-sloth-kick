import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid } from 'lucide-react';
import { useProjects, Project } from '@/hooks/useProjects';
import { useAuth } from '@/context/AuthContext';
import ProjectNotesDialog from '@/components/ProjectNotesDialog';

// Import new modular components
import ProjectActionsBar from '@/components/project-tracker/ProjectActionsBar';
import AddProjectDialog from '@/components/project-tracker/AddProjectDialog';
import ProjectList from '@/components/project-tracker/ProjectList';
import ProjectCelebrationBanner from '@/components/project-tracker/ProjectCelebrationBanner';
import ProjectRecommendationBanner from '@/components/project-tracker/ProjectRecommendationBanner';
import ConfirmDeleteProjectDialog from '@/components/project-tracker/ConfirmDeleteProjectDialog';
import ConfirmResetIndividualProjectDialog from '@/components/project-tracker/ConfirmResetIndividualProjectDialog';
import ConfirmResetAllProjectsDialog from '@/components/project-tracker/ConfirmResetAllProjectsDialog';

interface ProjectBalanceTrackerProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const ProjectBalanceTracker: React.FC<ProjectBalanceTrackerProps> = ({ isDemo = false, demoUserId }) => {
  useAuth();

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
    sortOption,
    setSortOption,
  } = useProjects({ userId: demoUserId });

  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false); // Used for add/edit/delete operations

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const [showCelebration, setShowCelebration] = useState(false);

  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);
  const [showConfirmResetIndividualDialog, setShowConfirmResetIndividualDialog] = useState(false);
  const [projectToResetId, setProjectToResetId] = useState<string | null>(null);
  const [showConfirmResetAllDialog, setShowConfirmResetAllDialog] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false); // Specific for reset all

  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [selectedProjectForNotes, setSelectedProjectForNotes] = useState<Project | null>(null);

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

  const handleAddProject = async (name: string, description: string, link: string) => {
    if (name.trim()) {
      setIsSavingProject(true);
      const success = await addProject({ name, description: description || null, link: link || null });
      if (success) {
        setIsAddProjectOpen(false);
      }
      setIsSavingProject(false);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProjectId(project.id);
  };

  const handleSaveProjectEdit = async (projectId: string, name: string, description: string, link: string) => {
    if (projectId && name.trim()) {
      setIsSavingProject(true);
      const success = await updateProject({ projectId, updates: {
        name,
        description: description || null,
        link: link || null,
      }});
      if (success) {
        setEditingProjectId(null);
      }
      setIsSavingProject(false);
    }
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
      await updateProject({ projectId: projectToResetId, updates: { current_count: 0 } });
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

  const handleOpenNotes = (project: Project) => {
    setSelectedProjectForNotes(project);
    setIsNotesOpen(true);
  };

  const handleSaveNotes = async (projectId: string, notes: string) => {
    await updateProject({ projectId, updates: { notes } });
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4">
        <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-xl p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
              <LayoutGrid className="h-7 w-7" /> {sectionTitle}
            </CardTitle>
            <ProjectActionsBar
              onAddProjectClick={() => setIsAddProjectOpen(true)}
              sortOption={sortOption}
              onSortChange={setSortOption}
              isSavingProject={isSavingProject}
              isDemo={isDemo}
            />
          </CardHeader>
          <CardContent className="pt-0">
            {showCelebration && (
              <ProjectCelebrationBanner
                onResetAllClick={handleResetAllClick}
                isResettingAll={isResettingAll}
                isDemo={isDemo}
              />
            )}

            {projects.length > 0 && !loading && (
              <ProjectRecommendationBanner project={leastWorkedOnProject} />
            )}

            <ProjectList
              projects={projects}
              loading={loading}
              leastWorkedOnProject={leastWorkedOnProject}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onEdit={handleEditProject}
              onSaveEdit={handleSaveProjectEdit}
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
      </main>

      <AddProjectDialog
        isOpen={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
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
        onConfirm={confirmResetAll}
        isResetting={isResettingAll}
      />

      <ProjectNotesDialog
        project={selectedProjectForNotes}
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        onSave={handleSaveNotes}
      />
    </div>
  );
};

export default ProjectBalanceTracker;