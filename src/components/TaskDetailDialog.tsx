"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task, TaskSection, Category, NewTaskData } from '@/hooks/useTasks';
import { format, parseISO } from 'date-fns'; // Removed isValid
import { Edit, Trash2, Link as LinkIcon, Calendar as CalendarIcon, PlusCircle } from 'lucide-react'; // Removed FileText, Image
import { cn } from '@/lib/utils';
import TaskForm from './TaskForm';
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea for content scrolling
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { showError, showSuccess } from '@/utils/toast';

interface TaskDetailDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onDelete: (taskId: string) => Promise<any>;
  sections: TaskSection[];
  allCategories: Category[];
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  allTasks: Task[]; // For subtask context
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
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  allTasks,
  onAddSubtask,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false); // Reset edit mode when dialog closes
      setIsConfirmDeleteOpen(false); // Reset delete confirmation
    }
  }, [isOpen]);

  const handleSave = async (formData: NewTaskData) => {
    const result = await onUpdate(task.id, formData);
    if (result) {
      setIsEditing(false);
      return true;
    }
    return false;
  };

  const handleDelete = async () => {
    await onDelete(task.id);
    onClose();
  };

  const getCategoryName = (categoryId: string | null) => {
    return allCategories.find(cat => cat.id === categoryId)?.name || 'N/A';
  };

  const getSectionName = (sectionId: string | null) => {
    return sections.find(sec => sec.id === sectionId)?.name || 'No Section';
  };

  const isUrl = (path: string) => path.startsWith('http://') || path.startsWith('https://');

  const handleCopyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      showSuccess('Path copied to clipboard!');
    } catch (err) {
      showError('Could not copy path.');
    }
  };

  const subtasks = allTasks.filter(t => t.parent_task_id === task.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? 'Edit Task' : 'Task Details'}
            {!isEditing && (
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} aria-label="Edit task">
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Make changes to your task here.' : 'View the details of your task.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-6 -mr-6"> {/* Added ScrollArea here */}
          <div className="grid gap-4 py-4">
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
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-sm font-medium col-span-1">Description:</span>
                  <span className="col-span-3 text-sm">{task.description}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-sm font-medium col-span-1">Status:</span>
                  <span className="col-span-3 text-sm capitalize">{task.status}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-sm font-medium col-span-1">Category:</span>
                  <span className="col-span-3 text-sm">{getCategoryName(task.category)}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-sm font-medium col-span-1">Priority:</span>
                  <span className="col-span-3 text-sm capitalize">{task.priority}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-sm font-medium col-span-1">Section:</span>
                  <span className="col-span-3 text-sm">{getSectionName(task.section_id)}</span>
                </div>
                {task.due_date && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-sm font-medium col-span-1">Due Date:</span>
                    <span className="col-span-3 text-sm flex items-center gap-1">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {format(parseISO(task.due_date), 'PPP')}
                    </span>
                  </div>
                )}
                {task.remind_at && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-sm font-medium col-span-1">Reminder:</span>
                    <span className="col-span-3 text-sm flex items-center gap-1">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {format(parseISO(task.remind_at), 'PPP p')}
                    </span>
                  </div>
                )}
                {task.recurring_type !== 'none' && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-sm font-medium col-span-1">Recurring:</span>
                    <span className="col-span-3 text-sm capitalize">{task.recurring_type}</span>
                  </div>
                )}
                {task.link && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-sm font-medium col-span-1">Link:</span>
                    <span className="col-span-3 text-sm flex items-center gap-1">
                      {isUrl(task.link) ? (
                        <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                          <LinkIcon className="h-3.5 w-3.5" /> {task.link}
                        </a>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-auto p-0 text-blue-500 hover:underline flex items-center gap-1" onClick={() => handleCopyPath(task.link!)}>
                              <LinkIcon className="h-3.5 w-3.5" /> {task.link}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy path: {task.link}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                  </div>
                )}
                {task.image_url && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-sm font-medium col-span-1">Image:</span>
                    <span className="col-span-3 text-sm">
                      <a href={task.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        <img src={task.image_url} alt="Task attachment" className="max-w-full h-auto max-h-48 rounded-md object-cover mt-2" />
                      </a>
                    </span>
                  </div>
                )}
                {task.notes && (
                  <div className="grid grid-cols-4 items-start gap-4">
                    <span className="text-sm font-medium col-span-1">Notes:</span>
                    <span className="col-span-3 text-sm whitespace-pre-wrap">{task.notes}</span>
                  </div>
                )}

                {subtasks.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-md font-semibold mb-2">Subtasks ({subtasks.length})</h4>
                    <ul className="space-y-2">
                      {subtasks.map(sub => (
                        <li key={sub.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <PlusCircle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className={cn(sub.status === 'completed' && 'line-through')}>{sub.description}</span>
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
              </>
            )}
          </div>
        </ScrollArea>

        {!isEditing && (
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:space-x-2 pt-4">
            <Button
              variant="destructive"
              onClick={() => setIsConfirmDeleteOpen(true)}
              className="w-full sm:w-auto mb-2 sm:mb-0"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Task
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        )}

        <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this task? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;