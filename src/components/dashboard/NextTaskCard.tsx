import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/types'; // Imported from centralized types
import { Skeleton } from '@/components/ui/skeleton';
import { format, isToday, isPast } from 'date-fns';

interface NextTaskCardProps {
  tasks: Task[];
  isLoading?: boolean;
}

const NextTaskCard: React.FC<NextTaskCardProps> = ({ tasks, isLoading }) => {
  const nextTask = useMemo(() => {
    if (!tasks || tasks.length === 0) return null;

    const now = new Date();

    // Filter out completed and archived tasks, and subtasks
    const relevantTasks = tasks.filter(
      (task) => task.status !== 'completed' && task.status !== 'archived' && !task.parent_task_id
    );

    // Sort by due date (earliest first), then by priority (urgent > high > medium > low)
    const sortedTasks = relevantTasks.sort((a, b) => {
      const aDueDate = a.due_date ? new Date(a.due_date) : null;
      const bDueDate = b.due_date ? new Date(b.due_date) : null;

      // Prioritize tasks with due dates
      if (aDueDate && bDueDate) {
        if (aDueDate.getTime() !== bDueDate.getTime()) {
          return aDueDate.getTime() - bDueDate.getTime();
        }
      } else if (aDueDate) {
        return -1; // a has a due date, b doesn't
      } else if (bDueDate) {
        return 1; // b has a due date, a doesn't
      }

      // If due dates are same or non-existent, sort by priority
      const priorityOrder: { [key: string]: number } = {
        urgent: 4,
        high: 3,
        medium: 2,
        low: 1,
      };
      return (priorityOrder[b.priority || 'medium'] || 0) - (priorityOrder[a.priority || 'medium'] || 0);
    });

    return sortedTasks.length > 0 ? sortedTasks[0] : null;
  }, [tasks]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Next Task</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Next Task</CardTitle>
        {nextTask?.status === 'completed' ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <CircleDashed className="h-4 w-4 text-gray-500" />
        )}
      </CardHeader>
      <CardContent>
        {nextTask ? (
          <div>
            <p className="text-2xl font-bold">{nextTask.description}</p>
            {nextTask.due_date && (
              <p
                className={cn(
                  'text-xs',
                  isPast(new Date(nextTask.due_date)) && !isToday(new Date(nextTask.due_date))
                    ? 'text-red-500'
                    : 'text-gray-500'
                )}
              >
                Due: {format(new Date(nextTask.due_date), 'MMM dd, yyyy')}
              </p>
            )}
            {nextTask.category && (
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                style={{ backgroundColor: nextTask.category.color || '#ccc' }}
              >
                {nextTask.category.name}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No upcoming tasks.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default NextTaskCard;