import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/Progress";
import { CheckCircle2, Target, Lightbulb, ListTodo, Edit } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getCategoryColorProps } from '@/lib/categoryColors';
import { Button } from "@/components/ui/button";
import { Task } from '@/hooks/useTasks'; // Added Task import

interface DailyOverviewCardProps {
  tasks: Task[]; // All tasks for the current day (filtered by date)
  nextAvailableTask: Task | null;
  currentDate: Date;
  loading: boolean;
  onMarkComplete: (taskId: string) => Promise<void>;
  onEditTask: (task: Task) => void;
  onOpenDetail?: (task: Task) => void;
}

const DailyOverviewCard: React.FC<DailyOverviewCardProps> = ({
  tasks,
  nextAvailableTask,
  currentDate,
  loading,
  onMarkComplete,
  onEditTask,
  onOpenDetail,
}) => {
  const { completedTasksToday, totalTasksToday, completionPercentage } = React.useMemo(() => {
    const completed = tasks.filter(task => task.status === 'completed').length;
    const total = tasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completedTasksToday: completed, totalTasksToday: total, completionPercentage: percentage };
  }, [tasks]);

  const getPriorityDotColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-priority-urgent';
      case 'high': return 'bg-priority-high';
      case 'medium': return 'bg-priority-medium';
      case 'low': return 'bg-priority-low';
      default: return 'bg-gray-500';
    }
  };

  const handleMarkCompleteClick = async () => {
    if (nextAvailableTask) {
      await onMarkComplete(nextAvailableTask.id);
    }
  };

  const handleEditClick = () => {
    if (nextAvailableTask) {
      if (onOpenDetail) {
        onOpenDetail(nextAvailableTask);
      } else {
        onEditTask(nextAvailableTask);
      }
    }
  };

  if (loading) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Daily Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="space-y-1">
            <div className="text-2xl font-bold mb-1">
              <div className="h-6 w-3/4 bg-muted animate-pulse rounded"></div>
            </div>
            <Progress value={0} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              <div className="h-3 w-1/2 bg-muted animate-pulse rounded"></div>
            </p>
          </div>
          <div className="border-t pt-4 space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" /> Next Up
            </h3>
            <div className="h-10 w-full bg-muted animate-pulse rounded-md"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" /> Daily Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Today's Progress */}
        <div className="space-y-1">
          <div className="text-2xl font-bold mb-1">
            {completedTasksToday} / {totalTasksToday} tasks completed
          </div>
          <Progress value={completionPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {completionPercentage}% completed for {isSameDay(currentDate, new Date()) ? 'today' : format(currentDate, 'MMM d')}
          </p>
        </div>

        {/* Next Task Suggestion */}
        <div className="border-t pt-4 space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" /> Next Up
          </h3>
          {nextAvailableTask ? (
            <div className="flex items-center space-x-2 p-2 border rounded-md bg-background">
              <div className={cn("w-2 h-2 rounded-full flex-shrink-0", getPriorityDotColor(nextAvailableTask.priority))} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex-1 text-sm font-medium truncate cursor-pointer" onClick={handleEditClick}>
                    {nextAvailableTask.description}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {nextAvailableTask.description}
                </TooltipContent>
              </Tooltip>
              <div className="flex-shrink-0 flex items-center space-x-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleMarkCompleteClick} aria-label="Mark complete">
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEditClick} aria-label="Edit task">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm text-center py-4 border border-dashed rounded-md">
              No incomplete tasks for today.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyOverviewCard;