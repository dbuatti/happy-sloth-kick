import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Task } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isToday, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { NextTaskCardProps } from '@/types';

const NextTaskCard: React.FC<NextTaskCardProps> = ({ tasks, onToggleFocusMode }) => {
  const sortedTasks = tasks
    .filter(task => task.status === 'to-do' && !task.parent_task_id)
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  const nextTask = sortedTasks[0];

  if (!nextTask) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Next Task</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No upcoming tasks.</p>
        </CardContent>
      </Card>
    );
  }

  const isOverdue = nextTask.due_date && isPast(new Date(nextTask.due_date)) && !isToday(new Date(nextTask.due_date));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Next Task</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => onToggleFocusMode(nextTask.id, true)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className={cn("text-lg font-semibold", isOverdue && "text-red-500")}>
            {nextTask.description}
          </p>
          {nextTask.due_date && (
            <p className={cn("text-sm text-muted-foreground", isOverdue && "text-red-400")}>
              Due: {format(new Date(nextTask.due_date), 'PPP')}
            </p>
          )}
          {nextTask.category && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${nextTask.category.color}`}>
              {nextTask.category.name}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NextTaskCard;