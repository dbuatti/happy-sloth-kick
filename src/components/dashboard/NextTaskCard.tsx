import React from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle2, Edit, Link as LinkIcon, ClipboardCopy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/hooks/useTasks';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { showSuccess, showError } from '@/utils/toast';
import DoTodaySwitch from '@/components/DoTodaySwitch'; // Import DoTodaySwitch

interface NextTaskCardProps {
  nextAvailableTask: Task | null;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onOpenOverview: (task: Task) => void;
  loading: boolean;
  onOpenFocusView: () => void; // New prop added
  isDoToday: boolean; // New prop
  toggleDoToday: (task: Task) => void; // New prop
  isDemo?: boolean; // New prop
}

const NextTaskCard: React.FC<NextTaskCardProps> = ({ nextAvailableTask, updateTask, onOpenOverview, loading, onOpenFocusView, isDoToday, toggleDoToday, isDemo = false }) => {
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

  const isUrl = (path: string) => path.startsWith('http://') || path.startsWith('https://');

  const handleCopyPath = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(path);
      showSuccess('Path copied to clipboard!');
    } catch (err) {
      showError('Could not copy path.');
    }
  };

  const handleToggleDoTodaySwitch = () => {
    if (nextAvailableTask) {
      toggleDoToday(nextAvailableTask);
    }
  };

  return (
    <div
      className="flex flex-col justify-center" // Removed cursor-pointer from here
    >
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
          <div className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", getPriorityDotColor(nextAvailableTask.priority))} />
            <DoTodaySwitch
              isOn={isDoToday}
              onToggle={handleToggleDoTodaySwitch}
              taskId={nextAvailableTask.id}
              isDemo={isDemo}
            />
          </div>
          <p
            className="text-xl sm:text-2xl font-bold leading-tight text-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors" // Added cursor-pointer and hover effect here
            onClick={onOpenFocusView}
          >
            {nextAvailableTask.description}
          </p>
          {nextAvailableTask.link && (
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              {isUrl(nextAvailableTask.link) ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={nextAvailableTask.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <LinkIcon className="h-4 w-4" />
                      <span className="truncate max-w-[150px]">{nextAvailableTask.link}</span>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open link: {nextAvailableTask.link}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 flex items-center gap-1 text-muted-foreground hover:text-primary"
                      onClick={(e) => handleCopyPath(e, nextAvailableTask.link!)}
                    >
                      <ClipboardCopy className="h-4 w-4" />
                      <span className="truncate max-w-[150px]">{nextAvailableTask.link}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy path: {nextAvailableTask.link}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
          <div className="flex space-x-2">
            <Button size="sm" onClick={handleMarkComplete} disabled={isDemo}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Done
            </Button>
            <Button size="sm" variant="outline" onClick={handleOpenOverviewClick} disabled={isDemo}>
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
  );
};

export default NextTaskCard;