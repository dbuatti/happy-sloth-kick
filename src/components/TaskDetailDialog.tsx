import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerDescription } from "@/components/ui/drawer";
import { Trash2, ListTodo, Plus, CheckCircle2 } from 'lucide-react';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { useTasks } from '@/hooks/useTasks';
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
import { useSound } from '@/context/SoundContext';
import TaskForm from './TaskForm';
import { cn } from '@/lib/utils';
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface TaskDetailDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onDelete: (taskId: string) => void;
  sections: TaskSection[];
  allCategories: Category[];
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  allTasks: Task[];
}

const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  sections,
  allCategories,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  allTasks,
}) => {
  useAuth(); 
  const isMobile = useIsMobile();

  const { updateTask: updateSubtask, handleAddTask, bulkUpdateTasks } = useTasks({ currentDate: new Date() });
  const { playSound } = useSound();
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddSubtaskOpen, setIsAddSubtaskOpen] = useState(false);

  type TaskFormData = Parameters<typeof TaskForm>['0']['onSave'] extends ((taskData: infer T) => any) ? T : never;

  const handleSaveMainTask = async (taskData: TaskFormData) => {
    if (!task) return false;
    setIsSaving(true);
    await onUpdate(task.id, taskData);
    setIsSaving(false);
    return true;
  };

  const handleAddSubtask = async (subtaskData: TaskFormData) => {
    if (!task) return false;
    const success = await handleAddTask({
      ...subtaskData,
      parent_task_id: task.id,
      section_id: task.section_id, // Inherit section from parent
      category: task.category, // Inherit category from parent
    });
    if (success) {
      setIsAddSubtaskOpen(false);
    }
    return success;
  };

  const handleDeleteClick = () => {
    setShowConfirmDeleteDialog(true);
  };

  const confirmDeleteTask = () => {
    if (task) {
      onDelete(task.id);
      setShowConfirmDeleteDialog(false);
      onClose();
    }
  };

  const handleSubtaskStatusChange = async (subtaskId: string, newStatus: Task['status']) => {
    await updateSubtask(subtaskId, { status: newStatus });
  };

  const handleToggleMainTaskStatus = async () => {
    if (!task) return;
    setIsSaving(true);
    const newStatus = task.status === 'completed' ? 'to-do' : 'completed';
    await onUpdate(task.id, { status: newStatus });
    if (newStatus === 'completed') {
      playSound('success');
    } else {
      playSound('success');
    }
    setIsSaving(false);
    onClose();
  };

  const handleMarkAllSubtasksCompleted = async () => {
    if (!task) return;
    const subtaskIdsToComplete = subtasks.filter(st => st.status !== 'completed').map(st => st.id);
    if (subtaskIdsToComplete.length > 0) {
      setIsSaving(true);
      await bulkUpdateTasks({ status: 'completed' }, subtaskIdsToComplete);
      playSound('success');
      setIsSaving(false);
    }
  };

  if (!task) return null;

  const subtasks = allTasks.filter(t => t.parent_task_id === task?.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const MainContent = () => (
    <>
      <TaskForm
        initialData={task}
        onSave={handleSaveMainTask}
        onCancel={onClose}
        sections={sections}
        allCategories={allCategories}
        autoFocus={false}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        className="text-foreground" // Changed to text-foreground
        allTasks={allTasks} // Pass allTasks for parent lookup
      />

      <div className="space-y-2 mt-3 border-t pt-2">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-semibold text-foreground">Sub-tasks ({subtasks.length})</h3>
          <div className="flex gap-2">
            {subtasks.length > 0 && (
              <Button variant="outline" size="sm" className="h-8 text-base" onClick={handleMarkAllSubtasksCompleted} disabled={isSaving || subtasks.every(st => st.status === 'completed')}>
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Mark All Complete
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 text-base" onClick={() => setIsAddSubtaskOpen(true)} disabled={isSaving}>
              <Plus className="mr-2 h-3.5 w-3.5" /> Add Sub-task
            </Button>
          </div>
        </div>
        {subtasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sub-tasks yet. Break down this task into smaller steps!</p>
        ) : (
          <ul className="space-y-1.5">
            {subtasks.map(subtask => (
              <li key={subtask.id} className="flex items-center space-x-2 p-1.5 rounded-md bg-background shadow-sm">
                <Checkbox
                  checked={subtask.status === 'completed'}
                  onCheckedChange={(checked: boolean) => handleSubtaskStatusChange(subtask.id, checked ? 'completed' : 'to-do')}
                  id={`subtask-${subtask.id}`}
                  className="flex-shrink-0 h-3.5 w-3.5"
                />
                <label
                  htmlFor={`subtask-${subtask.id}`}
                  className={cn(
                    "flex-1 text-sm font-medium leading-tight",
                    subtask.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-foreground',
                    "block truncate"
                  )}
                >
                  {subtask.description}
                </label>
                {subtask.status === 'completed' && <ListTodo className="h-3.5 w-3.5 text-green-500" />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );

  const FooterContent = ({ isDrawer = false }: { isDrawer?: boolean }) => {
    const FooterComponent = isDrawer ? DrawerFooter : DialogFooter;
    return (
      <FooterComponent className={isDrawer ? "pt-2" : "flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 pt-2"}>
        <Button
          variant={task.status === 'completed' ? 'outline' : 'default'}
          onClick={handleToggleMainTaskStatus}
          disabled={isSaving}
          className="w-full sm:w-auto mt-1.5 sm:mt-0 h-9 text-base"
        >
          {task.status === 'completed' ? (
            <><ListTodo className="mr-2 h-3.5 w-3.5" /> Mark To-Do</>
          ) : (
            <><ListTodo className="mr-2 h-3.5 w-3.5" /> Mark Complete</>
          )}
        </Button>
        <Button variant="destructive" onClick={handleDeleteClick} disabled={isSaving} className="w-full sm:w-auto mt-1.5 sm:mt-0 h-9 text-base">
          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Task
        </Button>
      </FooterComponent>
    );
  };

  return (
    <>
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="bg-background"> {/* Changed to bg-background */}
            <DrawerHeader className="text-left">
              <DrawerTitle>Edit Task</DrawerTitle>
              <DrawerDescription className="sr-only">
                Edit the details of your task, including sub-tasks.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto">
              <MainContent />
            </div>
            <FooterContent isDrawer />
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-xl bg-background"> {/* Changed to bg-background */}
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription className="sr-only">
                Edit the details of your task, including sub-tasks.
              </DialogDescription>
            </DialogHeader>
            <MainContent />
            <FooterContent />
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={showConfirmDeleteDialog} onOpenChange={setShowConfirmDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this task and all its sub-tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} disabled={isSaving}>
              {isSaving ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for adding a new subtask */}
      <Dialog open={isAddSubtaskOpen} onOpenChange={setIsAddSubtaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Sub-task to "{task?.description}"</DialogTitle>
            <DialogDescription className="sr-only">
              Fill in the details to add a new sub-task.
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            onSave={handleAddSubtask}
            onCancel={() => setIsAddSubtaskOpen(false)}
            sections={sections}
            allCategories={allCategories}
            currentDate={new Date()}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            parentTaskId={task?.id}
            preselectedSectionId={task?.section_id}
            initialData={{ category: task?.category || '' } as Partial<Task>} // Pass category for pre-fill
            allTasks={allTasks} // Pass allTasks for parent lookup
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskDetailDialog;