import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Edit, Calendar, BellRing, StickyNote, Link as LinkIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getCategoryColorProps } from '@/lib/categoryColors';

interface NextTaskSuggestionPopupProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onMarkComplete: (taskId: string) => Promise<void>;
  onEditTask: (task: Task) => void;
  onOpenDetail?: (task: Task) => void;
  currentDate: Date;
}

const NextTaskSuggestionPopup: React.FC<NextTaskSuggestionPopupProps> = ({
  task,
  isOpen,
  onClose,
  onMarkComplete,
  onEditTask,
  onOpenDetail,
  currentDate,
}) => {
  const handleMarkComplete = async () => {
    await onMarkComplete(task.id);
    onClose();
  };

  const handleEditClick = () => {
    if (onOpenDetail) {
      onOpenDetail(task);
    } else {
      onEditTask(task);
    }
    onClose();
  };

  const getPriorityDotColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-priority-urgent';
      case 'high': return 'bg-priority-high';
      case 'medium': return 'bg-priority-medium';
      case 'low': return 'bg-priority-low';
      default: return 'bg-gray-500';
    }
  };

  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    if (format(date, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')) {
      return 'Today';
    } else if (date < currentDate) {
      return `Overdue ${format(date, 'MMM d')}`;
    } else {
      return `Due ${format(date, 'MMM d')}`;
    }
  };

  const isOverdue = task.due_date && task.status !== 'completed' && parseISO(task.due_date) < currentDate && format(parseISO(task.due_date), 'yyyy-MM-dd') !== format(currentDate, 'yyyy-MM-dd');
  const isDueToday = task.due_date && task.status !== 'completed' && format(parseISO(task.due_date), 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd');

  const categoryColorProps = getCategoryColorProps(task.category_color);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "w-[150px] h-[50px] p-2 flex flex-col justify-between", // Fixed size
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-1 data-[state=open]:duration-200", // Slide-up animation
          "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-1 data-[state=closed]:duration-200"
        )}
        style={{ top: '30px', left: '50%', transform: 'translateX(-50%)' }} // Position at top: 30px
      >
        <div className="flex items-center space-x-1">
          <div className={cn("w-1.5 h-1.5 rounded-full", getPriorityDotColor(task.priority))} />
          <span className="text-sm font-normal text-foreground truncate"> {/* 10px text */}
            Next Task: {task.description}
          </span>
        </div>
        {/* No buttons here, as per minimalist request for the pop-up */}
      </DialogContent>
    </Dialog>
  );
};

export default NextTaskSuggestionPopup;