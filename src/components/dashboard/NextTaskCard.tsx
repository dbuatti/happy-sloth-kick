import React from 'react';
import { cn } from '@/lib/utils';
import { Task, UpdateTaskData } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isToday, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { NextTaskCardProps } from '@/types';
import { toast } from 'react-hot-toast';

const NextTaskCard: React.FC<NextTaskCardProps> = ({ tasks, onUpdateTask, onDeleteTask, onToggleFocusMode, onLogDoTodayOff }) => {
  const sortedTasks = tasks
    .filter((task: Task) => task.status === 'to-do' && !task.parent_task_id)
    .sort((a: Task, b: Task) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  const nextTask = sortedTasks.length > 0 ? sortedTasks[0] : null;

  const handleCompleteTask = async (taskId: string) => {
    try {
      await onUpdateTask(taskId, { status: 'completed' });
      toast.success('Task completed!');
    } catch (error) {
      toast.error('Failed to complete task.');
      console.error('Error completing task:', error);
    }
  };

  if (!nextTask) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
        <p>No tasks due soon!</p>
        <p>Time to relax or add a new task.</p>
      </div>
    );
  }

  const isOverdue = nextTask.due_date && isPast(new Date(nextTask.due_date)) && !isToday(new Date(nextTask.due_date));
  const isDueToday = nextTask.due_date && isToday(new Date(nextTask.due_date));

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">Next Up:</h3>
      <div className="flex items-center justify-between bg-card p-3 rounded-lg shadow-sm">
        <div>
          <p className="font-medium">{nextTask.description}</p>
          {nextTask.due_date && (
            <p className={cn(
              "text-sm",
              isOverdue ? "text-red-500" : isDueToday ? "text-orange-500" : "text-muted-foreground"
            )}>
              {isOverdue ? 'Overdue' : isDueToday ? 'Due Today' : 'Due'} {format(new Date(nextTask.due_date), 'MMM d, yyyy')}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => handleCompleteTask(nextTask.id)}>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </Button>
          <Button variant="ghost" size="sm">
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NextTaskCard;