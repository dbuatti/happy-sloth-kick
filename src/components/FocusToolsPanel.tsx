import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Task, TaskSection, UpdateTaskData } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { getPriorityDotColor } from '@/utils/taskHelpers';
import { CheckCircle2, ListTodo, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FocusToolsPanelProps {
  nextAvailableTask: Task | null;
  tasksInFocusMode: Task[];
  updateTask: (taskId: string, updates: UpdateTaskData) => Promise<Task | null>;
  onOpenDetail: (task: Task) => void;
  sections: TaskSection[];
}

const FocusToolsPanel: React.FC<FocusToolsPanelProps> = ({
  nextAvailableTask,
  tasksInFocusMode,
  updateTask,
  onOpenDetail,
  sections,
}) => {
  const handleMarkComplete = async (task: Task) => {
    await updateTask(task.id, { status: 'completed' });
  };

  const handleMarkToDo = async (task: Task) => {
    await updateTask(task.id, { status: 'to-do' });
  };

  const getSectionName = (sectionId: string | null | undefined) => {
    if (!sectionId) return 'No Section';
    return sections.find(s => s.id === sectionId)?.name || 'Unknown Section';
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold">Focus Tools</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col space-y-6">
        {nextAvailableTask ? (
          <div className="flex flex-col items-center justify-center text-center space-y-4 flex-grow">
            <h3 className="text-lg font-semibold text-muted-foreground">Next Up:</h3>
            <div className="flex-grow flex flex-col justify-center items-center text-center space-y-3 p-2">
              <div className={cn("w-3 h-3 rounded-full", getPriorityDotColor(nextAvailableTask.priority || 'medium'))} />
              <h3 className="text-lg font-semibold leading-tight text-foreground line-clamp-3">
                {nextAvailableTask.description}
              </h3>
              <p className="text-sm text-muted-foreground">{getSectionName(nextAvailableTask.section_id)}</p>
            </div>
            <div className="flex gap-2 w-full justify-center">
              {nextAvailableTask.status !== 'completed' ? (
                <Button onClick={() => handleMarkComplete(nextAvailableTask)} className="flex-1">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Complete
                </Button>
              ) : (
                <Button variant="outline" onClick={() => handleMarkToDo(nextAvailableTask)} className="flex-1">
                  <ListTodo className="mr-2 h-4 w-4" /> Mark To-Do
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenDetail(nextAvailableTask)} className="flex-1">
                Details
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center">
            <p className="text-muted-foreground text-center">No tasks in focus mode.</p>
          </div>
        )}

        {tasksInFocusMode.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h4 className="text-md font-semibold mb-3">All Tasks in Focus Mode:</h4>
            <ScrollArea className="h-48">
              <ul className="space-y-2">
                {tasksInFocusMode.map(task => (
                  <li key={task.id} className="flex items-center space-x-2">
                    <div className={cn("w-2 h-2 rounded-full", getPriorityDotColor(task.priority || 'medium'))} />
                    <span className="text-sm text-foreground truncate flex-grow">{task.description}</span>
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FocusToolsPanel;