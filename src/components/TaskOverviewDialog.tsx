"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, ListTodo, Edit, Calendar, StickyNote, BellRing, FolderOpen, Repeat, Link as LinkIcon, ClipboardCopy } from 'lucide-react';
import { Task, TaskSection, TaskCategory } from '@/types'; // Import types from @/types
import { useSound } from '@/context/SoundContext'; // Assuming SoundContext exists
import { cn } from '@/lib/utils';
import TaskItem from './TaskItem'; // Import TaskItem for rendering subtasks

interface TaskOverviewDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  task: Task | null;
  allTasks: Task[]; // Pass all tasks for subtask filtering
  sections: TaskSection[];
  categories: TaskCategory[];
  onEditClick: (task: Task) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  onDelete: (taskId: string) => Promise<void>;
}

export const TaskOverviewDialog: React.FC<TaskOverviewDialogProps> = ({
  isOpen,
  setIsOpen,
  task,
  allTasks,
  sections,
  categories,
  onEditClick,
  onUpdate,
  onDelete,
}) => {
  const { playSound } = useSound();
  const [localTask, setLocalTask] = useState<Task | null>(task);

  useEffect(() => {
    setLocalTask(task);
  }, [task]);

  const handleToggleComplete = useCallback(async () => {
    if (!localTask) return;
    const newStatus = localTask.status === 'completed' ? 'to-do' : 'completed';
    const updatedTask = await onUpdate(localTask.id, { status: newStatus });
    if (updatedTask) {
      setLocalTask(updatedTask);
      if (newStatus === 'completed') {
        playSound('complete');
      }
    }
  }, [localTask, onUpdate, playSound]);

  const handleDelete = useCallback(async () => {
    if (!localTask) return;
    await onDelete(localTask.id);
    setIsOpen(false);
  }, [localTask, onDelete, setIsOpen]);

  const handleEdit = useCallback(() => {
    if (localTask) {
      onEditClick(localTask);
    }
  }, [localTask, onEditClick]);

  const getCategoryName = (categoryId: string | null | undefined) => {
    return categories.find(cat => cat.id === categoryId)?.name || 'N/A';
  };

  const getSectionName = (sectionId: string | null | undefined) => {
    return sections.find(sec => sec.id === sectionId)?.name || 'N/A';
  };

  const subtasks = allTasks.filter(sub => sub.parent_task_id === localTask?.id);

  if (!localTask) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Checkbox
              checked={localTask.status === 'completed'}
              onCheckedChange={handleToggleComplete}
              className="h-5 w-5"
            />
            <span className={cn(localTask.status === 'completed' && 'line-through text-muted-foreground')}>
              {localTask.description}
            </span>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[calc(90vh-180px)] pr-4">
          <div className="grid gap-4 py-4 text-sm">
            <div className="flex items-center space-x-2">
              <Edit className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Status:</span>
              <span>{localTask.status}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Due Date:</span>
              <span>{localTask.due_date ? new Date(localTask.due_date).toLocaleDateString() : 'No due date'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Section:</span>
              <span>{getSectionName(localTask.section_id)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <ListTodo className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Category:</span>
              <span>{getCategoryName(localTask.category)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <BellRing className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Priority:</span>
              <span>{localTask.priority || 'N/A'}</span>
            </div>
            {localTask.recurring_type && localTask.recurring_type !== 'none' && (
              <div className="flex items-center space-x-2">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Recurring:</span>
                <span>{localTask.recurring_type}</span>
              </div>
            )}
            {localTask.link && (
              <div className="flex items-center space-x-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Link:</span>
                <a href={localTask.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center space-x-1">
                  <span>{localTask.link}</span>
                  <ClipboardCopy className="h-3 w-3" />
                </a>
              </div>
            )}
            {localTask.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium flex items-center space-x-2 mb-2">
                    <StickyNote className="h-4 w-4 text-muted-foreground" />
                    <span>Notes:</span>
                  </h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{localTask.notes}</p>
                </div>
              </>
            )}

            {subtasks.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium flex items-center space-x-2 mb-2">
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                    <span>Subtasks:</span>
                  </h3>
                  <div className="space-y-2">
                    {subtasks.map(subtask => (
                      <TaskItem
                        key={subtask.id}
                        task={subtask}
                        categories={categories}
                        onEdit={onEditClick} // Pass onEditClick for subtasks
                        onDelete={onDelete}
                        onUpdate={onUpdate}
                        allTasks={allTasks}
                        isSubtask={true}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" /> Edit Details
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};