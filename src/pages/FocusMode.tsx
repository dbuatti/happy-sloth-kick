import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import TaskItem from '@/components/tasks/TaskItem';
import { Task, TaskSection, TaskCategory, NewTaskData, UpdateTaskData, FocusModeProps } from '@/types';
import { Progress } from '@/components/ui/progress';
import { format, addMinutes, isPast, isSameDay, startOfDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { Play, Pause, SkipForward, CheckCircle2, XCircle, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FocusMode: React.FC<FocusModeProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const { settings, updateSettings, loading: settingsLoading } = useSettings();

  const {
    tasks,
    categories: allCategories,
    sections: allSections,
    isLoading: tasksLoading,
    error: tasksError,
    addTask,
    updateTask,
    deleteTask,
    onAddSubtask,
    onToggleFocusMode,
  } = useTasks({ userId: currentUserId, isDemo, demoUserId });

  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionType, setSessionType] = useState<'focus' | 'break'>('focus');
  const [isSessionCompleteDialogOpen, setIsSessionCompleteDialogOpen] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');

  const focusedTask = useMemo(() => {
    return tasks?.find(task => task.id === settings?.focused_task_id);
  }, [tasks, settings?.focused_task_id]);

  const focusModeTasks = useMemo(() => {
    return tasks?.filter(task =>
      task.status !== 'completed' &&
      task.status !== 'archived' &&
      allSections.some(section => section.id === task.section_id && section.include_in_focus_mode)
    ).sort((a, b) => (a.order || 0) - (b.order || 0)) || [];
  }, [tasks, allSections]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      interval = setInterval(() => {
        if (timerSeconds > 0) {
          setTimerSeconds(prev => prev - 1);
        } else if (timerMinutes > 0) {
          setTimerMinutes(prev => prev - 1);
          setTimerSeconds(59);
        } else {
          // Timer finished
          setIsActive(false);
          setIsSessionCompleteDialogOpen(true);
          // TODO: Log focus session
        }
      }, 1000);
    } else if (!isActive && timerMinutes === 0 && timerSeconds === 0) {
      // Timer was reset or completed
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timerMinutes, timerSeconds]);

  const handleStartPause = () => {
    setIsActive(prev => !prev);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimerMinutes(25);
    setTimerSeconds(0);
    setSessionType('focus');
  };

  const handleSkipTask = async (taskId: string) => {
    await updateSettings({ focused_task_id: null });
    toast.success('Task skipped!');
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateTask(taskId, { status: 'completed' });
      await updateSettings({ focused_task_id: null });
      toast.success('Task completed!');
    } catch (error) {
      toast.error('Failed to complete task.');
      console.error(error);
    }
  };

  const handleSessionCompleteClose = () => {
    setIsSessionCompleteDialogOpen(false);
    setSessionNotes('');
    handleReset();
  };

  const handleSaveSessionNotes = () => {
    // TODO: Save session notes to a journal or log
    toast.success('Session notes saved!');
    handleSessionCompleteClose();
  };

  const progressPercentage = useMemo(() => {
    const totalDuration = 25 * 60; // Assuming 25 min focus sessions
    const elapsedSeconds = (25 - timerMinutes) * 60 + (60 - timerSeconds);
    return (elapsedSeconds / totalDuration) * 100;
  }, [timerMinutes, timerSeconds]);

  if (isLoading || settingsLoading) {
    return <p>Loading focus mode...</p>;
  }

  if (tasksError) {
    return <p>Error loading tasks: {tasksError.message}</p>;
  }

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Focus Mode</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Focus Timer Section */}
        <Card className="flex flex-col items-center justify-center p-6">
          <CardHeader>
            <CardTitle className="text-2xl">Focus Timer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <div className="text-7xl font-bold tabular-nums">
              {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
            </div>
            <Progress value={progressPercentage} className="w-full max-w-sm" />
            <div className="flex space-x-4">
              <Button onClick={handleStartPause} size="lg">
                {isActive ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                {isActive ? 'Pause' : 'Start'}
              </Button>
              <Button onClick={handleReset} variant="outline" size="lg">
                <XCircle className="mr-2 h-5 w-5" /> Reset
              </Button>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              <span>{sessionType === 'focus' ? 'Focus Session' : 'Break'}</span>
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
                  categories={allCategories || []}
                  sections={allSections || []}
                  onUpdateTask={updateTask}
                  onDeleteTask={deleteTask}
                  onAddSubtask={onAddSubtask}
                  onToggleFocusMode={onToggleFocusMode}
                  onLogDoTodayOff={onLogDoTodayOff}
                />
                <div className="flex space-x-2">
                  <Button onClick={() => handleCompleteTask(focusedTask.id)} variant="default">
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Complete
                  </Button>
                  <Button onClick={() => handleSkipTask(focusedTask.id)} variant="outline">
                    <SkipForward className="mr-2 h-4 w-4" /> Skip Task
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No task currently focused. Select one from the list below.</p>
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
            <p className="text-muted-foreground">No tasks configured for focus mode. Enable "Include in Focus Mode" for sections in Manage Sections.</p>
          ) : (
            <div className="space-y-3">
              {focusModeTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  categories={allCategories || []}
                  sections={allSections || []}
                  onUpdateTask={updateTask}
                  onDeleteTask={deleteTask}
                  onAddSubtask={onAddSubtask}
                  onToggleFocusMode={onToggleFocusMode}
                  onLogDoTodayOff={onLogDoTodayOff}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isSessionCompleteDialogOpen} onOpenChange={setIsSessionCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Complete!</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p>Great job! Your {sessionType} session has ended.</p>
            <Label htmlFor="session-notes">Notes for this session (optional)</Label>
            <Textarea
              id="session-notes"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="What did you accomplish? Any distractions?"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={handleSessionCompleteClose}>
              Close
            </Button>
            <Button onClick={handleSaveSessionNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FocusMode;