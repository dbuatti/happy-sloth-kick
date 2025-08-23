import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import TaskItem from '@/components/TaskItem';
import { Task, TaskSection, TaskCategory, NewTaskData, UpdateTaskData, FocusModeProps } from '@/types';
import { Progress } from '@/components/ui/progress';
import { format, addMinutes, isPast, isSameDay, startOfDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { Play, Pause, SkipForward, CheckCircle2, XCircle, Timer, Settings as SettingsIcon } from 'lucide-react';

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = demoUserId || user?.id;
  const { settings, updateSettings } = useSettings();

  const {
    tasks,
    categories: allCategories,
    sections: allSections,
    isLoading: tasksLoading,
    error: tasksError,
    addTask,
    updateTask,
    deleteTask,
    onToggleFocusMode,
    onLogDoTodayOff,
  } = useTasks({ userId: currentUserId! });

  const [focusTimeRemaining, setFocusTimeRemaining] = useState(0); // in seconds
  const [isFocusTimerActive, setIsFocusTimerActive] = useState(false);
  const [focusDuration, setFocusDuration] = useState(25 * 60); // Default 25 minutes
  const [breakTimeRemaining, setBreakTimeRemaining] = useState(0); // in seconds
  const [isBreakTimerActive, setIsBreakTimerActive] = useState(false);
  const [breakDuration, setBreakDuration] = useState(5 * 60); // Default 5 minutes

  const focusedTask = useMemo(() => {
    return tasks?.find(task => task.id === settings?.focused_task_id);
  }, [tasks, settings?.focused_task_id]);

  const focusModeTasks = useMemo(() => {
    if (!tasks || !allSections) return [];
    return tasks.filter(task =>
      task.status !== 'completed' &&
      task.status !== 'archived' &&
      allSections.some(section => section.id === task.section_id && section.include_in_focus_mode)
    ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [tasks, allSections]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isFocusTimerActive && focusTimeRemaining > 0) {
      timer = setInterval(() => {
        setFocusTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (isFocusTimerActive && focusTimeRemaining === 0) {
      setIsFocusTimerActive(false);
      toast.success('Focus session complete! Time for a break.');
      startBreakTimer();
    }

    if (isBreakTimerActive && breakTimeRemaining > 0) {
      timer = setInterval(() => {
        setBreakTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (isBreakTimerActive && breakTimeRemaining === 0) {
      setIsBreakTimerActive(false);
      toast('Break over! Ready for another focus session?');
    }

    return () => clearInterval(timer);
  }, [isFocusTimerActive, focusTimeRemaining, isBreakTimerActive, breakTimeRemaining]);

  const startFocusTimer = () => {
    setIsBreakTimerActive(false);
    setBreakTimeRemaining(0);
    setFocusTimeRemaining(focusDuration);
    setIsFocusTimerActive(true);
    toast.success('Focus session started!');
  };

  const pauseFocusTimer = () => {
    setIsFocusTimerActive(false);
    toast('Focus session paused.');
  };

  const stopFocusTimer = () => {
    setIsFocusTimerActive(false);
    setFocusTimeRemaining(0);
    toast('Focus session stopped.');
  };

  const startBreakTimer = () => {
    setIsFocusTimerActive(false);
    setFocusTimeRemaining(0);
    setBreakTimeRemaining(breakDuration);
    setIsBreakTimerActive(true);
    toast(`Starting a ${breakDuration / 60}-minute break!`);
  };

  const stopBreakTimer = () => {
    setIsBreakTimerActive(false);
    setBreakTimeRemaining(0);
    toast('Break timer stopped.');
  };

  const handleCompleteTask = async (taskId: string) => {
    await updateTask({ id: taskId, updates: { status: 'completed' } });
    if (settings?.focused_task_id === taskId) {
      await updateSettings({ focused_task_id: null });
      toast.success('Focused task completed!');
    } else {
      toast.success('Task completed!');
    }
  };

  const handleSkipTask = async (taskId: string) => {
    await updateSettings({ focused_task_id: null });
    toast('Focused task skipped.');
  };

  const handleSetFocusTask = async (taskId: string) => {
    await updateSettings({ focused_task_id: taskId });
    toast.success('Task set as current focus!');
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (tasksLoading || authLoading) {
    return <div className="flex justify-center items-center h-full">Loading focus mode...</div>;
  }

  if (tasksError) {
    return <div className="flex justify-center items-center h-full text-red-500">Error: {tasksError.message}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Focus Mode</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Focus Timer Section */}
        <Card className="flex flex-col items-center justify-center p-6">
          <CardHeader>
            <CardTitle className="text-2xl">Focus Timer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <div className="text-7xl font-bold tabular-nums">
              {formatTime(isFocusTimerActive ? focusTimeRemaining : breakTimeRemaining)}
            </div>
            <Progress value={(isFocusTimerActive ? (focusDuration - focusTimeRemaining) : (breakDuration - breakTimeRemaining)) / (isFocusTimerActive ? focusDuration : breakDuration) * 100} className="w-full max-w-md" />
            <div className="flex space-x-4">
              {!isFocusTimerActive && !isBreakTimerActive && (
                <Button onClick={startFocusTimer} size="lg">
                  <Play className="mr-2 h-5 w-5" /> Start Focus
                </Button>
              )}
              {isFocusTimerActive && (
                <Button onClick={pauseFocusTimer} size="lg" variant="outline">
                  <Pause className="mr-2 h-5 w-5" /> Pause
                </Button>
              )}
              {isFocusTimerActive && (
                <Button onClick={stopFocusTimer} size="lg" variant="destructive">
                  <XCircle className="mr-2 h-5 w-5" /> Stop
                </Button>
              )}
              {!isBreakTimerActive && (isFocusTimerActive || focusTimeRemaining === 0) && (
                <Button onClick={startBreakTimer} size="lg" variant="secondary">
                  <Timer className="mr-2 h-5 w-5" /> Start Break
                </Button>
              )}
              {isBreakTimerActive && (
                <Button onClick={stopBreakTimer} size="lg" variant="destructive">
                  <XCircle className="mr-2 h-5 w-5" /> Stop Break
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="focusDuration">Focus Duration (min):</Label>
              <Input
                id="focusDuration"
                type="number"
                value={focusDuration / 60}
                onChange={(e) => setFocusDuration(parseInt(e.target.value) * 60)}
                className="w-20"
                min="1"
              />
              <Label htmlFor="breakDuration">Break Duration (min):</Label>
              <Input
                id="breakDuration"
                type="number"
                value={breakDuration / 60}
                onChange={(e) => setBreakDuration(parseInt(e.target.value) * 60)}
                className="w-20"
                min="1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Focused Task Section */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle className="text-2xl">Current Focus Task</CardTitle>
          </CardHeader>
          <CardContent>
            {focusedTask ? (
              <div className="space-y-4">
                <TaskItem
                  task={focusedTask}
                  categories={allCategories}
                  onUpdateTask={updateTask}
                  onDeleteTask={deleteTask}
                  onAddSubtask={onAddSubtask}
                  onToggleFocusMode={onToggleFocusMode}
                  onLogDoTodayOff={onLogDoTodayOff}
                />
                <div className="flex space-x-2">
                  <Button onClick={() => handleCompleteTask(focusedTask.id)} variant="success">
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Complete
                  </Button>
                  <Button onClick={() => handleSkipTask(focusedTask.id)} variant="outline">
                    <SkipForward className="mr-2 h-4 w-4" /> Skip Task
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No task currently focused. Select one from the list below.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Focus Mode Task List */}
      <Card className="mt-6 p-6">
        <CardHeader>
          <CardTitle className="text-2xl">Tasks for Focus Mode</CardTitle>
        </CardHeader>
        <CardContent>
          {focusModeTasks.length === 0 ? (
            <p className="text-center text-gray-500">No tasks configured for focus mode. Enable focus mode for sections in settings.</p>
          ) : (
            <div className="space-y-3">
              {focusModeTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between">
                  <TaskItem
                    task={task}
                    categories={allCategories}
                    onUpdateTask={updateTask}
                    onDeleteTask={deleteTask}
                    onAddSubtask={onAddSubtask}
                    onToggleFocusMode={onToggleFocusMode}
                    onLogDoTodayOff={onLogDoTodayOff}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetFocusTask(task.id)}
                    disabled={settings?.focused_task_id === task.id}
                  >
                    Set Focus
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FocusMode;