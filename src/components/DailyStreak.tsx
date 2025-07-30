import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/Progress";
import { CheckCircle2, Target } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { Task } from '@/hooks/useTasks';

interface DailyStreakProps {
  tasks: Task[];
  currentDate: Date;
}

const DailyStreak: React.FC<DailyStreakProps> = ({ tasks, currentDate }) => {
  const { completedTasksToday, totalTasksToday, completionPercentage } = useMemo(() => {
    const completed = tasks.filter(task => task.status === 'completed').length;
    const total = tasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completedTasksToday: completed, totalTasksToday: total, completionPercentage: percentage };
  }, [tasks]);

  return (
    <Card className="w-full shadow-sm mb-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Today's Progress</CardTitle>
        <Target className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold mb-1">
          {completedTasksToday} / {totalTasksToday} tasks completed
        </div>
        <Progress value={completionPercentage} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1">
          {completionPercentage}% completed for {isSameDay(currentDate, new Date()) ? 'today' : format(currentDate, 'MMM d')}
        </p>
      </CardContent>
    </Card>
  );
};

export default DailyStreak;