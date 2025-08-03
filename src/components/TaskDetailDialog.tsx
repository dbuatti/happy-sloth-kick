import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Trash2, ListTodo } from 'lucide-react';
import { Task, TaskSection, Category } from '@/hooks/useTasks'; // Import Task, TaskSection, Category types
import { useTasks } from '@/hooks/useTasks'; // Keep useTasks for subtask updates and handleAddTask
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
import { useAuth } from '@/context/AuthContext'; // Import useAuth

interface TaskDetailDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => void;
  sections: TaskSection[]; // Passed as prop
  allCategories: Category[]; // Passed as prop
  // New props for section management
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
}

const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  sections, // Destructure from props
  allCategories, // Destructure from props
  createSection, // Destructure new props
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
}) => {
  // Removed 'user' and 'userId' from useAuth destructuring as they are not directly used here.
  useAuth(); 

  // Only use useTasks for actions that require it, not for fetching global state
  const { tasks: allTasks, updateTask: updateSubtask } = useTasks(); 
  const { playSound } = useSound();
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  type TaskFormData = Parameters<typeof TaskForm>['0']['onSave'] extends ((taskData: infer T) => any) ? T : never;

  const handleSaveMainTask = async (taskData: TaskFormData) => {
    if (!task) return false;
    setIsSaving(true);
    await onUpdate(task.id, taskData);
    setIsSaving(false);
    return true;
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

  if (!task) return null;

  const subtasks = allTasks.filter(t => t.parent_task_id === task?.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription className="sr-only">
            Edit the details of your task, including sub-tasks.
          </DialogDescription>
        </DialogHeader>
        <TaskForm
          initialData={task}
          onSave={handleSaveMainTask}
          onCancel={onClose}
          sections={sections}
          allCategories={allCategories}
          autoFocus={false}
          createSection={createSection} // Pass new props
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        />

        <div className="space-y-2 mt-3 border-t pt-2">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold">Sub-tasks ({subtasks.length})</h3>
            <Button variant="outline" size="sm" className="h-8 text-base" onClick={() => { /* Removed setIsAddSubtaskOpen(true) */ }}>
              Add Sub-task
            </Button>
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

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 pt-2">
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
        </DialogFooter>
      </DialogContent>

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
    </Dialog>
  );
};

export default TaskDetailDialog;