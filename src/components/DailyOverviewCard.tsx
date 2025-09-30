"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Target, ListTodo, Archive, ChevronsDownUp } from 'lucide-react';
import { Task } from '@/hooks/useTasks';

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
  archiveAllCompletedTasks: () => Promise<void>; // New prop
  toggleAllDoToday: () => Promise<void>; // New prop
  markAllTasksAsCompleted: () => Promise<void>; // New prop (for all pending tasks)
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
  markAllTasksAsCompleted,
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
          <div className="flex items-center justify-between gap-2 mt-4 p-3 bg-muted rounded-lg">
            <span className="font-medium text-base flex-grow truncate">
              {nextAvailableTask.description}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleMarkDone} disabled={isDemo}>Done</Button>
              <Button variant="outline" size="sm" onClick={handleDetailsClick} disabled={isDemo}>Details</Button>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground mt-4">No tasks currently in focus. Great job!</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllTasksAsCompleted}
            disabled={isDemo || dailyProgress.totalPendingCount === 0}
            className="flex items-center justify-center"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" /> Mark All Done
          </Button>
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
            disabled={isDemo || dailyProgress.totalPendingCount === 0} // Disable if no pending tasks to toggle
            className="flex items-center justify-center"
          >
            <ChevronsDownUp className="h-4 w-4 mr-2" /> Toggle Do Today
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyOverviewCard;