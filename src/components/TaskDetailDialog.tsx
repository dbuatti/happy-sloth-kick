"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
import { format, parseISO } from 'date-fns'; // Removed isValid
import { Edit, Trash2, Link as LinkIcon, Calendar as CalendarIcon, PlusCircle } from 'lucide-react'; // Removed FileText, Image
import { cn } from '@/lib/utils';
import TaskForm from './TaskForm';
import { showSuccess, showError } from '@/utils/toast';
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
import { ScrollArea } from "@/components/ui/scroll-area";
import ImagePreviewDialog from './ImagePreviewDialog'; // Assuming this component exists
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

interface TaskDetailDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onDelete: (taskId: string) => Promise<any>;
  sections: TaskSection[];
  allCategories: Category[];
  allTasks: Task[]; // For subtask creation context
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  onAddSubtask: (parentTaskId: string | null, sectionId: string | null) => void;
}

const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  sections,
  allCategories,
  allTasks,
  createSection,
  updateSection,
  updateSectionIncludeInFocusMode,
  deleteSection,
  onAddSubtask,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false); // Reset edit mode when dialog closes
    }
  }, [isOpen]);

  const handleSave = async (updatedData: NewTaskData) => {
    const result = await onUpdate(task.id, updatedData);
    if (result) {
      setIsEditing(false);
      showSuccess('Task updated successfully!');
      return true;
    }
    return false;
  };

  const handleDelete = async () => {
    await onDelete(task.id);
    setIsConfirmDeleteOpen(false);
    onClose();
    showError('Task deleted!');
  };

  const getCategoryName = (categoryId: string | null) => {
    return allCategories.find(cat => cat.id === categoryId)?.name || 'N/A';
  };

  const getSectionName = (sectionId: string | null) => {
    return sections.find(sec => sec.id === sectionId)?.name || 'No Section';
  };

  const isUrl = (path: string) => path && (path.startsWith('http://') || path.startsWith('https://'));

  const subtasks = useMemo(() => {
    return allTasks.filter(t => t.parent_task_id === task.id);
  }, [allTasks, task.id]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {isEditing ? 'Edit Task' : 'Task Details'}
              {!isEditing && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setIsConfirmDeleteOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              )}
            </DialogTitle>
            {!isEditing && (
              <DialogDescription>
                View and manage the details of your task.
              </DialogDescription>
            )}
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4"> {/* Adjust max-height based on header/footer */}
            {isEditing ? (
              <TaskForm
                initialData={task}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
                sections={sections}
                allCategories={allCategories}
                currentDate={new Date()}
                createSection={createSection}
                updateSection={updateSection}
                deleteSection={deleteSection}
                updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
                allTasks={allTasks}
              />
            ) : (
              <div className="space-y-4 py-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Description</p>
                  <p className="font-medium text-base">{task.description}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{task.status.charAt(0).toUpperCase() + task.status.slice(1)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">{getCategoryName(task.category)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Priority</p>
                  <p className="font-medium">{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Section</p>
                  <p className="font-medium">{getSectionName(task.section_id)}</p>
                </div>
                {task.due_date && (
                  <div>
                    <p className="text-muted-foreground">Due Date</p>
                    <p className="font-medium flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" /> {format(parseISO(task.due_date), 'PPP')}
                    </p>
                  </div>
                )}
                {task.remind_at && (
                  <div>
                    <p className="text-muted-foreground">Reminder</p>
                    <p className="font-medium flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" /> {format(parseISO(task.remind_at), 'PPP - hh:mm a')}
                    </p>
                  </div>
                )}
                {task.recurring_type !== 'none' && (
                  <div>
                    <p className="text-muted-foreground">Recurring</p>
                    <p className="font-medium">{task.recurring_type.charAt(0).toUpperCase() + task.recurring_type.slice(1)}</p>
                  </div>
                )}
                {task.link && (
                  <div>
                    <p className="text-muted-foreground">Link / File Path</p>
                    {isUrl(task.link) ? (
                      <a href={task.link} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-500 hover:underline flex items-center gap-1">
                        <LinkIcon className="h-4 w-4" /> {task.link}
                      </a>
                    ) : (
                      <p className="font-medium flex items-center gap-1">
                        {task.link}
                      </p>
                    )}
                  </div>
                )}
                {task.image_url && (
                  <div>
                    <p className="text-muted-foreground">Image</p>
                    <img
                      src={task.image_url}
                      alt="Task attachment"
                      className="max-w-full h-auto rounded-md cursor-pointer mt-2"
                      onClick={() => setIsImagePreviewOpen(true)}
                    />
                  </div>
                )}
                {task.notes && (
                  <div>
                    <p className="text-muted-foreground">Notes</p>
                    <p className="font-medium whitespace-pre-wrap">{task.notes}</p>
                  </div>
                )}

                {subtasks.length > 0 && (
                  <div className="pt-4">
                    <p className="text-muted-foreground mb-2">Subtasks ({subtasks.length})</p>
                    <ul className="space-y-2">
                      {subtasks.map(sub => (
                        <li key={sub.id} className="flex items-center gap-2 text-sm">
                          <span className={cn(
                            "inline-block h-2 w-2 rounded-full",
                            sub.status === 'completed' ? 'bg-green-500' : 'bg-gray-400'
                          )} />
                          <span className={cn(sub.status === 'completed' && 'line-through text-muted-foreground')}>
                            {sub.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => onAddSubtask(task.id, task.section_id)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Subtask
                </Button>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your task and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {task.image_url && (
        <ImagePreviewDialog
          isOpen={isImagePreviewOpen}
          onClose={() => setIsImagePreviewOpen(false)}
          imageUrl={task.image_url}
        />
      )}
    </>
  );
};

export default TaskDetailDialog;