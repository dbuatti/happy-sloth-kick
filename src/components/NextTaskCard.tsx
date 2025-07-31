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
  currentDate: Date;
  loading: boolean;
}

const NextTaskCard: React.FC<NextTaskCardProps> = ({ task, onMarkComplete, onEditTask, currentDate, loading }) => {
  if (loading) {
    return (
      <Card className="w-full shadow-sm mb-4 border-l-4 border-primary dark:border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" /> Your Next Task
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!task) {
    return (
      <Card className="w-full shadow-sm mb-4 border-l-4 border-primary dark:border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" /> Your Next Task
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-muted-foreground">No incomplete tasks found for today. Time to add some!</p>
          <Button variant="outline" className="mt-3 w-full" onClick={() => onEditTask(null as any)}>
            Add New Task
          </Button>
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

  return (
    <Card 
      className={cn(
        "w-full shadow-sm mb-4 cursor-pointer",
        isOverdue ? "border-l-4 border-status-overdue" :
        isDueToday ? "border-l-4 border-status-due-today" :
        "border-l-4 border-primary"
      )}
      onClick={() => onEditTask(task)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" /> Your Next Task
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center space-x-3">
          <div className={cn("w-4 h-4 rounded-full flex items-center justify-center border", categoryColorProps.backgroundClass, categoryColorProps.dotBorder)}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColorProps.dotColor }}></div>
          </div>
          <h3 className="text-xl font-bold flex-1 line-clamp-2">{task.description}</h3>
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground space-x-2">
          <span className={cn(
            "font-semibold",
            getPriorityColor(task.priority)
          )}>
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
          {task.section_id && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate max-w-[100px] text-xs px-2 py-0.5 rounded-full bg-muted-foreground/10">
                  {task.section_id}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Section: {task.section_id}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={(e) => { e.stopPropagation(); onMarkComplete(task.id); }} className="flex-1">
            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Complete
          </Button>
          <Button variant="outline" onClick={(e) => { e.stopPropagation(); onEditTask(task); }} className="flex-1">
            <Edit className="mr-2 h-4 w-4" /> Edit Task
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NextTaskCard;