import React, { useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TaskForm from './TaskForm';
import { Category, NewTaskData, TaskSection, Task } from '@/hooks/useTasks';

interface AddTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: NewTaskData) => Promise<any>;
  sections: TaskSection[];
  allCategories: Category[];
  currentDate: Date;
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  allTasks: Task[];
  preselectedParentTaskId?: string | null;
  preselectedSectionId?: string | null;
  createCategory: (name: string, color: string) => Promise<string | null>; // Added
  updateCategory: (categoryId: string, updates: Partial<Category>) => Promise<boolean>; // Added
  deleteCategory: (categoryId: string) => Promise<boolean>; // Added
}

const AddTaskDialog: React.FC<AddTaskDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  sections,
  allCategories,
  currentDate,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  allTasks,
  preselectedParentTaskId,
  preselectedSectionId,
  createCategory, // Destructure
  updateCategory, // Destructure
  deleteCategory, // Destructure
}) => {
  const handleSave = useCallback(async (taskData: NewTaskData) => {
    const success = await onSave(taskData);
    if (success) {
      onClose();
    }
    return success;
  }, [onSave, onClose]);

  const content = (
    <TaskForm
      onSave={handleSave}
      onCancel={onClose}
      sections={sections}
      allCategories={allCategories}
      autoFocus={true}
      currentDate={currentDate}
      createSection={createSection}
      updateSection={updateSection}
      deleteSection={deleteSection}
      updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
      allTasks={allTasks}
      preselectedParentTaskId={preselectedParentTaskId}
      preselectedSectionId={preselectedSectionId}
      createCategory={createCategory} // Pass through
      updateCategory={updateCategory} // Pass through
      deleteCategory={deleteCategory} // Pass through
    />
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{preselectedParentTaskId ? "Add Subtask" : "Add New Task"}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;