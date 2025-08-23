import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import TaskItem from '@/components/tasks/TaskItem';
import { Task, TaskSection, TaskCategory, NewTaskData, UpdateTaskData, FocusModeProps, UserSettings } from '@/types';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipForward, CheckCircle2, XCircle, Timer } from 'lucide-react';
import { format, addMinutes, isPast, isSameDay, startOfDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import FocusToolsPanel from '@/components/FocusToolsPanel';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';

const FocusMode: React.FC<FocusModeProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const navigate = useNavigate();

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
    doTodayOffLog,
  } = useTasks({ userId: currentUserId, isDemo, demoUserId });

  const {
    settings,
    isLoading: settingsLoading,
    error: settingsError,
    updateSettings,
  } = useSettings();

  const [timerDuration, setTimerDuration] = useState(25 * 60); // 25 minutes in seconds
  const [timeRemaining, setTimeRemaining] = useState(timerDuration);
  const [isActive, setIsActive] = useState(false);
  const [sessionType, setSessionType] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');

  const focusedTask = useMemo(() => {
    if (!settings?.focused_task_id || !tasks) return null;
    return tasks.find(t => t.id === settings.focused_task_id);
  }, [settings?.focused_task_id, tasks]);

  const focusModeTasks = useMemo(() => {
    if (!tasks || !allSections) return [];
    return tasks.filter((task: Task) =>
      task.status !== 'completed' &&
      task.status !== 'archived' &&
      allSections.some((section: TaskSection) => section.id === task.section_id && (section.include_in_focus_mode ?? true))
    ).sort((a: Task, b: Task) => (a.order || 0) - (b.order || 0)) || [];
  }, [tasks, allSections]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      setIsActive(false);
      toast.success(`${sessionType === 'focus' ? 'Focus session' : 'Break'} completed!`);
      // Logic to switch session type or notify user
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeRemaining, sessionType]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeRemaining(timerDuration);
  };

  const handleSkipTask = async (taskId: string) => {
    await updateSettings({ focused_task_id: null });
    toast.info('Task skipped. Pick a new one!');
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateTask({ id: taskId, updates: { status: 'completed' } });
      await updateSettings({ focused_task_id: null });
      toast.success('Task completed and removed from focus!');
    } catch (error) {
      toast.error('Failed to complete task.');
      console.error('Error completing task:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (tasksLoading || settingsLoading) {
    return <p className="p-4 text-center">Loading focus mode...</p>;
  }

  if (tasksError || settingsError) {
    return <p className="p-4 text-red-500">Error: {tasksError?.message || settingsError?.message}</p>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Focus Mode</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">
                {focusedTask ? focusedTask.description : 'Select a task to focus on'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-4">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <Progress value={(timeRemaining / timerDuration) * 100} className="absolute w-full h-full rounded-full" />
                <span className="text-5xl font-bold z-10">{formatTime(timeRemaining)}</span>
              </div>
              <div className="flex space-x-4">
                <Button onClick={toggleTimer} disabled={!focusedTask}>
                  {isActive ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {isActive ? 'Pause' : 'Start'}
                </Button>
                <Button variant="outline" onClick={resetTimer}>
                  <Timer className="mr-2 h-4 w-4" /> Reset
                </Button>
              </div>
              {focusedTask && (
                <div className="flex space-x-4 mt-4">
                  <Button variant="secondary" onClick={() => handleSkipTask(focusedTask.id)}>
                    <SkipForward className="mr-2 h-4 w-4" /> Skip Task
                  </Button>
                  <Button variant="default" onClick={() => handleCompleteTask(focusedTask.id)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Complete Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tasks in Focus Mode Sections</CardTitle>
            </CardHeader>
            <CardContent>
              {focusModeTasks.length === 0 ? (
                <p className="text-muted-foreground">No tasks found in focus mode sections. Add tasks to sections and enable "Include in Focus Mode" for those sections.</p>
              ) : (
                <div className="space-y-2">
                  {focusModeTasks.map((task: Task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      categories={allCategories || []}
                      sections={allSections || []}
                      onUpdateTask={updateTask}
                      onDeleteTask={deleteTask}
                      onAddSubtask={addTask}
                      onToggleFocusMode={onToggleFocusMode}
                      onLogDoTodayOff={onLogDoTodayOff}
                      tasks={tasks}
                      doTodayOffLog={doTodayOffLog}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <FocusToolsPanel
            focusedTask={focusedTask}
            focusModeTasks={focusModeTasks}
            allCategories={allCategories || []}
            allSections={allSections || []}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onAddSubtask={addTask}
            onToggleFocusMode={onToggleFocusMode}
            onLogDoTodayOff={onLogDoTodayOff}
            onCompleteTask={handleCompleteTask}
            onSkipTask={handleSkipTask}
            doTodayOffLog={doTodayOffLog}
          />
        </div>
      </div>
    </div>
  );
};

export default FocusMode;