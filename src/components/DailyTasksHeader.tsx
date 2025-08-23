import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskSection, TaskCategory, NewTaskData, DailyTasksHeaderProps, DoTodayOffLogEntry } from '@/types';
import { showError, showLoading, dismissToast } from '@/utils/toast';
import { useDailyTaskCount } from '@/hooks/useDailyTaskCount';
import { useSound } from '@/context/SoundContext';
import { format, isToday, parseISO } from 'date-fns';

const DailyTasksHeader: React.FC<DailyTasksHeaderProps> = ({
  onAddTask,
  onRefreshTasks,
  tasks,
  categories,
  sections,
  doTodayOffLog,
}) => {
  const { playSound } = useSound();

  const totalTasks = tasks.filter(task => task.status === 'to-do' && !task.parent_task_id).length;
  const completedTasks = tasks.filter(task => task.status === 'completed' && !task.parent_task_id).length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const handleRefresh = () => {
    playSound('refresh');
    onRefreshTasks();
  };

  return (
    <Card className="p-4 flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold">Today's Progress</h3>
        <p className="text-sm text-muted-foreground">{completedTasks} / {totalTasks} tasks completed</p>
        <Progress value={progress} className="w-[150px] mt-2" />
      </div>
      <div className="flex space-x-2">
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
        </Button>
        {/* Add Task button is typically handled by a separate component or dialog */}
      </div>
    </Card>
  );
};

export default DailyTasksHeader;