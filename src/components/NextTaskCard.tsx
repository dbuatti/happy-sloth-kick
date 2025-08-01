import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Edit, Lightbulb } from 'lucide-react';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { getCategoryColorProps } from '@/lib/categoryColors';
import { format, parseISO } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from '@/components/ui/skeleton';

interface NextTaskCardProps {
  task: Task | null;
  onMarkComplete: (taskId: string) => Promise<void>;
  onEditTask: (task: Task) => void;
  onOpenDetail?: (task: Task) => void;
  currentDate: Date;
  loading: boolean;
}

const NextTaskCard: React.FC<NextTaskCardProps> = ({ task, onMarkComplete, onEditTask, onOpenDetail, currentDate, loading }) => {
  if (loading) {
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-sm mb-2 border-l-4 border-primary dark:border-primary">
        <CardHeader className="pb-1.5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lightbulb className="h-3.5 w-3.5 text-primary" />
            Your Next Task
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-1.5">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!task) {
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-sm mb-2 border-l-4 border-primary dark:border-primary">
        <CardHeader className="pb-1.5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lightbulb className="h-3.5 w-3.5 text-primary" />
            Your Next Task
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-muted-foreground">No incomplete tasks found for today. Time to add some!</p>
        </CardContent>
      </Card>
    );
  }

  const categoryColorProps = getCategoryColorProps(task.category_color);

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

  // Section chip (show friendly text)
  const sectionChip = (
    <span className="truncate max-w-[160px] text-xs px-2 py-0.5 rounded-full bg-muted">
      {task.section_id ? 'In a section' : 'No Section'}
    </span>
  );

  return (
    <Card
      className={cn(
        "w-full max-w-3xl mx-auto shadow-sm mb-2 cursor-pointer transition hover:shadow-md active:scale-[0.997]",
        isOverdue ? "border-l-4 border-status-overdue" :
        isDueToday ? "border-l-4 border-status-due-today" :
        "border-l-4 border-primary"
      )}
      onClick={() => onOpenDetail ? onOpenDetail(task) : onEditTask(task)}
    >
      <CardHeader className="pb-1.5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Lightbulb className="h-3.5 w-3.5 text-primary" />
          Your Next Task
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-1.5">
        <div className="flex items-center space-x-2">
          <div className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center border", categoryColorProps.backgroundClass, categoryColorProps.dotBorder)}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categoryColorProps.dotColor }}></div>
          </div>
          <h3 className="text-base font-semibold flex-1 line-clamp-2">{task.description}</h3>
        </div>

        <div className="flex items-center text-sm text-muted-foreground gap-2 flex-wrap">
          <span className={cn("font-semibold", getPriorityColor(task.priority))}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
          </span>
          {task.due_date && (
            <span className={cn(
              "flex items-center gap-1",
              isOverdue && "text-status-overdue",
              isDueToday && "text-status-due-today"
            )}>
              {getDueDateDisplay(task.due_date)}
            </span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              {sectionChip}
            </TooltipTrigger>
            <TooltipContent>
              {task.section_id ? 'This task belongs to a section' : 'This task has no section'}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={(e) => { e.stopPropagation(); onMarkComplete(task.id); }} className="flex-1 h-8">
            <CheckCircle2 className="mr-2 h-3 w-3" /> Mark Complete
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onOpenDetail ? onOpenDetail(task) : onEditTask(task); }}
            className="flex-1 h-8"
          >
            <Edit className="mr-2 h-3 w-3" /> Edit Task
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NextTaskCard;