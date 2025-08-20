import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { Play, CheckCircle2 } from 'lucide-react';

interface NextTaskCardProps {
  nextAvailableTask: Task | null;
  onStartFocus: () => void;
  onCompleteTask: (task: Task) => void;
  onOpenOverview: (task: Task) => void;
  isDemo?: boolean;
}

const NextTaskCard: React.FC<NextTaskCardProps> = ({
  nextAvailableTask,
  onStartFocus,
  onCompleteTask,
  onOpenOverview,
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

  if (!nextAvailableTask) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Next Task</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No tasks available for today.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next Task</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center text-center space-y-3">
          <div className={cn("w-3 h-3 rounded-full", getPriorityDotColor(nextAvailableTask.priority || null))} />
          <p className="text-xl sm:text-2xl font-bold leading-tight text-foreground line-clamp-2">
            {nextAvailableTask.description}
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={() => onCompleteTask(nextAvailableTask)} 
              className="flex items-center gap-2"
              disabled={isDemo}
            >
              <CheckCircle2 className="h-4 w-4" /> Complete
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenOverview(nextAvailableTask)}
              disabled={isDemo}
            >
              Details
            </Button>
          </div>
          <Button 
            variant="secondary" 
            className="w-full flex items-center gap-2"
            onClick={onStartFocus}
            disabled={isDemo}
          >
            <Play className="h-4 w-4" /> Start Focus Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NextTaskCard;