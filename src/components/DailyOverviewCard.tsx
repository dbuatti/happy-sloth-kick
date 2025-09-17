import React from 'react';
import { Button } from '@/components/ui/button';
import { ListTodo, Brain, CheckCircle2, Clock, Sparkles, FolderOpen, Tag, Archive, ToggleRight, ChevronDown } from 'lucide-react';
import { Task } from '@/hooks/useTasks';
import { Progress } from '@/components/Progress';
import NextTaskCard from './dashboard/NextTaskCard';
import { Card, CardTitle, CardHeader, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

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
  isDemo,
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
  const totalTasksForProgress = totalPendingCount + completedCount;
  const isNextTaskDoToday = nextAvailableTask ? !doTodayOffIds.has(nextAvailableTask.original_task_id || nextAvailableTask.id) : false;

  const showNextTask = nextAvailableTask && totalPendingCount > 0;

  return (
    <Card className="mx-4 mt-4 p-0 shadow-sm rounded-xl bg-background">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Daily Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 p-4">
        {showNextTask ? (
          <NextTaskCard
            nextAvailableTask={nextAvailableTask}
            updateTask={updateTask}
            onOpenOverview={onOpenOverview}
            loading={tasksLoading}
            onOpenFocusView={onOpenFocusView}
            isDoToday={isNextTaskDoToday}
            toggleDoToday={toggleDoToday}
            isDemo={isDemo}
          />
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {totalPendingCount === 0 && completedCount > 0
                ? "All tasks completed for today! 🎉"
                : totalPendingCount === 0 && completedCount === 0
                ? "No tasks for today. Enjoy your free time! 🧘‍♀️"
                : "No next task available, but here's your progress:"}
            </p>
          </div>
        )}

        <div className={cn("mt-4 pt-4 border-t", !showNextTask && "border-t-0 pt-0")}>
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-1">
              <ListTodo className="h-4 w-4 text-foreground" />
              <span className="font-semibold text-foreground text-lg">{totalPendingCount} pending</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary text-lg">{completedCount} completed</span>
            </div>
          </div>
          <Progress
            value={totalTasksForProgress > 0 ? (completedCount / totalTasksForProgress) * 100 : 0}
            className="h-4 rounded-full"
            indicatorClassName="bg-gradient-to-r from-primary to-accent rounded-full"
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-3 gap-2">
            {overdueCount > 0 ? (
              <p className="text-sm text-destructive flex items-center gap-1">
                <Clock className="h-4 w-4" /> {overdueCount} overdue
              </p>
            ) : <div />}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={isDemo}>
                  Bulk Actions <ChevronDown className="ml-2 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={archiveAllCompletedTasks}>
                  <Archive className="mr-2 h-3.5 w-3.5" /> Archive Completed
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={toggleAllDoToday}>
                  <ToggleRight className="mr-2 h-3.5 w-3.5" /> Toggle All 'Do Today'
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onToggleAllSections}>
                  <ChevronDown className="mr-2 h-3.5 w-3.5" /> Toggle All Sections
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setIsManageCategoriesOpen(true)}>
                  <Tag className="mr-2 h-4 w-4" /> Manage Categories
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsManageSectionsOpen(true)}>
                  <FolderOpen className="mr-2 h-4 w-4" /> Manage Sections
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setIsFocusPanelOpen(true)}>
                  <Brain className="mr-2 h-4 w-4" /> Open Focus Tools
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyOverviewCard;