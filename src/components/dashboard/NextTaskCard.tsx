import React from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle2, Edit, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/hooks/useTasks';
import { Skeleton } from '@/components/ui/skeleton';

interface NextTaskCardProps {
  nextAvailableTask: Task | null;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onOpenOverview: (task: Task) => void;
  loading: boolean;
  onFocusViewOpen: () => void;
}

const NextTaskCard: React.FC<NextTaskCardProps> = ({ nextAvailableTask, updateTask, onOpenOverview, loading, onFocusViewOpen }) => {
  const getPriorityDotColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-priority-urgent';
      case 'high': return 'bg-priority-high';
      case 'medium': return 'bg-priority-medium';
      case 'low': return 'bg-priority-low';
      default: return 'bg-gray-500';
    }
  };

  const handleMarkComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
    }
  };

  const handleOpenOverviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nextAvailableTask) {
      onOpenOverview(nextAvailableTask);
    }
  };

  return (
    <fieldset 
      className="rounded-xl border-2 border-border p-4 min-h-[150px] flex flex-col justify-center cursor-pointer"
      onClick={onFocusViewOpen}
    >
      <legend className="px-2 text-sm font-medium text-foreground/80 -ml-1 flex items-center gap-2">
        <Target className="h-4 w-4" />
        Your Next Task
      </legend>
      <div className="flex-grow flex items-center justify-center">
        {loading ? (
          <div className="space-y-3 w-full flex flex-col items-center">
            <Skeleton className="h-6 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        ) : nextAvailableTask ? (
          <div className="flex flex-col items-center text-center space-y-3">
            <div className={cn("w-3 h-3 rounded-full", getPriorityDotColor(nextAvailableTask.priority))} />
            <p className="text-xl font-bold leading-tight text-foreground">
              {nextAvailableTask.description}
            </p>
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleMarkComplete}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Done
              </Button>
              <Button size="sm" variant="outline" onClick={handleOpenOverviewClick}>
                <Edit className="mr-2 h-4 w-4" /> Details
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No pending tasks for today. Great job!
          </div>
        )}
      </div>
    </fieldset>
  );
};

export default NextTaskCard;