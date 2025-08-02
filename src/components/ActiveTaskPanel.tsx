import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/Progress";
import { Play, Pause, RefreshCcw, CheckCircle2, Edit, Target, ListTodo, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { useSound } from '@/context/SoundContext';
import TaskDetailDialog from './TaskDetailDialog';
import TaskOverviewDialog from './TaskOverviewDialog'; // For opening overview from panel
import { useAuth } from '@/context/AuthContext'; // Import useAuth

interface ActiveTaskPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nextAvailableTask: Task | null;
  tasks: Task[];
  filteredTasks: Task[];
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onOpenDetail: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  sections: TaskSection[];
  allCategories: Category[];
  currentDate: Date;
}

const ActiveTaskPanel: React.FC<ActiveTaskPanelProps> = ({
  nextAvailableTask,
  tasks,
  filteredTasks,
  updateTask,
  onOpenDetail,
  onDeleteTask,
  sections,
  allCategories,
  currentDate,
}) => {
  const { user } = useAuth(); // Use useAuth to get the user
  const userId = user?.id || null; // Get userId from useAuth

  const { playSound } = useSound();

  // Focus Timer State
  const [focusDuration, setFocusDuration] = useState(25 * 60); // 25 minutes
  const [timeRemaining, setTimeRemaining] = useState(focusDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false); // To track if a session has started
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Task Detail/Overview Dialog State
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  useEffect(() => {
    setTimeRemaining(focusDuration);
  }, [focusDuration]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setIsSessionActive(false);
            playSound('alert'); // Alert sound when timer finishes
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, playSound]);

  const startTimer = useCallback(() => {
    if (timeRemaining > 0) {
      setIsRunning(true);
      setIsSessionActive(true);
      playSound('start');
    }
  }, [timeRemaining, playSound]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    playSound('pause');
  }, [playSound]);

  const resetTimer = useCallback(() => {
    pauseTimer();
    setTimeRemaining(focusDuration);
    setIsSessionActive(false);
    playSound('reset');
  }, [pauseTimer, focusDuration, playSound]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressValue = (timeRemaining / focusDuration) * 100;

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

  const handleOpenTaskDetails = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setIsTaskOverviewOpen(false);
    handleOpenTaskDetails(task);
  };

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
        <CardContent className="space-y-4">
          <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
            <Progress
              value={progressValue}
              className="absolute w-full h-full rounded-full bg-muted"
              indicatorClassName={cn(
                "transition-all duration-1000 ease-linear",
                "bg-primary"
              )}
            />
            <div className="relative z-10 text-4xl font-bold text-primary-foreground">
              {formatTime(timeRemaining)}
            </div>
          </div>
          <div className="flex justify-center space-x-2">
            <Button
              size="sm"
              onClick={isRunning ? pauseTimer : startTimer}
              className={cn(
                "w-24",
                isRunning ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
              )}
              disabled={timeRemaining === 0 && isSessionActive}
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={resetTimer} className="w-24">
              <RefreshCcw className="h-4 w-4" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Next Up Task Card */}
      <Card className="w-full shadow-lg rounded-xl flex-grow flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
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
                <Button size="sm" onClick={handleMarkComplete} className="h-8">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Done
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleOpenTaskOverview(nextAvailableTask)} className="h-8">
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
          <CardTitle className="text-xl font-bold flex items-center gap-2">
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

      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          onUpdate={updateTask}
          onDelete={onDeleteTask}
          sections={sections}
          allCategories={allCategories}
        />
      )}
    </div>
  );
};

export default ActiveTaskPanel;