import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerDescription } from "@/components/ui/drawer";
import { Trash2, ListTodo, Edit, Calendar, StickyNote, BellRing, FolderOpen, Repeat, Link as LinkIcon, ClipboardCopy, CheckCircle2 } from 'lucide-react';
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
import { showSuccess, showError } from '@/utils/toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface TaskOverviewDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onEditClick: (task: Task) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onDelete: (taskId: string) => void;
  sections: TaskSection[];
  allCategories: Category[];
  allTasks: Task[]; // This prop should now receive processedTasks
}

const TaskOverviewDialog: React.FC<TaskOverviewDialogProps> = ({
  task,
  isOpen,
  onClose,
  onEditClick,
  onUpdate,
  onDelete,
  sections,
  allCategories, // This prop is not directly used in this component
  allTasks, // This is the prop, assumed to be processedTasks
}) => {
  const { playSound } = useSound();
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const isMobile = useIsMobile();

  const subtasks = useMemo(() => {
    return allTasks.filter(t => t.parent_task_id === task?.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [allTasks, task?.id]);

  const originalTask = useMemo(() => {
    if (!task?.original_task_id) return null;
    return allTasks.find(t => t.id === task.original_task_id);
  }, [allTasks, task]);

  const recurringType = originalTask ? originalTask.recurring_type : task?.recurring_type;

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
      return format(date, 'MMM d');
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

  const handleMarkAllSubtasksCompleted = async () => {
    if (!task) return;
    const subtaskIdsToComplete = subtasks.filter(st => st.status !== 'completed').map(st => st.id);
    if (subtaskIdsToComplete.length > 0) {
      setIsUpdatingStatus(true);
      // Assuming bulkUpdateTasks is available through a context or another hook
      // For now, I'll simulate it or assume it's passed down if needed.
      // If it's not passed, this would be a missing dependency.
      // For now, I'll just update each subtask individually.
      for (const subtaskId of subtaskIdsToComplete) {
        await onUpdate(subtaskId, { status: 'completed' });
      }
      playSound('success');
      setIsUpdatingStatus(false);
    }
  };

  const isUrl = (path: string) => path.startsWith('http://') || path.startsWith('https://');

  const handleCopyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      showSuccess('Path copied to clipboard!');
    } catch (err) {
      showError('Failed to copy path.');
    }
  };

  if (!task) return null;

  const sectionName = task.section_id ? sections.find(s => s.id === task.section_id)?.name : 'No Section';

  const isOverdue = task.due_date && task.status !== 'completed' && isPast(parseISO(task.due_date)) && !isSameDay(parseISO(task.due_date), new Date());
  const isDueToday = task.due_date && task.status !== 'completed' && isSameDay(parseISO(task.due_date), new Date());

  const TitleContent = ({ isDrawer = false }: { isDrawer?: boolean }) => {
    const TitleComponent = isDrawer ? DrawerTitle : DialogTitle;
    return (
      <TitleComponent className="flex items-center gap-2">
        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center border" style={{ backgroundColor: task.category_color }}></div>
        <span className="flex-1 truncate">{task.description}</span>
      </TitleComponent>
    );
  };

  const MainContent = () => (
    <div className="space-y-3 text-sm text-foreground">
      {task.image_url && (
        <div className="mb-3">
          <img src={task.image_url} alt="Task attachment" className="rounded-lg max-h-64 w-full object-contain bg-muted" />
        </div>
      )}
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
        {recurringType !== 'none' && (
          <div className="flex items-center gap-2">
            <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Recurring: <span className="font-semibold capitalize">{recurringType}</span></span>
          </div>
        )}
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
            {isUrl(task.link) ? (
              <>
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="flex-shrink-0">Link:</span>
                <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex-1 min-w-0 truncate">
                  {task.link}
                </a>
              </>
            ) : (
              <>
                <ClipboardCopy className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="flex-shrink-0">Path:</span>
                <span className="font-mono text-sm bg-muted px-1 rounded flex-1 min-w-0 truncate">{task.link}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyPath(task.link!)}>
                  <ClipboardCopy className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
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
        <div className="flex justify-between items-center">
          <h4 className="font-semibold flex items-center gap-2"><ListTodo className="h-3.5 w-3.5 text-muted-foreground" /> Sub-tasks ({subtasks.length})</h4>
          {subtasks.length > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-base" onClick={handleMarkAllSubtasksCompleted} disabled={isUpdatingStatus || subtasks.every(st => st.status === 'completed')}>
              <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Mark All Complete
            </Button>
          )}
        </div>
        {subtasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sub-tasks for this task.</p>
        ) : (
          <ul className="space-y-1.5">
            {subtasks.map(subtask => (
              <li key={subtask.id} className="flex items-center space-x-2 p-1.5 rounded-md bg-background shadow-sm">
                <input
                  type="checkbox"
                  checked={subtask.status === 'completed'}
                  onChange={(e) => handleSubtaskStatusChange(subtask.id, e.target.checked ? 'completed' : 'to-do')}
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
  );

  const FooterContent = ({ isDrawer = false }: { isDrawer?: boolean }) => {
    const FooterComponent = isDrawer ? DrawerFooter : DialogFooter;
    return (
      <FooterComponent className={isDrawer ? "pt-2" : "flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 pt-2"}>
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
      </FooterComponent>
    );
  };

  return (
    <>
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="z-[9999] bg-background">
            <DrawerHeader className="text-left">
              <TitleContent isDrawer />
              <DrawerDescription className="sr-only">
                View and manage the details of this task.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto">
              <MainContent />
            </div>
            <FooterContent isDrawer />
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-xl z-[9999] bg-background">
            <DialogHeader>
              <TitleContent />
              <DialogDescription className="sr-only">
                View and manage the details of this task.
              </DialogDescription>
            </DialogHeader>
            <MainContent />
            <FooterContent />
          </DialogContent>
        </Dialog>
      )}

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
    </>
  );
};

export default TaskOverviewDialog;