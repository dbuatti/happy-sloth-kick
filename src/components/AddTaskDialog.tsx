"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import TaskForm from './TaskForm';
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
import { useIsMobile } from '@/hooks/use-mobile'; // Assuming useIsMobile is available

interface AddTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: NewTaskData) => Promise<any>;
  sections: TaskSection[];
  allCategories: Category[];
  preselectedSectionId?: string | null;
  preselectedParentTaskId?: string | null; // New prop
  parentTaskId?: string | null; // Keep existing for TaskForm compatibility if needed, but preselectedParentTaskId will override
  currentDate: Date;
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  allTasks: Task[]; // Pass allTasks for parent task context
}

const AddTaskDialog: React.FC<AddTaskDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  sections,
  allCategories,
  preselectedSectionId,
  preselectedParentTaskId, // Destructure new prop
  parentTaskId, // Keep existing
  currentDate,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  allTasks,
}) => {
  const isMobile = useIsMobile();

  const content = (
    <TaskForm
      onSave={onSave}
      onCancel={onClose}
      sections={sections}
      allCategories={allCategories}
      autoFocus={true}
      preselectedSectionId={preselectedSectionId}
      parentTaskId={preselectedParentTaskId ?? parentTaskId} // Use preselectedParentTaskId if available
      currentDate={currentDate}
      createSection={createSection}
      updateSection={updateSection}
      deleteSection={deleteSection}
      updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
      allTasks={allTasks}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="h-[90vh] flex flex-col">
          <DrawerHeader className="text-left">
            <DrawerTitle>Add New Task</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;