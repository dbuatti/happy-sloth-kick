import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Check, X, Lightbulb, Timer } from 'lucide-react';
import TaskItem from '@/components/TaskItem';
import { Task, TaskSection } from '@/types';
import { Progress } from '@/components/ui/progress';
import { format, addMinutes, isPast, isSameDay, startOfDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';

const FocusMode = () => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const { settings, updateSettings } = useSettings();
  const {
    tasks,
    categories: allCategories,
    sections,
    loading,
    error,
    updateTask,
    deleteTask,
    addTask,
    onToggleFocusMode,
    onLogDoTodayOff,
  } = useTasks({ userId: currentUserId! });

  const [isMeditationModalOpen, setIsMeditationModalOpen] = useState(false);
  const [meditationNotes, setMeditationNotes] = useState(settings?.meditation_notes || '');

  const [isBreakTimerActive, setIsBreakTimerActive] = useState(false);
  const [breakTimeRemaining, setBreakTimeRemaining] = useState(0); // in seconds
  const [breakDuration, setBreakDuration] = useState(5 * 60); // Default 5 minutes

  const focusModeSections = useMemo(() => {
    return (sections as TaskSection[]).filter(section => section.include_in_focus_mode);
  }, [sections]);

  const focusModeTasks = useMemo(() => {
    const focusSectionIds = new Set(focusModeSections.map(s => s.id));
    return tasks.filter(task =>
      task.status !== 'completed' &&
      task.parent_task_id === null &&
      task.section_id &&
      focusSectionIds.has(task.section_id)
    ).sort((a, b) => {
      const priorityOrder: { [key: string]: number } = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3, 'none': 4 };
      const aPriority = priorityOrder[a.priority || 'none'];
      const bPriority = priorityOrder[b.priority || 'none'];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [tasks, focusModeSections]);

  const focusedTask = useMemo(() => {
    if (settings?.focused_task_id) {
      return tasks.find(task => task.id === settings.focused_task_id);
    }
    return focusModeTasks[0] || null;
  }, [settings?.focused_task_id, focusModeTasks, tasks]);

  const handleCompleteTask = async (taskId: string) => {
    await updateTask(taskId, { status: 'completed' });
    if (settings?.focused_task_id === taskId) {
      await updateSettings({ focused_task_id: null });
    }
    toast.success('Task completed! Great job!');
  };

  const handleSkipTask = async (taskId: string) => {
    await updateSettings({ focused_task_id: null });
    toast('Task skipped for now.', { icon: '👋' });
  };

  const handleSetFocusedTask = async (taskId: string) => {
    await updateSettings({ focused_task_id: taskId });
    toast.success('New task focused!');
  };

  const handleSaveMeditationNotes = async () => {
    await updateSettings({ meditation_notes: meditationNotes });
    setIsMeditationModalOpen(false);
    toast.success('Meditation notes saved!');
  };

  const startBreakTimer = () => {
    setBreakTimeRemaining(breakDuration);
    setIsBreakTimerActive(true);
    toast.info(`Starting a ${breakDuration / 60}-minute break!`);
  };

  const stopBreakTimer = () => {
    setIsBreakTimerActive(false);
    setBreakTimeRemaining(0);
    toast.info('Break timer stopped.');
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isBreakTimerActive && breakTimeRemaining > 0) {
      timer = setInterval(() => {
        setBreakTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (breakTimeRemaining === 0 && isBreakTimerActive) {
      setIsBreakTimerActive(false);
      toast.success('Break time is over! Back to focus!');
    }
    return () => clearInterval(timer);
  }, [isBreakTimerActive, breakTimeRemaining]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderSubtasks = (parentTaskId: string) => {
    const subtasks = tasks.filter(sub => sub.parent_task_id === parentTaskId);
    return (
      <div className="ml-4 border-l pl-4 space-y-2">
        {subtasks.map(subtask => (
          <TaskItem
            key={subtask.id}
            task={subtask}
            categories={allCategories}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onAddSubtask={async (description) => { await addTask(description, null, parentTaskId, null, null, 'medium'); }}
            onToggleFocusMode={onToggleFocusMode}
            onLogDoTodayOff={onLogDoTodayOff}
            isFocusedTask={settings?.focused_task_id === subtask.id}
            subtasks={[]}
            renderSubtasks={() => null}
          />
        ))}
      </div>
    );
  };

  if (loading) return <div className="text-center py-8">Loading focus mode...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error.message}</div>;

  return (
    <div className="container mx-auto p-4 h-full flex flex-col">
      <h1 className="text-3xl font-bold mb-6">Focus Mode</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
        {/* Current Focus Task */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Current Focus</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setIsMeditationModalOpen(true)}>
                <Lightbulb className="h-4 w-4 mr-2" /> Meditation Notes
              </Button>
              <Button variant="outline" onClick={isBreakTimerActive ? stopBreakTimer : startBreakTimer}>
                <Timer className="h-4 w-4 mr-2" /> {isBreakTimerActive ? `Stop Break (${formatTime(breakTimeRemaining)})` : 'Start Break'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col justify-center items-center p-6">
            {focusedTask ? (
              <div className="w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-4 text-center">{focusedTask.description}</h2>
                <div className="space-y-2">
                  <TaskItem
                    key={focusedTask.id}
                    task={focusedTask}
                    categories={allCategories}
                    onUpdateTask={updateTask}
                    onDeleteTask={deleteTask}
                    onAddSubtask={async (description) => { await addTask(description, null, focusedTask.id, null, null, 'medium'); }}
                    onToggleFocusMode={onToggleFocusMode}
                    onLogDoTodayOff={onLogDoTodayOff}
                    isFocusedTask={true}
                    subtasks={tasks.filter(sub => sub.parent_task_id === focusedTask.id)}
                    renderSubtasks={renderSubtasks}
                  />
                </div>
                <div className="flex justify-center space-x-4 mt-6">
                  <Button size="lg" onClick={() => handleCompleteTask(focusedTask.id)}>
                    <Check className="h-5 w-5 mr-2" /> Mark Complete
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => handleSkipTask(focusedTask.id)}>
                    <X className="h-5 w-5 mr-2" /> Skip for Now
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p className="text-lg mb-2">No tasks currently in focus mode.</p>
                <p className="text-sm">Add tasks to focus mode sections or select one from the list.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Focus Tasks */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Upcoming Focus Tasks</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-y-auto space-y-3">
            {focusModeTasks.filter(task => task.id !== focusedTask?.id).length === 0 ? (
              <p className="text-center text-gray-500 py-8">No upcoming tasks in focus mode sections.</p>
            ) : (
              focusModeTasks.filter(task => task.id !== focusedTask?.id).map(task => (
                <div key={task.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50">
                  <TaskItem
                    task={task}
                    categories={allCategories}
                    onUpdateTask={updateTask}
                    onDeleteTask={deleteTask}
                    onAddSubtask={async (description) => { await addTask(description, null, task.id, null, null, 'medium'); }}
                    onToggleFocusMode={onToggleFocusMode}
                    onLogDoTodayOff={onLogDoTodayOff}
                    isFocusedTask={false}
                    subtasks={[]}
                    renderSubtasks={() => null}
                  />
                  <Button variant="ghost" size="sm" onClick={() => handleSetFocusedTask(task.id)}>
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Meditation Notes Modal */}
      <Dialog open={isMeditationModalOpen} onOpenChange={setIsMeditationModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Meditation Notes</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Jot down any insights, feelings, or observations from your meditation session..."
              value={meditationNotes || ''}
              onChange={(e) => setMeditationNotes(e.target.value)}
              rows={8}
            />
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSaveMeditationNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FocusMode;