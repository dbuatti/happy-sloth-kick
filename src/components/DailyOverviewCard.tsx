"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Task } from '@/hooks/useTasks';
import { CheckCircle2, Target, ListTodo, Clock } from 'lucide-react';
import DoTodaySwitch from './DoTodaySwitch'; // This is used
// Removed unused imports: cn, ArrowRight, Tooltip, TooltipContent, TooltipTrigger

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
  doTodayOffIds: Set<string>;
  toggleDoToday: (task: Task) => void;
  archiveAllCompletedTasks: () => Promise<void>;
  toggleAllDoToday: () => Promise<void>;
  setIsFocusPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsManageCategoriesOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsManageSectionsOpen: React.SetStateAction<boolean>>;
  onToggleAllSections: () => void;
}

const DailyOverviewCard: React.FC<DailyOverviewCardProps> = ({
  dailyProgress,
  nextAvailableTask,
  updateTask,
  onOpenOverview,
  onOpenFocusView,
  tasksLoading,
  isDemo,
  doTodayOffIds,
  toggleDoToday,
}) => {
  const totalTasks = dailyProgress.totalPendingCount + dailyProgress.completedCount;
  const completionPercentage = totalTasks > 0 ? (dailyProgress.completedCount / totalTasks) * 100 : 0;

  const handleMarkNextTaskDone = async () => {
    if (nextAvailableTask && !isDemo) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
    }
  };

  const handleToggleDoTodaySwitch = (task: Task) => {
    toggleDoToday(task);
  };

  return (
    <Card className="w-full shadow-lg border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-xl font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span>Daily Overview</span>
          </div>
          <Button variant="outline" size="sm" onClick={onOpenFocusView} disabled={isDemo} className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            Focus Mode
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <ListTodo className="h-4 w-4" />
            <span>{dailyProgress.totalPendingCount} Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{dailyProgress.completedCount} Completed</span>
          </div>
          {dailyProgress.overdueCount > 0 && (
            <div className="flex items-center gap-1 text-red-500">
              <Clock className="h-4 w-4" />
              <span>{dailyProgress.overdueCount} Overdue</span>
            </div>
          )}
        </div>

        <Progress value={completionPercentage} className="h-2" />

        <div className="pt-2">
          {tasksLoading ? (
            <div className="text-center text-muted-foreground">Loading tasks...</div>
          ) : nextAvailableTask ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border rounded-lg bg-secondary/20">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-lg truncate">{nextAvailableTask.description}</h3>
                {nextAvailableTask.due_date && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3.5 w-3.5" />
                    Due: {new Date(nextAvailableTask.due_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <DoTodaySwitch
                  isOn={!doTodayOffIds.has(nextAvailableTask.original_task_id || nextAvailableTask.id)}
                  onToggle={() => handleToggleDoTodaySwitch(nextAvailableTask)}
                  taskId={nextAvailableTask.id}
                  isDemo={isDemo}
                />
                <Button variant="secondary" size="sm" onClick={handleMarkNextTaskDone} disabled={isDemo}>
                  Done
                </Button>
                <Button variant="outline" size="sm" onClick={() => onOpenOverview(nextAvailableTask)} disabled={isDemo}>
                  Details
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground p-4 border rounded-lg bg-secondary/20">
              <p className="font-medium">No tasks currently in focus or available.</p>
              <p className="text-sm mt-1">Time to relax or add a new task!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyOverviewCard;