"use client";

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
  allTasks?: Task[];
  preselectedParentTaskId?: string | null;
  preselectedSectionId?: string | null;
  createCategory: (name: string, color: string) => Promise<string | null>;
  updateCategory: (categoryId: string, updates: Partial<Category>) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
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
  createCategory,
  updateCategory,
  deleteCategory,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Fill in the details for your new task.
          </DialogDescription>
        </DialogHeader>
        <TaskForm
          onSave={onSave}
          onCancel={onClose}
          sections={sections}
          allCategories={allCategories}
          autoFocus={true}
          preselectedSectionId={preselectedSectionId}
          preselectedParentTaskId={preselectedParentTaskId}
          currentDate={currentDate}
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

export default AddTaskDialog;