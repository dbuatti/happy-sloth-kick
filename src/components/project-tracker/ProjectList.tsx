import React, { useState, useEffect } from 'react';
import { Project } from '@/hooks/useProjects';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from '@/components/Progress';
import { cn } from '@/lib/utils';
import { Plus, Minus, Edit, Trash2, RotateCcw, CheckCircle2, Link as LinkIcon, StickyNote, LayoutGrid } from 'lucide-react'; // Added LayoutGrid
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectListProps {
  projects: Project[];
  loading: boolean;
  leastWorkedOnProject: Project | null;
  onIncrement: (projectId: string) => Promise<void>;
  onDecrement: (projectId: string) => Promise<void>;
  onEdit: (project: Project) => void;
  onSaveEdit: (projectId: string, name: string, description: string, link: string) => Promise<void>;
  onCancelEdit: () => void;
  onDelete: (projectId: string) => void;
  onResetIndividual: (projectId: string) => void;
  onOpenNotes: (project: Project) => void;
  editingProjectId: string | null;
  isSavingProject: boolean;
  isDemo: boolean;
}

const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  loading,
  leastWorkedOnProject,
  onIncrement,
  onDecrement,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onResetIndividual,
  onOpenNotes,
  editingProjectId,
  isSavingProject,
  isDemo,
}) => {
  const [editingProjectName, setEditingProjectName] = useState('');
  const [editingProjectDescription, setEditingProjectDescription] = useState('');
  const [editingProjectLink, setEditingProjectLink] = useState('');

  useEffect(() => {
    if (editingProjectId) {
      const project = projects.find(p => p.id === editingProjectId);
      if (project) {
        setEditingProjectName(project.name);
        setEditingProjectDescription(project.description || '');
        setEditingProjectLink(project.link || '');
      }
    }
  }, [editingProjectId, projects]);

  const handleSaveEditClick = async () => {
    if (editingProjectId && editingProjectName.trim()) {
      await onSaveEdit(editingProjectId, editingProjectName.trim(), editingProjectDescription.trim(), editingProjectLink.trim());
    }
  };

  const getProgressColor = (count: number) => {
    if (count >= 8) return 'bg-primary';
    if (count >= 4) return 'bg-accent';
    return 'bg-destructive';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl p-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card dark:bg-gray-800 shadow-sm">
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 mt-3 sm:mt-0">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
        <LayoutGrid className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">No projects added yet!</p>
        <p className="text-sm">Click "Add Project" to start tracking your balance and ensure you're giving attention to all your important areas.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {projects.map(project => (
        <li
          key={project.id}
          className={cn(
            "rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
            "transition-all duration-200 ease-in-out group",
            "hover:shadow-md",
            editingProjectId === project.id ? "bg-accent/5 dark:bg-accent/10 border-accent/30 dark:border-accent/70" : "bg-card dark:bg-gray-800 shadow-sm",
            leastWorkedOnProject?.id === project.id && "border-2 border-primary dark:border-primary"
          )}
        >
          <div className="flex-1 min-w-0">
            {editingProjectId === project.id ? (
              <div className="space-y-2">
                <Input
                  value={editingProjectName}
                  onChange={(e) => setEditingProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEditClick()}
                  className="text-lg font-semibold h-9"
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
                <Input
                  type="url"
                  value={editingProjectLink}
                  onChange={(e) => setEditingProjectLink(e.target.value)}
                  placeholder="e.g., https://github.com/my-project"
                  disabled={isSavingProject}
                  className="h-9"
                />
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold truncate flex items-center gap-2">
                  {project.name}
                  {project.current_count === 10 && (
                    <CheckCircle2 className="h-5 w-5" />
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

          <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0 w-full sm:w-64 md:w-80 lg:w-96">
            {editingProjectId === project.id ? (
              <div className="flex gap-2 w-full">
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSaveEditClick(); }} disabled={isSavingProject || !editingProjectName.trim()} className="flex-1 h-9">
                  {isSavingProject ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onCancelEdit(); }} disabled={isSavingProject} className="flex-1 h-9">Cancel</Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 w-full">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={(e) => { e.stopPropagation(); onDecrement(project.id); }}
                    disabled={project.current_count <= 0 || isDemo}
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
                    className="h-9 w-9"
                    onClick={(e) => { e.stopPropagation(); onIncrement(project.id); }}
                    disabled={project.current_count >= 10 || isDemo}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex gap-2 w-full sm:w-auto sm:ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    onClick={(e) => { e.stopPropagation(); onOpenNotes(project); }}
                    aria-label={`Notes for ${project.name}`}
                    disabled={isSavingProject || isDemo}
                  >
                    <StickyNote className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    onClick={(e) => { e.stopPropagation(); onEdit(project); }}
                    aria-label={`Edit ${project.name}`}
                    disabled={isSavingProject || isDemo}
                  >
                    <Edit className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    onClick={(e) => { e.stopPropagation(); onResetIndividual(project.id); }}
                    aria-label={`Reset ${project.name}`}
                    disabled={isSavingProject || isDemo}
                  >
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
                    aria-label={`Delete ${project.name}`}
                    disabled={isSavingProject || isDemo}
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
  );
};

export default ProjectList;