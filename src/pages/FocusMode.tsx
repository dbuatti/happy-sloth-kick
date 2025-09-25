import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import FocusToolsPanel from '@/components/FocusToolsPanel';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import MiniBreathingBubble from '@/components/MiniBreathingBubble';
import PomodoroTimer from '@/components/PomodoroTimer';

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const [currentDate] = useState(new Date());
  const { settings } = useSettings(); // Keep settings as it's used for schedule_show_focus_tasks_only in useTaskProcessing
  const isMobile = useIsMobile();

  const {
    tasks: allTasks,
    processedTasks,
    filteredTasks,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    handleAddTask,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    loading: tasksLoading,
  } = useTasks({ currentDate, viewMode: 'focus', userId: demoUserId });

  const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);

  const focusedTask = useMemo(() => {
    const focusedTaskId = settings?.focused_task_id;
    if (!focusedTaskId) return null;
    return processedTasks.find(task => task.id === focusedTaskId) || null;
  }, [settings?.focused_task_id, processedTasks]);

  const handleMarkFocusedTaskDone = useCallback(async () => {
    if (focusedTask) {
      await updateTask(focusedTask.id, { status: 'completed' });
      await setFocusTask(null); // Clear focus after completion
      setIsFullScreenFocus(false);
    }
  }, [focusedTask, updateTask, setFocusTask]);

  const handleOpenTaskDetail = useCallback((task: Task) => {
    // In focus mode, we don't open a dialog for task details directly from here.
    // The FocusToolsPanel handles its own task detail dialog.
    // This callback is primarily for consistency with other components.
    console.log("Opening task detail from FocusMode (handled by FocusToolsPanel):", task.description);
  }, []);

  if (tasksLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isFullScreenFocus && focusedTask) {
    return (
      <FullScreenFocusView
        taskDescription={focusedTask.description}
        onClose={() => setIsFullScreenFocus(false)}
        onMarkDone={handleMarkFocusedTaskDone}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Focus Mode</h1>
        {focusedTask && (
          <Button variant="outline" onClick={() => setFocusTask(null)}>
            <X className="mr-2 h-4 w-4" /> Clear Focused Task
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg rounded-xl p-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold">Current Focus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {focusedTask ? (
                <div className="flex flex-col items-center text-center space-y-4">
                  <h2 className="text-4xl font-extrabold text-primary leading-tight">
                    {focusedTask.description}
                  </h2>
                  {focusedTask.notes && (
                    <p className="text-lg text-muted-foreground max-w-prose">
                      {focusedTask.notes}
                    </p>
                  )}
                  <div className="flex gap-4 mt-4">
                    <Button size="lg" onClick={() => setIsFullScreenFocus(true)}>
                      Go Fullscreen
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => handleOpenTaskDetail(focusedTask)}>
                      Details
                    </Button>
                    <Button size="lg" variant="secondary" onClick={handleMarkFocusedTaskDone}>
                      Mark Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-lg text-muted-foreground mb-4">
                    No task is currently set as your focus.
                  </p>
                  <Button onClick={() => navigate('/daily-tasks')}>
                    Select a Task to Focus
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MiniBreathingBubble />
            <PomodoroTimer />
          </div>
        </div>

        <div className="lg:col-span-1">
          <FocusToolsPanel
            nextAvailableTask={focusedTask} // Pass focusedTask as nextAvailableTask for consistency
            allTasks={processedTasks}
            filteredTasks={filteredTasks}
            updateTask={updateTask}
            onDeleteTask={deleteTask}
            sections={sections}
            allCategories={allCategories}
            onOpenDetail={handleOpenTaskDetail}
            handleAddTask={handleAddTask}
            currentDate={currentDate}
            setFocusTask={setFocusTask}
            doTodayOffIds={doTodayOffIds}
            toggleDoToday={toggleDoToday}
          />
        </div>
      </div>
    </div>
  );
};

export default FocusMode;