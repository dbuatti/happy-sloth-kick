import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import TaskForm from './TaskForm';
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';

interface TaskDetailDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  sections: TaskSection[];
  allCategories: Category[];
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  allTasks?: Task[];
  // Removed unused onAddSubtask
  createCategory: (name: string, color: string) => Promise<string | null>;
  updateCategory: (categoryId: string, updates: Partial<Category>) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  // Removed unused onOpenOverview
}

const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  sections,
  allCategories,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  allTasks,
  createCategory,
  updateCategory,
  deleteCategory,
}) => {
  const handleSave = async (taskData: NewTaskData) => {
    const success = await onUpdate(task.id, taskData);
    if (success) {
      onClose();
    }
    return success;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>View and edit your task details.</DialogDescription>
        </DialogHeader>
        <TaskForm
          initialData={task}
          onSave={handleSave}
          onCancel={onClose}
          sections={sections}
          allCategories={allCategories}
          currentDate={new Date()}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          createCategory={createCategory}
          updateCategory={updateCategory}
          deleteCategory={deleteCategory}
          allTasks={allTasks}
          className="flex-1"
        />
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;