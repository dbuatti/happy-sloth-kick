import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/Progress";
import { CheckCircle2, ListTodo, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TodayProgressCardProps {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

const TodayProgressCard: React.FC<TodayProgressCardProps> = ({
  totalTasks,
  completedTasks,
  overdueTasks,
}) => {
  const progressValue = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" /> Today's Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center text-sm font-medium">
          <span>Completed: {completedTasks}</span>
          <span>Total: {totalTasks}</span>
        </div>
        <Progress value={progressValue} className="h-2" indicatorClassName="bg-primary" />
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <ListTodo className="h-4 w-4" />
            <span>Pending: {totalTasks - completedTasks}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-destructive" />
            <span>Overdue: {overdueTasks}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodayProgressCard;