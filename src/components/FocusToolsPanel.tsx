import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, SkipForward, CheckCircle2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskSection, TaskCategory, UpdateTaskData, DoTodayOffLogEntry } from '@/types';
import TaskOverviewDialog from './TaskOverviewDialog';
import { useSound } from '@/context/SoundContext';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'react-hot-toast';

interface FocusToolsPanelProps {
  focusedTask: Task | null;
  focusModeTasks: Task[];
  allCategories: TaskCategory[];
  allSections: TaskSection[];
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  onCompleteTask: (taskId: string) => Promise<void>;
  onSkipTask: (taskId: string) => Promise<void>;
  doTodayOffLog: DoTodayOffLogEntry[] | undefined;
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
  onCompleteTask,
  onSkipTask,
  doTodayOffLog,
}) => {
  const { playSound } = useSound();
  const { updateSettings } = useSettings();
  const [selectedTaskForOverview, setSelectedTaskForOverview] = useState<Task | null>(null);

  const handleSkipTask = async (taskId: string) => {
    await onSkipTask(taskId);
  };

  const handleCompleteTask = async (taskId: string) => {
    await onCompleteTask(taskId);
  };

  const openTaskOverview = (task: Task) => {
    setSelectedTaskForOverview(task);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Focus Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {focusedTask ? (
            <div className="space-y-2">
              <Button className="w-full" onClick={() => openTaskOverview(focusedTask)}>
                <Eye className="mr-2 h-4 w-4" /> View Focused Task
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => handleSkipTask(focusedTask.id)}>
                <SkipForward className="mr-2 h-4 w-4" /> Skip Task
              </Button>
              <Button className="w-full" onClick={() => handleCompleteTask(focusedTask.id)}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Complete Task
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">No task currently focused. Select one from the list.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {focusModeTasks.length === 0 ? (
            <p className="text-muted-foreground">No tasks available in focus mode sections.</p>
          ) : (
            <div className="space-y-2">
              {focusModeTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 border rounded-md">
                  <span className="text-sm">{task.description}</span>
                  <Button variant="ghost" size="sm" onClick={() => updateSettings({ focused_task_id: task.id })}>
                    Focus
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTaskForOverview && (
        <TaskOverviewDialog
          task={selectedTaskForOverview}
          isOpen={!!selectedTaskForOverview}
          onOpenChange={(open) => !open && setSelectedTaskForOverview(null)}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onAddSubtask={onAddSubtask}
          onToggleFocusMode={onToggleFocusMode}
          onLogDoTodayOff={onLogDoTodayOff}
          categories={allCategories}
          sections={allSections}
        />
      )}
    </div>
  );
};

export default FocusToolsPanel;