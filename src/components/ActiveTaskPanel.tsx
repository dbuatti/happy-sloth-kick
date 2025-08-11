import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Edit, Target, ListTodo, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { useSound } from '@/context/SoundContext';
import TaskOverviewDialog from './TaskOverviewDialog'; // For opening overview from panel
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import PomodoroTimer from './PomodoroTimer'; // Import the new Pomodoro Timer

interface ActiveTaskPanelProps {
  nextAvailableTask: Task | null;
  tasks: Task[];
  filteredTasks: Task[];
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  onDeleteTask: (taskId: string) => void;
  sections: TaskSection[];
  allCategories: Category[];
  onOpenDetail: (task: Task) => void;
}

const ActiveTaskPanel: React.FC<ActiveTaskPanelProps> = ({
  nextAvailableTask,
  tasks,
  filteredTasks,
  updateTask,
  onDeleteTask,
  sections,
  allCategories,
  onOpenDetail,
}) => {
  useAuth(); 

  const { playSound } = useSound();

  // Task Detail/Overview Dialog State
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const getPriorityDotColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-priority-urgent';
      case 'high': return 'bg-priority-high';
      case 'medium': return 'bg-priority-medium';
      case 'low': return 'bg-priority-low';
      default: return 'bg-gray-500';
    }
  };

  const handleMarkComplete = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      playSound('success');
    }
  };

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTaskFromOverview = useCallback((task: Task) => {
    setIsTaskOverviewOpen(false);
    onOpenDetail(task);
  }, [onOpenDetail]);

  const upcomingTasks = useMemo(() => {
    if (!nextAvailableTask) return [];
    // Filter out the nextAvailableTask and its direct subtasks
    const nextTaskAndSubtasksIds = new Set([
      nextAvailableTask.id,
      ...tasks.filter(t => t.parent_task_id === nextAvailableTask.id).map(t => t.id)
    ]);

    return filteredTasks
      .filter(t => !nextTaskAndSubtasksIds.has(t.id) && t.parent_task_id === null && t.status === 'to-do')
      .slice(0, 5); // Show next 5 upcoming tasks
  }, [nextAvailableTask, filteredTasks, tasks]);

  return (
    <div className="h-full flex flex-col space-y-3">
      {/* Focus Timer Card */}
      <Card className="w-full shadow-lg rounded-xl text-center flex-shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Focus Timer
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Dedicated time for deep work.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 py-4">
          <PomodoroTimer />
        </CardContent>
      </Card>

      {/* Next Up Task Card */}
      <Card className="w-full shadow-lg rounded-xl flex-grow flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Next Up
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-between pt-0">
          {nextAvailableTask ? (
            <div className="flex-grow flex flex-col justify-center items-center text-center space-y-3 p-2">
              <div className={cn("w-3 h-3 rounded-full", getPriorityDotColor(nextAvailableTask.priority))} />
              <h3 className="text-lg font-semibold leading-tight text-foreground line-clamp-3">
                {nextAvailableTask.description}
              </h3>
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleMarkComplete} className="h-8 text-base">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Done
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleOpenTaskOverview(nextAvailableTask)} className="h-8 text-base">
                  <Edit className="mr-2 h-4 w-4" /> Details
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center text-center text-muted-foreground text-sm py-4">
              No tasks currently available.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Tasks Card */}
      <Card className="w-full shadow-lg rounded-xl flex-shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" /> Upcoming
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {upcomingTasks.length > 0 ? (
            <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {upcomingTasks.map(task => (
                <li key={task.id} className="flex items-center space-x-2">
                  <div className={cn("w-2 h-2 rounded-full", getPriorityDotColor(task.priority))} />
                  <span className="text-sm text-foreground truncate flex-grow">{task.description}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => handleOpenTaskOverview(task)}
                    aria-label="View task details"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-2">
              No upcoming tasks.
            </p>
          )}
        </CardContent>
      </Card>

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={onDeleteTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={tasks}
        />
      )}
    </div>
  );
};

export default ActiveTaskPanel;