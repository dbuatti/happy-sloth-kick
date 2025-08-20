import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Flag, 
  Link as LinkIcon, 
  Paperclip, 
  Pencil, 
  Trash2, 
  CheckCircle2,
  AlertCircle,
  Info,
  Tag
} from 'lucide-react';
import { format, parseISO, isValid, isBefore, isToday, isTomorrow } from 'date-fns';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface TaskOverviewDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onEditClick: (task: Task) => void;
  onUpdate: (id: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  sections: TaskSection[];
  allCategories: Category[];
}

const TaskOverviewDialog: React.FC<TaskOverviewDialogProps> = ({
  task,
  isOpen,
  onClose,
  onEditClick,
  onUpdate,
  onDelete,
  sections,
  allCategories,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Check if this is a virtual task (recurring instance)
  const isVirtualTask = task.id.startsWith('virtual-');

  const handleCompleteTask = async () => {
    if (isVirtualTask) {
      // For virtual tasks, we need to handle the completion differently
      // This would typically involve updating the original recurring task
      // For now, we'll just close the dialog
      onClose();
      return;
    }

    try {
      if (task.recurring_type !== 'none') {
        // For recurring tasks, we mark this specific instance as completed
        await onUpdate(task.id, { status: 'completed' });
      } else {
        // For non-recurring tasks, we just mark as completed
        await onUpdate(task.id, { status: 'completed' });
      }
      onClose();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleDeleteTask = async () => {
    if (isVirtualTask) {
      // Virtual tasks can't be deleted from the database
      onClose();
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(task.id);
      onClose();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      setDeleteError(error.message || 'Failed to delete task. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getPriorityColor = (priority: string | null) => {
    if (!priority) return 'bg-gray-100 text-gray-800';
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSectionName = (sectionId: string | null) => {
    if (!sectionId) return 'No Section';
    const section = sections.find(s => s.id === sectionId);
    return section ? section.name : 'Unknown Section';
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'No Category';
    const category = allCategories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const getCategoryColor = (categoryId: string | null) => {
    if (!categoryId) return 'bg-gray-100 text-gray-800';
    const category = allCategories.find(c => c.id === categoryId);
    return category ? `bg-${category.color}-100 text-${category.color}-800` : 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Invalid date';
    
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const isOverdue = (dateString: string | null) => {
    if (!dateString) return false;
    const date = parseISO(dateString);
    return isValid(date) && isBefore(date, new Date()) && !isToday(date);
  };

  // For virtual tasks, we don't show the complete button since they're already completed
  const showCompleteButton = task.status !== 'completed' && !isVirtualTask;

  // Simple text component for notes (replacing TextWithLinks)
  const TextWithLinks = ({ text }: { text: string | null }) => (
    <div className="whitespace-pre-wrap break-words">{text || ''}</div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-lg md:max-w-2xl">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <DialogTitle className="text-xl">
              {task.status === 'completed' ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="line-through">{task.description}</span>
                </span>
              ) : (
                task.description
              )}
            </DialogTitle>
            {!isVirtualTask && (
              <Button variant="ghost" size="icon" onClick={() => onEditClick(task)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {task.notes && (
            <div>
              <h3 className="text-sm font-medium mb-1 flex items-center">
                <Info className="h-4 w-4 mr-2" />
                Notes
              </h3>
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                <TextWithLinks text={task.notes} />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <h3 className="text-sm font-medium mb-1 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Due Date
              </h3>
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs py-1 px-2",
                  isOverdue(task.due_date) && task.status !== 'completed' && "bg-red-100 text-red-800"
                )}
              >
                {formatDate(task.due_date)}
              </Badge>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-1 flex items-center">
                <Flag className="h-4 w-4 mr-2" />
                Priority
              </h3>
              <Badge 
                variant="secondary" 
                className={cn("text-xs py-1 px-2", getPriorityColor(task.priority))}
              >
                {task.priority || 'medium'}
              </Badge>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-1 flex items-center">
                <Tag className="h-4 w-4 mr-2" />
                Category
              </h3>
              <Badge 
                variant="secondary" 
                className={cn("text-xs py-1 px-2", getCategoryColor(task.category))}
              >
                {getCategoryName(task.category)}
              </Badge>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-1 flex items-center">
                <Paperclip className="h-4 w-4 mr-2" />
                Section
              </h3>
              <Badge variant="secondary" className="text-xs py-1 px-2">
                {getSectionName(task.section_id)}
              </Badge>
            </div>
          </div>
          
          {task.link && (
            <div>
              <h3 className="text-sm font-medium mb-1 flex items-center">
                <LinkIcon className="h-4 w-4 mr-2" />
                Link
              </h3>
              <a 
                href={task.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {task.link}
              </a>
            </div>
          )}
          
          {task.image_url && (
            <div>
              <h3 className="text-sm font-medium mb-1">Image</h3>
              <img 
                src={task.image_url} 
                alt="Task related" 
                className="rounded-md max-w-full h-auto"
              />
            </div>
          )}
          
          <Separator />
          
          <div className="flex flex-wrap gap-2">
            {showCompleteButton && (
              <Button onClick={handleCompleteTask} className="flex-1">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete Task
              </Button>
            )}
            {!isVirtualTask && (
              <Button 
                variant="outline" 
                onClick={handleDeleteTask} 
                disabled={isDeleting}
                className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
              >
                {isDeleting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Task
                  </>
                )}
              </Button>
            )}
          </div>
          
          {deleteError && (
            <div className="text-sm text-destructive flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {deleteError}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskOverviewDialog;