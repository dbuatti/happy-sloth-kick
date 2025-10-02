"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Target, ListTodo, Archive, ChevronsDownUp, Repeat, Link as LinkIcon, Calendar as CalendarIcon, FileText, Image, XSquare } from 'lucide-react'; // Added XSquare icon
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { format, parseISO, isSameDay, isPast, isValid } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";


interface DailyOverviewCardProps {
  dailyProgress: {
    totalPendingCount: number;
    completedCount: number;
    overdueCount: number;
  };
  nextAvailableTask: Task | null;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onOpenOverview: (task: Task) => void;
  onOpenFocusView: () => void;
  tasksLoading: boolean;
  isDemo?: boolean;
  archiveAllCompletedTasks: () => Promise<void>;
  toggleAllDoToday: () => Promise<void>;
  markAllTasksAsSkipped: () => Promise<void>; // New prop
}

const DailyOverviewCard: React.FC<DailyOverviewCardProps> = ({
  dailyProgress,
  nextAvailableTask,
  updateTask,
  onOpenOverview,
  onOpenFocusView,
  tasksLoading,
  isDemo,
  archiveAllCompletedTasks,
  toggleAllDoToday,
  markAllTasksAsSkipped, // Destructure new prop
}) => {
  const progressPercentage = dailyProgress.totalPendingCount === 0
    ? 100
    : Math.round((dailyProgress.completedCount / (dailyProgress.completedCount + dailyProgress.totalPendingCount)) * 100) || 0;

  const handleMarkDone = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
    }
  };

  const handleDetailsClick = () => {
    if (nextAvailableTask) {
      onOpenOverview(nextAvailableTask);
    }
  };

  const getPriorityDotColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-priority-urgent';
      case 'high': return 'bg-priority-high';
      case 'medium': return 'bg-priority-medium';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    if (!isValid(date)) return null;

    const today = new Date();
    if (isSameDay(date, today)) {
      return 'Today';
    } else if (isPast(date) && !isSameDay(date, today)) {
      return format(date, 'MMM d');
    } else {
      return format(date, 'MMM d');
    }
  };

  const isUrl = (path: string) => path.startsWith('http://') || path.startsWith('https://');

  const isOverdue = nextAvailableTask?.due_date && nextAvailableTask.status === 'to-do' && isPast(parseISO(nextAvailableTask.due_date)) && !isSameDay(parseISO(nextAvailableTask.due_date), new Date());
  const isDueToday = nextAvailableTask?.due_date && nextAvailableTask.status === 'to-do' && isSameDay(parseISO(nextAvailableTask.due_date), new Date());


  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Daily Overview
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onOpenFocusView} disabled={isDemo}>
          <Target className="h-4 w-4 mr-2" /> Focus Mode
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <p className="flex items-center gap-1">
            <ListTodo className="h-4 w-4" /> {dailyProgress.totalPendingCount} Pending
          </p>
          <p className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> {dailyProgress.completedCount} Completed
          </p>
          {dailyProgress.overdueCount > 0 && (
            <p className="flex items-center gap-1 text-red-500">
              {dailyProgress.overdueCount} Overdue
            </p>
          )}
        </div>
        <Progress value={progressPercentage} className="h-2 mb-4" />

        {tasksLoading ? (
          <div className="flex items-center justify-center h-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : nextAvailableTask ? (
          <div className={cn(
            "relative flex items-center justify-between gap-2 mt-4 p-3 rounded-lg border",
            "bg-muted text-foreground border-border",
            isOverdue && "bg-red-500/10 border-red-500/30",
            isDueToday && !isOverdue && "bg-yellow-500/10 border-yellow-500/30"
          )}>
            <div className={cn(
              "absolute left-0 top-0 h-full w-1.5 rounded-l-lg",
              getPriorityDotColor(nextAvailableTask.priority)
            )} />
            <div className="flex-grow flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 min-w-0 pl-2">
              <span className="font-medium text-base flex-grow truncate">
                {nextAvailableTask.description}
              </span>
              <div className="flex-shrink-0 flex items-center gap-2 mt-1 sm:mt-0">
                {nextAvailableTask.link && (
                  isUrl(nextAvailableTask.link) ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={nextAvailableTask.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center flex-shrink-0 text-muted-foreground hover:text-primary text-xs"
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Open link: {nextAvailableTask.link}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center flex-shrink-0 text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Local path</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                )}
                {nextAvailableTask.notes && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center flex-shrink-0 text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Has notes</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {nextAvailableTask.image_url && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center flex-shrink-0 text-muted-foreground">
                        <Image className="h-3.5 w-3.5" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Has image</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {nextAvailableTask.recurring_type !== 'none' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center flex-shrink-0 text-muted-foreground">
                        <Repeat className="h-3.5 w-3.5" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Recurring: {nextAvailableTask.recurring_type.charAt(0).toUpperCase() + nextAvailableTask.recurring_type.slice(1)}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {nextAvailableTask.due_date && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={cn(
                        "inline-flex items-center flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full",
                        "text-foreground bg-muted",
                        isOverdue && "text-red-700 bg-red-200 dark:text-red-200 dark:bg-red-700 font-bold",
                        isDueToday && !isOverdue && "text-yellow-700 bg-yellow-200 dark:text-yellow-200 dark:bg-yellow-700 font-bold"
                      )}>
                        <CalendarIcon className="h-3 w-3 mr-1" /> {getDueDateDisplay(nextAvailableTask.due_date)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Due: {format(parseISO(nextAvailableTask.due_date), 'MMM d, yyyy')}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="sm" onClick={handleMarkDone} disabled={isDemo}>Done</Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mark this task as completed</p>
                </TooltipContent>
              </Tooltip>
              <Button variant="outline" size="sm" onClick={handleDetailsClick} disabled={isDemo}>Details</Button>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground mt-4">No tasks currently in focus. Great job!</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4"> {/* Changed to 3 columns */}
          <Button
            variant="outline"
            size="sm"
            onClick={archiveAllCompletedTasks}
            disabled={isDemo || dailyProgress.completedCount === 0}
            className="flex items-center justify-center"
          >
            <Archive className="h-4 w-4 mr-2" /> Archive Done
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAllDoToday}
            disabled={isDemo || dailyProgress.totalPendingCount === 0}
            className="flex items-center justify-center"
          >
            <ChevronsDownUp className="h-4 w-4 mr-2" /> Toggle Do Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllTasksAsSkipped}
            disabled={isDemo || dailyProgress.totalPendingCount === 0}
            className="flex items-center justify-center"
          >
            <XSquare className="h-4 w-4 mr-2" /> Mark All Skipped
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyOverviewCard;