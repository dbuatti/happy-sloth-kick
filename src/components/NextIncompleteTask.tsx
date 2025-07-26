import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ListTodo } from 'lucide-react';
import { Task, TaskSection } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface NextIncompleteTaskProps {
  tasksGroupedBySection: (TaskSection & { tasks: Task[] })[];
  expandedSections: Record<string, boolean>;
}

const NextIncompleteTask: React.FC<NextIncompleteTaskProps> = ({ tasksGroupedBySection, expandedSections }) => {
  const nextIncompleteTask = useMemo(() => {
    for (const sectionGroup of tasksGroupedBySection) {
      // Only consider tasks in expanded sections
      if (expandedSections[sectionGroup.id] === false) {
        continue;
      }
      for (const task of sectionGroup.tasks) {
        if (task.status === 'to-do' || task.status === 'skipped') {
          return task;
        }
      }
    }
    return null;
  }, [tasksGroupedBySection, expandedSections]);

  return (
    <Card className="w-full shadow-sm mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Next Up</CardTitle>
        <ListTodo className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {nextIncompleteTask ? (
          <div className="text-2xl font-bold">
            {nextIncompleteTask.description}
          </div>
        ) : (
          <div className="text-lg font-semibold text-gray-500 dark:text-gray-400">
            All tasks completed or no tasks to show!
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NextIncompleteTask;