"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import TaskForm from './TaskForm';
import { Plus } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerDescription } from "@/components/ui/drawer";
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
  onAddSubtask?: (parentTaskId: string, preselectedSectionId: string | null) => void; // Made optional
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
  onAddSubtask, // Destructure new prop
}) => {
  const isMobile = useIsMobile();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSaving(false); // Reset saving state when dialog closes
    }
  }, [isOpen]);

  const handleSave = async (taskData: any) => {
    if (!task) return null;
    setIsSaving(true);
    const result = await onUpdate(task.id, taskData);
    setIsSaving(false);
    if (result) {
      onClose();
    }
    return result;
  };

  const handleDelete = async () => {
    if (!task) return;
    setIsSaving(true); // Use saving state for delete too
    await onDelete(task.id);
    setIsSaving(false);
    onClose();
  };

  const handleAddSubtaskClick = () => {
    if (task && onAddSubtask) { // Check if onAddSubtask is provided
      onAddSubtask(task.id, task.section_id);
      onClose(); // Close the detail dialog to open the add task dialog
    }
  };

  const Content = () => (
    <>
      {task ? (
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
          allTasks={allTasks}
        />
      ) : (
        <p className="text-center text-muted-foreground">No task selected.</p>
      )}
    </>
  );

  const Footer = () => (
    <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:space-x-2">
      {onAddSubtask && ( // Conditionally render button
        <Button
          variant="outline"
          onClick={handleAddSubtaskClick}
          disabled={isSaving || !task}
          className="w-full sm:w-auto mb-2 sm:mb-0"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Subtask
        </Button>
      )}
      <div className="flex flex-col sm:flex-row sm:space-x-2 w-full sm:w-auto">
        <Button variant="destructive" onClick={handleDelete} disabled={isSaving || !task} className="w-full sm:w-auto mb-2 sm:mb-0">
          Delete Task
        </Button>
        <Button variant="outline" onClick={onClose} disabled={isSaving} className="w-full sm:w-auto">
          Cancel
        </Button>
      </div>
    </DialogFooter>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="h-[90vh] flex flex-col">
          <DrawerHeader className="text-left">
            <DrawerTitle>{task ? task.description : "Task Details"}</DrawerTitle>
            <DrawerDescription>Edit task details or add a subtask.</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4">
            <Content />
          </div>
          <DrawerFooter>
            <Footer />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{task ? task.description : "Task Details"}</DialogTitle>
          <DialogDescription>Edit task details or add a subtask.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <Content />
        </div>
        <Footer />
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;