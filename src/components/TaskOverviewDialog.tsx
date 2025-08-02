import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Trash2, ListTodo, Edit, Calendar, StickyNote, BellRing, FolderOpen, Repeat, Link as LinkIcon } from 'lucide-react';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { useSound } from '@/context/SoundContext';
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
import { cn } from '@/lib/utils';
import { format, parseISO, isSameDay, isPast, isValid } from 'date-fns';
import { getCategoryColorProps } from '@/lib/categoryColors';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox"; 

interface TaskOverviewDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onEditClick: (task: Task) => void; // To open the full edit dialog
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => void;
  sections: TaskSection[];
  allCategories: Category[];
  allTasks: Task[];
}

const TaskOverviewDialog: React.FC<TaskOverviewDialogProps> = ({
  task,
  isOpen,
  onClose,
  onEditClick,
  onUpdate,
  onDelete,
  sections,
  allTasks,
}) => {
  const { playSound } = useSound();
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const subtasks = useMemo(() => {
    return allTasks.filter(t => t.parent_task_id === task?.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [allTasks, task?.id]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-priority-urgent';
      case 'high': return 'text-priority-high';
      case 'medium': return 'text-priority-medium';
      case 'low': return 'text-priority-low';
      default: return 'text-muted-foreground';
    }
  };

  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    if (isSameDay(date, new Date())) {
      return 'Today';
    } else if (isPast(date) && !isSameDay(date, new Date())) {
      return `Overdue ${format(date, 'MMM d')}`;
    } else {
      return `Due ${format(date, 'MMM d')}`;
    }
  };

  const handleToggleMainTaskStatus = async () => {
    if (!task) return;
    setIsUpdatingStatus(true);
    const newStatus = task.status === 'completed' ? 'to-do' : 'completed';
    await onUpdate(task.id, { status: newStatus });
    playSound('success');
    setIsUpdatingStatus(false);
    onClose();
  };

  const handleSubtaskStatusChange = async (subtaskId: string, newStatus: Task['status']) => {
    await onUpdate(subtaskId, { status: newStatus });
  };

  const handleDeleteClick = () => {
    setShowConfirmDeleteDialog(true);
  };

  const confirmDeleteTask = () => {
    if (task) {
      onDelete(task.id);
      setShowConfirmDeleteDialog(false);
      onClose();
    }
  };

  if (!task) return null;

  const categoryColorProps = getCategoryColorProps(task.category_color);
  const sectionName = task.section_id ? sections.find(s => s.id === task.section_id)?.name : 'No Section';

  const isOverdue = task.due_date && task.status !== 'completed' && isPast(parseISO(task.due_date)) && !isSameDay(parseISO(task.due_date), new Date());
  const isDueToday = task.due_date && task.status !== 'completed' && isSameDay(parseISO(task.due_date), new Date());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center border", categoryColorProps.backgroundClass, categoryColorProps.dotBorder)}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categoryColorProps.dotColor }}></div>
            </div>
            <span className="flex-1 truncate">{task.description}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            View and manage the details of this task.
          </DialogDescription>
        </DialogHeader>
        <div className="py-3 space-y-3 text-sm text-foreground">
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
            <div className="flex items-center gap-2">
              <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Status: <span className="font-semibold capitalize">{task.status}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("h-3.5 w-3.5", getPriorityColor(task.priority))}><Edit className="h-3.5 w-3.5" /></span>
              <span>Priority: <span className={cn("font-semibold capitalize", getPriorityColor(task.priority))}>{task.priority}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Section: <span className="font-semibold">{sectionName}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Recurring: <span className="font-semibold capitalize">{task.recurring_type}</span></span>
            </div>
            {task.due_date && (
              <div className="flex items-center gap-2 col-span-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Due Date: <span className={cn("font-semibold", isOverdue && "text-status-overdue", isDueToday && "text-status-due-today")}>{getDueDateDisplay(task.due_date)}</span></span>
              </div>
            )}
            {task.remind_at && (
              <div className="flex items-center gap-2 col-span-2">
                <BellRing className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Reminder: <span className="font-semibold">{isValid(parseISO(task.remind_at)) ? format(parseISO(task.remind_at), 'MMM d, yyyy HH:mm') : 'Invalid Date'}</span></span>
              </div>
            )}
            {task.link && (
              <div className="flex items-center gap-2 col-span-2">
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="flex-shrink-0">Link:</span>
                <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex-1 min-w-0 truncate">
                  {task.link}
                </a>
              </div>
            )}
          </div>

          {task.notes && (
            <div className="space-y-1">
              <h4 className="font-semibold flex items-center gap-2"><StickyNote className="h-3.5 w-3.5 text-muted-foreground" /> Notes:</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <h4 className="font-semibold flex items-center gap-2"><ListTodo className="h-3.5 w-3.5 text-muted-foreground" /> Sub-tasks ({subtasks.length})</h4>
            {subtasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sub-tasks for this task.</p>
            ) : (
              <ul className="space-y-1.5">
                {subtasks.map(subtask => (
                  <li key={subtask.id} className="flex items-center space-x-2 p-1.5 rounded-md bg-background shadow-sm">
                    <Checkbox
                      checked={subtask.status === 'completed'}
                      onCheckedChange={(checked: boolean) => handleSubtaskStatusChange(subtask.id, checked ? 'completed' : 'to-do')}
                      id={`subtask-overview-${subtask.id}`}
                      className="flex-shrink-0 h-3.5 w-3.5"
                      disabled={isUpdatingStatus}
                    />
                    <label
                      htmlFor={`subtask-overview-${subtask.id}`}
                      className={cn(
                        "flex-1 text-sm font-medium leading-tight",
                        subtask.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-foreground',
                        "block truncate"
                      )}
                    >
                      {subtask.description}
                    </label>
                    {subtask.status === 'completed' && <ListTodo className="h-3.5 w-3.5 text-green-500" />}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-right">Created: {format(parseISO(task.created_at), 'MMM d, yyyy HH:mm')}</p>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 pt-2">
          <Button
            variant="default"
            onClick={() => onEditClick(task)}
            className="w-full sm:w-auto mt-1.5 sm:mt-0 h-9"
          >
            <Edit className="mr-2 h-3.5 w-3.5" /> Edit
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant={task.status === 'completed' ? 'outline' : 'default'}
              onClick={handleToggleMainTaskStatus}
              disabled={isUpdatingStatus}
              className="flex-1 h-9"
            >
              {task.status === 'completed' ? (
                <><ListTodo className="mr-2 h-3.5 w-3.5" /> Mark To-Do</>
              ) : (
                <><ListTodo className="mr-2 h-3.5 w-3.5" /> Mark Complete</>
              )}
            </Button>
            <Button variant="destructive" onClick={handleDeleteClick} disabled={isUpdatingStatus} className="flex-1 h-9">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={showConfirmDeleteDialog} onOpenChange={setShowConfirmDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this task and all its sub-tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} disabled={isUpdatingStatus}>
              {isUpdatingStatus ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default TaskOverviewDialog;