import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Edit, Lightbulb, Calendar, BellRing, StickyNote, Link as LinkIcon } from 'lucide-react';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { getCategoryColorProps } from '@/lib/categoryColors';
import { format, parseISO } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

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
      <Card className="w-full max-w-3xl mx-auto shadow-md mb-4 border-l-8 border-primary dark:border-primary"> {/* Bolder border, stronger shadow */}
        <CardHeader className="pb-2"> {/* Adjusted padding */}
          <CardTitle className="text-base font-semibold flex items-center gap-2"> {/* Larger text */}
            <Lightbulb className="h-4 w-4 text-primary" /> {/* Larger icon */}
            Your Next Task
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2"> {/* Adjusted spacing */}
          <Skeleton className="h-7 w-3/4" /> {/* Taller skeleton */}
          <Skeleton className="h-5 w-1/2" /> {/* Taller skeleton */}
          <div className="flex gap-3 mt-3"> {/* Increased gap */}
            <Skeleton className="h-10 flex-1" /> {/* Taller buttons */}
            <Skeleton className="h-10 flex-1" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!task) {
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-md mb-4 border-l-8 border-primary dark:border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Your Next Task
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-muted-foreground text-base">No incomplete tasks found for today. Time to add some!</p> {/* Larger text */}
        </CardContent>
      </Card>
    );
  }

  const categoryColorProps = getCategoryColorProps(task.category_color);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-priority-urgent text-primary-foreground';
      case 'high': return 'bg-priority-high text-primary-foreground';
      case 'medium': return 'bg-priority-medium text-primary-foreground';
      case 'low': return 'bg-priority-low text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
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
        "w-full max-w-3xl mx-auto shadow-md mb-4 cursor-pointer transition hover:shadow-lg active:scale-[0.995]", // Stronger shadow, more pronounced hover
        isOverdue ? "border-l-8 border-status-overdue" : // Bolder border
        isDueToday ? "border-l-8 border-status-due-today" : // Bolder border
        "border-l-8 border-primary" // Bolder border
      )}
      onClick={() => onOpenDetail ? onOpenDetail(task) : onEditTask(task)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Your Next Task
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2"> {/* Increased spacing */}
        <div className="flex items-center space-x-3"> {/* Increased spacing */}
          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center border-2", categoryColorProps.backgroundClass, categoryColorProps.dotBorder)}> {/* Slightly smaller dot container, thicker border */}
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColorProps.dotColor }}></div> {/* Slightly smaller dot */}
          </div>
          <h3 className="text-xl font-bold flex-1 line-clamp-2">{task.description}</h3> {/* Larger, bolder text */}
        </div>

        <div className="flex items-center text-sm text-muted-foreground gap-2 flex-wrap">
          <Badge className={cn("px-2 py-0.5 text-xs font-semibold rounded-full", getPriorityColor(task.priority))}> {/* Slightly smaller badge */}
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
          </Badge>
          {task.due_date && (
            <span className={cn(
              "flex items-center gap-1 text-sm", // Larger text
              isOverdue && "text-status-overdue font-bold", // Bolder text for overdue
              isDueToday && "text-status-due-today font-bold" // Bolder text for due today
            )}>
              <Calendar className="h-4 w-4" /> {/* Larger icon */}
              {getDueDateDisplay(task.due_date)}
            </span>
          )}
          {task.remind_at && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center text-primary dark:text-primary">
                  <BellRing className="h-4 w-4" /> {/* Larger icon */}
                  <span className="sr-only">Reminder</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {format(parseISO(task.remind_at), 'MMM d, yyyy HH:mm')}
              </TooltipContent>
            </Tooltip>
          )}
          {task.notes && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center">
                  <StickyNote className="h-4 w-4" /> {/* Larger icon */}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Notes:</p>
                <p className="text-sm">{task.notes}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {task.link && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a 
                  href={task.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-1 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500"
                  onClick={(e) => e.stopPropagation()}
                  data-no-dnd="true"
                >
                  <LinkIcon className="h-4 w-4" /> {/* Larger icon */}
                </a>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Link:</p>
                <p className="text-sm truncate">{task.link}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex gap-3 mt-3"> {/* Increased gap */}
          <Button size="lg" onClick={(e) => { e.stopPropagation(); onMarkComplete(task.id); }} className="flex-1 h-11 text-base"> {/* Larger button, larger text */}
            <CheckCircle2 className="mr-2 h-5 w-5" /> Mark Complete {/* Larger icon */}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={(e) => { e.stopPropagation(); onOpenDetail ? onOpenDetail(task) : onEditTask(task); }}
            className="flex-1 h-11 text-base"
          >
            <Edit className="mr-2 h-5 w-5" /> Edit Task
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NextTaskCard;