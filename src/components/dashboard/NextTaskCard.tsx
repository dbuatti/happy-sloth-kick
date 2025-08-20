import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Task, UpdateTaskData } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { getPriorityDotColor } from '@/utils/taskHelpers';
import { CheckCircle2, ListTodo } from 'lucide-react';

interface NextTaskCardProps {
  nextAvailableTask: Task | null;
  updateTask: (taskId: string, updates: UpdateTaskData) => Promise<Task | null>;
  onOpenOverview: (task: Task) => void;
}

const NextTaskCard: React.FC<NextTaskCardProps> = ({ nextAvailableTask, updateTask, onOpenOverview }) => {
  const handleMarkComplete = async (task: Task) => {
    await updateTask(task.id, { status: 'completed' });
  };

  const handleMarkToDo = async (task: Task) => {
    await updateTask(task.id, { status: 'to-do' });
  };

  return (
    <Card className="flex flex-col items-center justify-center text-center p-6 h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-center">Next Task</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col items-center justify-center w-full">
        {nextAvailableTask ? (
          <div className="flex flex-col items-center text-center space-y-3">
            <div className={cn("w-3 h-3 rounded-full", getPriorityDotColor(nextAvailableTask.priority || 'medium'))} />
            <p className="text-xl sm:text-2xl font-bold leading-tight text-foreground line-clamp-2">
              {nextAvailableTask.description}
            </p>
            <div className="flex gap-2 mt-4">
              {nextAvailableTask.status !== 'completed' ? (
                <Button onClick={() => handleMarkComplete(nextAvailableTask)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Complete
                </Button>
              ) : (
                <Button variant="outline" onClick={() => handleMarkToDo(nextAvailableTask)}>
                  <ListTodo className="mr-2 h-4 w-4" /> Mark To-Do
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenOverview(nextAvailableTask)}>
                Details
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">No tasks currently in focus.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default NextTaskCard;