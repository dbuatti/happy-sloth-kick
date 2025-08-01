import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Edit, Lightbulb, Calendar, BellRing, StickyNote, Link as LinkIcon, Info } from 'lucide-react';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { getCategoryColorProps } from '@/lib/categoryColors';
import { format, parseISO } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface NextTaskCardProps {
  task: Task | null;
  onMarkComplete: (taskId: string) => Promise<void>;
  onEditTask: (task: Task) => void;
  onOpenDetail?: (task: Task) => void;
  currentDate: Date;
  loading: boolean;
}

const NextTaskCard: React.FC<NextTaskCardProps> = ({ task, onMarkComplete, onEditTask, onOpenDetail, currentDate, loading }) => {
  const [isInfoPopoverOpen, setIsInfoPopoverOpen] = useState(false);

  if (loading) {
    return (
      <div className="relative w-full max-w-3xl mx-auto h-[20px] bg-muted flex items-center px-2 mb-4 overflow-hidden">
        <Skeleton className="h-[10px] w-1/2" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="relative w-full max-w-3xl mx-auto h-[20px] bg-muted flex items-center px-2 mb-4 overflow-hidden">
        <span className="text-[10px] text-muted-foreground">No incomplete tasks found for today.</span>
      </div>
    );
  }

  const categoryColorProps = getCategoryColorProps(task.category_color);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-priority-urgent';
      case 'high': return 'bg-priority-high';
      case 'medium': return 'bg-priority-medium';
      case 'low': return 'bg-priority-low';
      default: return 'bg-muted';
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

  return (
    <div className="relative w-full max-w-3xl mx-auto h-[20px] bg-muted flex items-center px-2 mb-4 overflow-hidden">
      <span className="text-[10px] text-muted-foreground mr-2">Next Task:</span>
      <span className="text-[10px] font-medium flex-1 truncate">{task.description}</span>
      
      <Popover open={isInfoPopoverOpen} onOpenChange={setIsInfoPopoverOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-[20px] w-[20px] p-0 ml-auto text-[#9575CD] hover:bg-transparent"
            aria-label="Task details"
          >
            <Info className="h-[15px] w-[15px]" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[150px] h-[50px] p-2 text-[10px] bg-white dark:bg-gray-800 shadow-md animate-in slide-in-from-bottom-2 duration-200"
          side="top"
          align="end"
          onOpenAutoFocus={(e) => e.preventDefault()} // Prevent focus stealing
        >
          <div className="flex flex-col space-y-1">
            <p className="font-semibold truncate">{task.description}</p>
            <div className="flex items-center gap-1">
              <div className={cn("w-[4px] h-[4px] rounded-full", getPriorityColor(task.priority))} />
              <span className="capitalize">{task.priority}</span>
            </div>
            {task.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-[10px] w-[10px]" />
                <span>{getDueDateDisplay(task.due_date)}</span>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default NextTaskCard;