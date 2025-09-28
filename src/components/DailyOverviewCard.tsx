import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { showSuccess } from '@/utils/toast';

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
  setIsManageSectionsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onToggleAllSections: () => void;
}

const DailyOverviewCard: React.FC<DailyOverviewCardProps> = ({
  dailyProgress,
  nextAvailableTask,
  updateTask,
  onOpenOverview,
  onOpenFocusView,
  tasksLoading,
  isDemo = false,
  doTodayOffIds,
  toggleDoToday,
  archiveAllCompletedTasks,
  toggleAllDoToday,
  setIsFocusPanelOpen,
  setIsManageCategoriesOpen,
  setIsManageSectionsOpen,
  onToggleAllSections,
}) => {
  const { totalPendingCount, completedCount, overdueCount } = dailyProgress;
  const totalTasks = totalPendingCount + completedCount;
  const progressPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const handleStartFocus = () => {
    if (nextAvailableTask) {
      onOpenFocusView(); // This will open the focus panel/drawer
      // The actual focus task setting and UI transition will be handled there.
    } else {
      // Optionally, show a message or open the focus panel anyway to allow manual selection
      setIsFocusPanelOpen(true);
    }
  };

  return (
    <Card className="w-full bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Today's Focus
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsManageCategoriesOpen(true)}
              className="h-8 text-xs"
            >
              Categories
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsManageSectionsOpen(true)}
              className="h-8 text-xs"
            >
              Sections
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleAllSections}
              className="h-8 text-xs"
            >
              Toggle Sections
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Summary */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">
              {completedCount} of {totalTasks} tasks completed
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progressPercentage}%</span>
            <div className="flex items-center gap-2">
              {overdueCount > 0 && (
                <span className="flex items-center text-status-overdue">
                  <AlertCircle className="h-3 w-3 mr-1" /> {overdueCount} overdue
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleStartFocus}
            className="flex-1 min-w-[120px]"
            disabled={tasksLoading || (!nextAvailableTask && totalTasks === 0)}
          >
            <Target className="mr-2 h-4 w-4" />
            {nextAvailableTask ? "Start Focusing" : "Focus Mode"}
          </Button>
          <Button
            variant="outline"
            onClick={archiveAllCompletedTasks}
            disabled={tasksLoading || completedCount === 0}
            className="flex-1 min-w-[120px]"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Archive Completed
          </Button>
          <Button
            variant="outline"
            onClick={toggleAllDoToday}
            disabled={tasksLoading}
            className="flex-1 min-w-[120px]"
          >
            Toggle All "Do Today"
          </Button>
        </div>

        {/* Next Task Preview */}
        {nextAvailableTask && (
          <div 
            className="p-3 rounded-lg bg-card border cursor-pointer hover:bg-accent transition-colors"
            onClick={() => onOpenOverview(nextAvailableTask)}
          >
            <h3 className="font-medium text-sm mb-1 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2"></span>
              Up Next
            </h3>
            <p className="text-sm truncate">{nextAvailableTask.description}</p>
            {nextAvailableTask.due_date && (
              <p className="text-xs text-muted-foreground mt-1">
                Due: {new Date(nextAvailableTask.due_date).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyOverviewCard;