import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface DailyTasksHeaderProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  nextAvailableTask: Task | null;
  dailyProgress: { completed: number; total: number };
  isDemo?: boolean;
}

const DailyTasksHeader: React.FC<DailyTasksHeaderProps> = ({
  currentDate,
  setCurrentDate,
  nextAvailableTask,
  dailyProgress,
  isDemo = false,
}) => {
  const getPriorityDotColor = (priority: string | null) => {
    if (!priority) return 'bg-gray-400';
    switch (priority) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'urgent': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const handlePreviousDay = () => {
    setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)));
  };

  const handleNextDay = () => {
    setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = currentDate.toDateString() === new Date().toDateString();

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousDay} disabled={isDemo}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            onClick={handleToday}
            disabled={isDemo}
            className={cn("font-medium", isToday && "bg-primary text-primary-foreground")}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextDay} disabled={isDemo}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-2">
            <h2 className="text-xl font-bold">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h2>
            <p className="text-sm text-muted-foreground">
              {isToday ? 'Today' : format(currentDate, 'EEEE')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Daily Tasks
          </Badge>
        </div>
      </div>

      {/* Progress Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold">Daily Progress</h3>
              <p className="text-sm text-muted-foreground">
                {dailyProgress.completed} of {dailyProgress.total} tasks completed
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-32 bg-secondary rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ width: `${dailyProgress.total > 0 ? (dailyProgress.completed / dailyProgress.total) * 100 : 0}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium">
                {dailyProgress.total > 0 ? Math.round((dailyProgress.completed / dailyProgress.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Task Card */}
      {nextAvailableTask && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("w-5 h-5 rounded-full flex-shrink-0", getPriorityDotColor(nextAvailableTask.priority || null))} />
                <div>
                  <h3 className="font-semibold">Next Task</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {nextAvailableTask.description}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled={isDemo}>
                Start Focus
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DailyTasksHeader;