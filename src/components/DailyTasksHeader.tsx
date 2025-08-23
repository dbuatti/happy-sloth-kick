import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskSection, TaskCategory, NewTaskData } from '@/types';
import { showError, showLoading, dismissToast } from '@/utils/toast';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import { useSound } from '@/context/SoundContext';

interface DailyTasksHeaderProps {
  currentDate: Date;
  onAddTask: (data: NewTaskData) => Promise<Task>;
  onRefreshTasks: () => void;
  dailyProgress: { completed: number; total: number };
  sections: TaskSection[];
  categories: TaskCategory[];
}

const DailyTasksHeader: React.FC<DailyTasksHeaderProps> = ({
  onAddTask,
  onRefreshTasks,
  dailyProgress,
}) => {
  const { playSound } = useSound();

  const handleRefresh = async () => {
    playSound('refresh');
    const toastId = showLoading('Refreshing tasks...');
    try {
      await onRefreshTasks();
      dismissToast(toastId);
      // toast.success('Tasks refreshed!'); // Handled by onRefreshTasks success
    } catch (error) {
      dismissToast(toastId);
      showError('Failed to refresh tasks.');
      console.error('Error refreshing tasks:', error);
    }
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-4">
        <h2 className="text-2xl font-bold">Daily Tasks</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">
          {dailyProgress.completed}/{dailyProgress.total} tasks completed
        </span>
        <Progress value={(dailyProgress.completed / dailyProgress.total) * 100} className="w-[100px]" />
      </div>
    </div>
  );
};

export default DailyTasksHeader;