import React, { useState } from 'react'; // Removed useEffect
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
import TaskForm from './TaskForm';
import { showError, showSuccess } from '@/utils/toast';
import { Trash2 } from 'lucide-react'; // Removed AlertCircle
import ConfirmationDialog from './ConfirmationDialog';

interface TaskDetailDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onDelete: (taskId: string) => Promise<boolean | undefined>;
  sections: TaskSection[];
  allCategories: Category[];
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  allTasks: Task[];
  onAddSubtask: (parentTaskId: string | null, sectionId: string | null) => void;
  createCategory: (name: string, color: string) => Promise<string | null>;
  updateCategory: (categoryId: string, updates: Partial<Category>) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  onOpenOverview: (task: Task) => void;
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
  onAddSubtask: _onAddSubtask,
  createCategory,
  updateCategory,
  deleteCategory,
  onOpenOverview: _onOpenOverview,
}) => {
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (taskData: NewTaskData) => {
    setIsSaving(true);
    const result = await onUpdate(task.id, taskData);
    setIsSaving(false);
    if (result) {
      showSuccess('Task details updated!');
      onClose();
    } else {
      showError('Failed to update task details.');
    }
    return result;
  };

  const handleDelete = async () => {
    setIsConfirmDeleteOpen(false);
    const success = await onDelete(task.id);
    if (success) {
      showSuccess('Task deleted successfully!');
      onClose();
    } else {
      showError('Failed to delete task.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>
            Edit the details of your task.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <TaskForm
            initialData={task}
            onSave={handleSave}
            onCancel={onClose}
            sections={sections}
            allCategories={allCategories}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            createCategory={createCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
            allTasks={allTasks}
            className="p-0"
          />
        </div>
        <DialogFooter className="flex justify-between items-center mt-4">
          <Button
            variant="destructive"
            onClick={() => setIsConfirmDeleteOpen(true)}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" /> Delete Task
          </Button>
          {/* Save and Cancel buttons are handled by TaskForm */}
        </DialogFooter>
      </DialogContent>

      <ConfirmationDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Confirm Deletion"
        description={`Are you sure you want to delete the task "${task.description}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="destructive"
      />
    </Dialog>
  );
};

export default TaskDetailDialog;