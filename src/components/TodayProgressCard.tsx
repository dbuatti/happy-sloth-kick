import React from 'react';
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Removed Card import
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
    <div className="w-full px-4 py-3"> {/* Replaced Card with div, adjusted padding */}
      <div className="pb-2"> {/* Replaced CardHeader with div */}
        <h2 className="text-xl font-bold flex items-center justify-center gap-2"> {/* Replaced CardTitle with h2 */}
          <CheckCircle2 className="h-5 w-5 text-primary" /> Today's Progress
        </h2>
      </div>
      <div className="space-y-4"> {/* Replaced CardContent with div */}
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
      </div>
    </div>
  );
};

export default TodayProgressCard;