import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, CheckCircle2, ListTodo } from 'lucide-react';
import { Task } from '@/hooks/useTasks';
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
import TaskForm from './TaskForm'; // Import the new TaskForm
import { cn } from '@/lib/utils'; // Import cn
import { parseISO } from 'date-fns'; // Import parseISO
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox component

interface TaskDetailDialogProps {
  task: Task | null;
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => void;
  // Removed unused props: currentDate, setCurrentDate
}

const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  task,
  userId,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  // Removed unused props from here
}) => {
  const { sections, tasks: allTasks, handleAddTask, updateTask: updateSubtask, allCategories, currentDate, setCurrentDate } = useTasks(); // Get currentDate from useTasks
  const { playSound } = useSound();
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // To manage saving state for main task form
  const [isAddSubtaskOpen, setIsAddSubtaskOpen] = useState(false);

  const subtasks = allTasks.filter(t => t.parent_task_id === task?.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Define the type for the task data expected by onSave
  type TaskFormData = Parameters<typeof TaskForm>['0']['onSave'] extends ((taskData: infer T) => any) ? T : never;

  const handleSaveMainTask = async (taskData: TaskFormData) => {
    if (!task) return false;
    setIsSaving(true);
    await onUpdate(task.id, taskData);
    setIsSaving(false);
    return true; // Indicate success
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

  const handleAddSubtask = async (subtaskData: TaskFormData) => {
    if (!task || !userId) return false;

    // Convert ISO strings back to Date objects for handleAddTask
    const convertedSubtaskData = {
      ...subtaskData,
      due_date: subtaskData.due_date ? parseISO(subtaskData.due_date) : null,
      remind_at: subtaskData.remind_at ? parseISO(subtaskData.remind_at) : null,
    };

    const success = await handleAddTask({
      ...convertedSubtaskData,
      parent_task_id: task.id,
      section_id: task.section_id, // Inherit section from parent
    });
    if (success) {
      setIsAddSubtaskOpen(false);
    }
    return success;
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
      playSound('success'); // Or a different sound for 'to-do'
    }
    setIsSaving(false);
    onClose(); // Close after status change
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <TaskForm
          initialData={task}
          onSave={handleSaveMainTask}
          onCancel={onClose}
          userId={userId}
          sections={sections}
          allCategories={allCategories}
          autoFocus={false} // Auto-focus handled by dialog's initialFocus
        />

        {/* Sub-tasks section */}
        <div className="space-y-2 mt-4 border-t pt-3">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Sub-tasks ({subtasks.length})</h3>
            <Button variant="outline" size="sm" onClick={() => setIsAddSubtaskOpen(true)}>
              Add Sub-task
            </Button>
          </div>
          {subtasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sub-tasks yet. Break down this task into smaller steps!</p>
          ) : (
            <ul className="space-y-2">
              {subtasks.map(subtask => (
                <li key={subtask.id} className="flex items-center space-x-2 p-2 border rounded-md bg-background">
                  <Checkbox
                    checked={subtask.status === 'completed'}
                    onCheckedChange={(checked: boolean) => handleSubtaskStatusChange(subtask.id, checked ? 'completed' : 'to-do')}
                    id={`subtask-${subtask.id}`}
                    className="flex-shrink-0 h-4 w-4"
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
                  {subtask.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 pt-3">
          <Button
            variant={task.status === 'completed' ? 'outline' : 'default'}
            onClick={handleToggleMainTaskStatus}
            disabled={isSaving}
            className="w-full sm:w-auto mt-2 sm:mt-0"
          >
            {task.status === 'completed' ? (
              <><ListTodo className="mr-2 h-4 w-4" /> Mark To-Do</>
            ) : (
              <><CheckCircle2 className="mr-2 h-4 w-4" /> Mark Complete</>
            )}
          </Button>
          <Button variant="destructive" onClick={handleDeleteClick} disabled={isSaving} className="w-full sm:w-auto mt-2 sm:mt-0">
            <Trash2 className="mr-2 h-4 w-4" /> Delete Task
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Add Subtask Dialog */}
      <Dialog open={isAddSubtaskOpen} onOpenChange={setIsAddSubtaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sub-task for "{task.description}"</DialogTitle>
          </DialogHeader>
          <TaskForm
            onSave={handleAddSubtask}
            onCancel={() => setIsAddSubtaskOpen(false)}
            userId={userId}
            sections={sections}
            allCategories={allCategories}
            autoFocus={true}
            parentTaskId={task.id}
            preselectedSectionId={task.section_id} // Pre-select parent's section
          />
        </DialogContent>
      </Dialog>

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