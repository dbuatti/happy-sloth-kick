import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { Task, TaskSection, TaskCategory, Project, TaskStatus } from '@/types/task';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2 } from 'lucide-react';
import AddTaskForm from '@/components/AddTaskForm';
import ProjectBalanceCard from '@/components/dashboard/ProjectBalanceCard';
import { TaskOverviewDialog } from '@/components/TaskOverviewDialog';
import { TaskDetailDialog } from '@/components/TaskDetailDialog';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { ProjectBalanceTrackerPageProps, AddTaskFormProps, ProjectNotesDialogProps } from '@/types/props';

interface ProjectFormState {
  name: string;
  description: string;
  link: string;
}

const ProjectNotesDialog: React.FC<ProjectNotesDialogProps> = ({ isOpen, onClose, project, onSaveNotes }) => {
  const [notes, setNotes] = useState(project.notes || '');

  useEffect(() => {
    setNotes(project.notes || '');
  }, [project]);

  const handleSave = async () => {
    await onSaveNotes(notes);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Notes for {project.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="project-notes">Notes</Label>
          <Textarea
            id="project-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Notes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ProjectBalanceTrackerPage: React.FC<ProjectBalanceTrackerPageProps> = ({ isDemo: propIsDemo, demoUserId }) => {
  const { user } = useAuth();
  const userId = user?.id || demoUserId;
  const isDemo = propIsDemo || user?.id === 'd889323b-350c-4764-9788-6359f85f6142';

  const [currentDate] = useState(new Date());
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectFormData, setProjectFormData] = useState<ProjectFormState>({ name: '', description: '', link: '' });
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [prefilledTaskData, setPrefilledTaskData] = useState<Partial<Task> | null>(null);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFocusViewOpen, setIsFocusViewOpen] = useState(false);
  const [isProjectNotesOpen, setIsProjectNotesOpen] = useState(false);
  const [selectedProjectForNotes, setSelectedProjectForNotes] = useState<Project | null>(null);

  const {
    tasks,
    sections,
    allCategories,
    handleAddTask,
    updateTask,
    deleteTask,
    reorderTasks,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    createCategory,
    updateCategory,
    deleteCategory,
    onStatusChange,
  } = useTasks({ userId: userId, currentDate: currentDate, viewMode: 'all' });

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
  } = useProjects({ userId });

  const totalProjectCount = useMemo(() => {
    return projects.reduce((sum, project) => sum + project.current_count, 0);
  }, [projects]);

  const handleOpenProjectForm = (project: Project | null = null) => {
    setEditingProject(project);
    if (project) {
      setProjectFormData({ name: project.name, description: project.description || '', link: project.link || '' });
    } else {
      setProjectFormData({ name: '', description: '', link: '' });
    }
    setIsProjectFormOpen(true);
  };

  const handleSaveProject = async () => {
    if (!projectFormData.name.trim()) return;
    if (editingProject) {
      await updateProject(editingProject.id, {
        name: projectFormData.name.trim(),
        description: projectFormData.description,
        link: projectFormData.link,
      });
    } else {
      await addProject(projectFormData.name.trim(), projectFormData.description, projectFormData.link);
    }
    setIsProjectFormOpen(false);
  };

  const handleEditProjectNotes = (project: Project) => {
    setSelectedProjectForNotes(project);
    setIsProjectNotesOpen(true);
  };

  const handleSaveProjectNotes = async (notes: string) => {
    if (selectedProjectForNotes) {
      await updateProject(selectedProjectForNotes.id, { notes });
      setSelectedProjectForNotes({ ...selectedProjectForNotes, notes });
    }
    setIsProjectNotesOpen(false);
  };

  const handleOpenOverview = (task: Task) => {
    setSelectedTask(task);
    setIsOverviewOpen(true);
  };

  const handleOpenDetail = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleOpenFocusView = (task: Task) => {
    setSelectedTask(task);
    setIsFocusViewOpen(true);
  };

  const handleNewTaskSubmit = async (taskData: Partial<Task>) => {
    const newTask = await handleAddTask(taskData);
    if (newTask) {
      setIsAddTaskDialogOpen(false);
      setPrefilledTaskData(null);
    }
    return newTask;
  };

  const handleStatusChangeWrapper = async (taskId: string, newStatus: TaskStatus): Promise<Task | null> => {
    return updateTask(taskId, { status: newStatus });
  };

  const addTaskFormProps: AddTaskFormProps = {
    onAddTask: handleNewTaskSubmit,
    onTaskAdded: () => setIsAddTaskDialogOpen(false),
    sections: sections,
    allCategories: allCategories,
    currentDate: currentDate,
    createSection: createSection,
    updateSection: updateSection,
    deleteSection: deleteSection,
    updateSectionIncludeInFocusMode: updateSectionIncludeInFocusMode,
    createCategory: createCategory,
    updateCategory: updateCategory,
    deleteCategory: deleteCategory,
    initialData: prefilledTaskData,
    onUpdate: updateTask,
    onDelete: deleteTask,
    onReorderTasks: reorderTasks,
    onStatusChange: onStatusChange,
  };

  if (projectsLoading) {
    return <div className="p-4 md:p-6">Loading projects...</div>;
  }

  if (projectsError) {
    return <div className="p-4 md:p-6 text-red-500">Error loading projects: {projectsError.message}</div>;
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Project Balance Tracker</h1>

      <div className="flex justify-between items-center mb-6">
        <Button onClick={() => handleOpenProjectForm()}>
          <Plus className="mr-2 h-4 w-4" /> Add New Project
        </Button>
        <Button variant="outline" onClick={resetAllProjectCounts}>
          Reset All Counts
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {projects.length === 0 ? (
          <p className="text-center text-gray-500 col-span-full">No projects yet. Add your first project!</p>
        ) : (
          projects.map((project) => (
            <ProjectBalanceCard
              key={project.id}
              project={project}
              onIncrement={incrementProjectCount}
              onDecrement={decrementProjectCount}
              onDelete={deleteProject}
              onEditNotes={handleEditProjectNotes}
              totalCount={totalProjectCount}
            />
          ))
        )}
      </div>

      <Dialog open={isProjectFormOpen} onOpenChange={setIsProjectFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Edit Project' : 'Add New Project'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input
                id="name"
                value={projectFormData.name}
                onChange={(e) => setProjectFormData({ ...projectFormData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Textarea
                id="description"
                value={projectFormData.description}
                onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link" className="text-right">Link</Label>
              <Input
                id="link"
                value={projectFormData.link}
                onChange={(e) => setProjectFormData({ ...projectFormData, link: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsProjectFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProject}>{editingProject ? 'Save Changes' : 'Add Project'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedProjectForNotes && (
        <ProjectNotesDialog
          isOpen={isProjectNotesOpen}
          onClose={() => setIsProjectNotesOpen(false)}
          project={selectedProjectForNotes}
          onSaveNotes={handleSaveProjectNotes}
        />
      )}

      <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <AddTaskForm {...addTaskFormProps} />
        </DialogContent>
      </Dialog>

      <TaskOverviewDialog
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        task={selectedTask}
        onOpenDetail={handleOpenDetail}
        onOpenFocusView={handleOpenFocusView}
        updateTask={updateTask}
        deleteTask={deleteTask}
        sections={sections}
        allCategories={allCategories}
        allTasks={tasks}
        onAddTask={handleAddTask}
        onReorderTasks={reorderTasks}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
        onUpdate={updateTask}
        onDelete={deleteTask}
        onStatusChange={onStatusChange}
      />

      <TaskDetailDialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        task={selectedTask}
        onUpdate={updateTask}
        onDelete={deleteTask}
        sections={sections}
        allCategories={allCategories}
        allTasks={tasks}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
        onAddTask={handleAddTask}
        onReorderTasks={reorderTasks}
        onStatusChange={onStatusChange}
      />

      {isFocusViewOpen && selectedTask && (
        <FullScreenFocusView
          task={selectedTask}
          onClose={() => setIsFocusViewOpen(false)}
          onComplete={() => {
            updateTask(selectedTask.id, { status: 'completed' });
            setIsFocusViewOpen(false);
          }}
          onSkip={() => {
            updateTask(selectedTask.id, { status: 'skipped' });
            setIsFocusViewOpen(false);
          }}
          onOpenDetail={handleOpenDetail}
          updateTask={updateTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={tasks}
          onAddTask={handleAddTask}
          onReorderTasks={reorderTasks}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          createCategory={createCategory}
          updateCategory={updateCategory}
          deleteCategory={deleteCategory}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onStatusChange={onStatusChange}
        />
      )}
    </div>
  );
};

export default ProjectBalanceTrackerPage;