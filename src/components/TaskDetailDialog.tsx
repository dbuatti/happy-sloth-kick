import React, { useState } from 'react'; // Removed useEffect
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Task, UpdateTaskData, TaskSection, Category, NewTaskSectionData, UpdateTaskSectionData, NewCategoryData, UpdateCategoryData } from '@/hooks/useTasks';
import TaskForm from './TaskForm';
import { useSound } from '@/context/SoundContext';

interface TaskDetailDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: UpdateTaskData) => Promise<Task | null>;
  onDelete: (taskId: string) => Promise<boolean>;
  sections: TaskSection[];
  allCategories: Category[];
  createSection: (newSection: NewTaskSectionData) => Promise<TaskSection | null>;
  updateSection: (sectionId: string, updates: UpdateTaskSectionData) => Promise<TaskSection | null>;
  deleteSection: (sectionId: string) => Promise<boolean>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection | null>;
  createCategory: (newCategory: NewCategoryData) => Promise<Category | null>;
  updateCategory: (categoryId: string, updates: UpdateCategoryData) => Promise<Category | null>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  allTasks: Task[]; // For subtask selection if needed
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
  createCategory,
  updateCategory,
  deleteCategory,
  allTasks, // Kept for subtask selection, even if not directly used in this component's logic
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const { playSound } = useSound();

  const handleFormSubmit = async (updates: UpdateTaskData) => {
    setIsSaving(true);
    const result = await onUpdate(task.id, updates);
    setIsSaving(false);
    if (result) {
      playSound('success');
      onClose();
    }
    return result;
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      const success = await onDelete(task.id);
      if (success) {
        playSound('delete');
        onClose();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task.description}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <TaskForm
            initialData={task}
            onSubmit={handleFormSubmit}
            sections={sections}
            allCategories={allCategories}
            currentDate={new Date()} // Pass current date for form defaults
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            createCategory={createCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
          />
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
            Delete Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;