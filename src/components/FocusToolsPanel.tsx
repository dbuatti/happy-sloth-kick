import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, SkipForward, CheckCircle2, XCircle, Timer, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskSection, TaskCategory, UpdateTaskData } from '@/types';
import TaskOverviewDialog from './TaskOverviewDialog';
import { useSound } from '@/context/SoundContext';
import { toast } from 'react-hot-toast';
import { useSettings } from '@/context/SettingsContext';

interface FocusToolsPanelProps {
  focusedTask: Task | undefined;
  focusModeTasks: Task[];
  allCategories: TaskCategory[];
  allSections: TaskSection[];
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
}

const FocusToolsPanel: React.FC<FocusToolsPanelProps> = ({
  focusedTask,
  focusModeTasks,
  allCategories,
  allSections,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
}) => {
  const { playSound } = useSound();
  const { updateSettings } = useSettings();

  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionType, setSessionType] = useState<'focus' | 'break'>('focus');
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [selectedTaskForOverview, setSelectedTaskForOverview] = useState<Task | null>(null);

  const progressPercentage = useMemo(() => {
    const totalDuration = 25 * 60; // Assuming 25 min focus sessions
    const elapsedSeconds = (25 - timerMinutes) * 60 + (60 - timerSeconds);
    return (elapsedSeconds / totalDuration) * 100;
  }, [timerMinutes, timerSeconds]);

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
      await onUpdateTask(taskId, { status: 'completed' });
      await updateSettings({ focused_task_id: null });
      toast.success('Task completed!');
    } catch (error) {
      toast.error('Failed to complete task.');
      console.error(error);
    }
  };

  const openTaskOverview = (task: Task) => {
    setSelectedTaskForOverview(task);
    setIsTaskOverviewOpen(true);
  };

  return (
    <div className="space-y-6">
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
                categories={allCategories}
                sections={allSections}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
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

      {/* Task Overview Dialog */}
      {selectedTaskForOverview && (
        <TaskOverviewDialog
          isOpen={isTaskOverviewOpen}
          onOpenChange={setIsTaskOverviewOpen}
          task={selectedTaskForOverview}
          categories={allCategories}
          sections={allSections}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onAddSubtask={onAddSubtask}
          onToggleFocusMode={onToggleFocusMode}
          onLogDoTodayOff={onLogDoTodayOff}
        />
      )}
    </div>
  );
};

export default FocusToolsPanel;