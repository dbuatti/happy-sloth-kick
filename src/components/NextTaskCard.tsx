import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Edit, Lightbulb, Target, XCircle } from 'lucide-react'; // Added Target and XCircle icons
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { getCategoryColorProps } from '@/lib/categoryColors';
import { format, parseISO } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

interface NextTaskCardProps {
  task: Task | null;
  onMarkComplete: (taskId: string) => Promise<void>;
  onEditTask: (task: Task) => void;
  currentDate: Date;
  loading: boolean; // New prop for loading state
  onCardClick: () => void; // New prop for card click
  onSetAsFocusTask: (taskId: string) => void; // New prop to set as manual focus
  isManualFocus: boolean; // New prop to indicate if it's manually set
  onClearManualFocus: () => void; // New prop to clear manual focus
  onOpenFocusOverlay: () => void; // New prop
}

const NextTaskCard: React.FC<NextTaskCardProps> = ({ task, onMarkComplete, onEditTask, currentDate, loading, onCardClick, onSetAsFocusTask, isManualFocus, onClearManualFocus, onOpenFocusOverlay }) => {
  if (loading) {
    return (
      <Card className="w-full shadow-sm mb-4 border-l-4 border-blue-500 dark:border-blue-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-blue-500" /> Your Next Task
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
      <Card className="w-full shadow-sm mb-4 border-l-4 border-blue-500 dark:border-blue-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-blue-500" /> Your Next Task
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-muted-foreground">No incomplete tasks found for today. Time to add some!</p>
          <Button variant="outline" className="mt-3 w-full" onClick={() => onEditTask(null as any)}> {/* Pass null or handle appropriately */}
            Add New Task
          </Button>
        </CardContent>
      </Card>
    );
  }

  const categoryColorProps = getCategoryColorProps(task.category_color);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-700 dark:text-red-400';
      case 'high': return 'text-red-500 dark:text-red-300';
      case 'medium': return 'text-yellow-500 dark:text-yellow-300';
      case 'low': return 'text-blue-500 dark:text-blue-300';
      default: return 'text-gray-500 dark:text-gray-400';
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
        "w-full shadow-sm mb-4 cursor-pointer", // Added cursor-pointer
        isOverdue ? "border-l-4 border-red-500 dark:border-red-700" :
        isDueToday ? "border-l-4 border-orange-400 dark:border-orange-600" :
        "border-l-4 border-blue-500 dark:border-blue-700"
      )}
      onClick={onCardClick} // Added onClick handler
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          {isManualFocus ? (
            <Target className="h-5 w-5 text-purple-500" />
          ) : (
            <Lightbulb className="h-5 w-5 text-blue-500" />
          )}
          {isManualFocus ? 'Manually Focused Task' : 'Your Next Task'}
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
              isOverdue && "text-red-600 dark:text-red-400",
              isDueToday && "text-orange-500 dark:text-orange-300"
            )}>
              {getDueDateDisplay(task.due_date)}
            </span>
          )}
          {task.section_id && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate max-w-[100px] text-xs px-2 py-0.5 rounded-full bg-muted-foreground/10">
                  {task.section_id} {/* This should ideally be section name, but task object doesn't have it directly */}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Section: {task.section_id} {/* Replace with actual section name if available */}
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
          {isManualFocus ? (
            <Button variant="outline" onClick={(e) => { e.stopPropagation(); onClearManualFocus(); }} className="flex-1">
              <XCircle className="mr-2 h-4 w-4" /> Unset Focus
            </Button>
          ) : (
            <Button variant="outline" onClick={(e) => { e.stopPropagation(); onSetAsFocusTask(task.id); onOpenFocusOverlay(); }} className="flex-1">
              <Target className="mr-2 h-4 w-4" /> Set as Focus
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NextTaskCard;