import React, { useState, useCallback } from 'react';
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
import TaskForm from './TaskForm';
import { format, parseISO } from 'date-fns'; // Removed isValid
import { cn } from '@/lib/utils';
import { Edit, Trash2, Link as LinkIcon, FileText, Calendar as CalendarIcon, BellRing, Target, PlusCircle } from 'lucide-react'; // Removed Image
import { Separator } from '@/components/ui/separator';
// Removed: import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'; // Unused import
import { showSuccess, showError } from '@/utils/toast';
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
  createCategory: (name: string, color: string) => Promise<string | null>; // Added
  updateCategory: (categoryId: string, updates: Partial<Category>) => Promise<boolean>; // Added
  deleteCategory: (categoryId: string) => Promise<boolean>; // Added
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
  createCategory, // Destructure
  updateCategory, // Destructure
  deleteCategory, // Destructure
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const handleSave = useCallback(async (formData: NewTaskData) => {
    const success = await onUpdate(task.id, formData);
    if (success) {
      setIsEditing(false);
      showSuccess('Task updated!');
      return true;
    }
    return false;
  }, [task.id, onUpdate]);

  const handleDelete = useCallback(async () => {
    const success = await onDelete(task.id);
    if (success) {
      onClose();
      showSuccess('Task deleted!');
    } else {
      showError('Failed to delete task.');
    }
  }, [task.id, onDelete, onClose]);

  const getCategoryName = (categoryId: string | null) => {
    return allCategories.find(cat => cat.id === categoryId)?.name || 'Uncategorized';
  };

  const getSectionName = (sectionId: string | null) => {
    return sections.find(sec => sec.id === sectionId)?.name || 'No Section';
  };

  const getPriorityColorClass = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const isUrl = (path: string) => path.startsWith('http://') || path.startsWith('https://');

  const subtasks = allTasks.filter(t => t.parent_task_id === task.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Task Details"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modify the task details below." : "View the details of your task."}
          </DialogDescription>
        </DialogHeader>

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
            createCategory={createCategory} // Pass through
            updateCategory={updateCategory} // Pass through
            deleteCategory={deleteCategory} // Pass through
          />
        ) : (
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">{task.description}</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setIsConfirmDeleteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{task.status}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">{getCategoryName(task.category)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Priority</p>
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", getPriorityColorClass(task.priority))}>
                  {task.priority}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Section</p>
                <p className="font-medium">{getSectionName(task.section_id)}</p>
              </div>
              {task.due_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" /> {format(parseISO(task.due_date), 'PPP')}
                  </p>
                </div>
              )}
              {task.remind_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Reminder</p>
                  <p className="font-medium flex items-center gap-1">
                    <BellRing className="h-4 w-4" /> {format(parseISO(task.remind_at), 'PPP p')}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Recurring</p>
                <p className="font-medium capitalize">{task.recurring_type}</p>
              </div>
              {task.link && (
                <div>
                  <p className="text-sm text-muted-foreground">Link / File Path</p>
                  {isUrl(task.link) ? (
                    <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                      <LinkIcon className="h-4 w-4" /> {task.link}
                    </a>
                  ) : (
                    <p className="font-medium flex items-center gap-1">
                      <FileText className="h-4 w-4" /> {task.link}
                    </p>
                  )}
                </div>
              )}
              {task.image_url && (
                <div>
                  <p className="text-sm text-muted-foreground">Image</p>
                  <img src={task.image_url} alt="Task attachment" className="mt-2 max-w-full h-auto rounded-md" />
                </div>
              )}
            </div>

            {task.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium whitespace-pre-wrap">{task.notes}</p>
                </div>
              </>
            )}

            {subtasks.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Subtasks ({subtasks.length})</p>
                  <ul className="space-y-2">
                    {subtasks.map(subtask => (
                      <li key={subtask.id} className="flex items-center gap-2 text-sm">
                        <Target className="h-3 w-3 text-primary" /> {subtask.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={() => onAddSubtask(task.id, task.section_id)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Subtask
              </Button>
            </DialogFooter>
          </div>
        )}

        <ConfirmationDialog
          isOpen={isConfirmDeleteOpen}
          onClose={() => setIsConfirmDeleteOpen(false)}
          onConfirm={handleDelete}
          title="Confirm Delete Task"
          description="Are you sure you want to delete this task and all its subtasks? This action cannot be undone."
          confirmText="Delete"
          confirmVariant="destructive"
        />
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;