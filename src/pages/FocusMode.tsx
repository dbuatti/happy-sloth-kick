import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Brain } from 'lucide-react';

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const [currentDate] = useState(new Date());
  const { settings, updateSettings } = useSettings();
  const isMobile = useIsMobile();

  const {
    processedTasks, // Use processedTasks instead of allTasks
    filteredTasks,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    handleAddTask,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({ currentDate, viewMode: 'focus', userId: demoUserId });

  const [isFullScreenFocusActive, setIsFullScreenFocusActive] = useState(false);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);

  const focusedTask = useMemo(() => {
    if (settings?.focused_task_id) {
      const task = processedTasks.find((t: Task) => t.id === settings.focused_task_id);
      if (task && task.status === 'to-do') {
        return task;
      }
    }
    return null;
  }, [settings?.focused_task_id, processedTasks]);

  useEffect(() => {
    if (isFullScreenFocusActive && !focusedTask) {
      setIsFullScreenFocusActive(false);
    }
  }, [isFullScreenFocusActive, focusedTask]);

  const handleMarkDone = useCallback(async () => {
    if (focusedTask) {
      await updateTask(focusedTask.id, { status: 'completed' });
      await setFocusTask(null);
      setIsFullScreenFocusActive(false);
    }
  }, [focusedTask, updateTask, setFocusTask]);

  const handleOpenDetail = useCallback((task: Task) => {
    // This function is passed to FocusToolsPanel, which then opens TaskOverviewDialog
    // For now, we'll just log it, as TaskOverviewDialog is handled within FocusToolsPanel
    console.log('Opening detail for task:', task.description);
  }, []);

  const handleOpenFocusView = useCallback(() => {
    if (focusedTask) {
      setIsFullScreenFocusActive(true);
    }
  }, [focusedTask]);

  if (isFullScreenFocusActive && focusedTask) {
    return (
      <FullScreenFocusView
        taskDescription={focusedTask.description}
        onClose={() => setIsFullScreenFocusActive(false)}
        onMarkDone={handleMarkDone}
      />
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Focus Mode</h2>
        <Button variant="outline" onClick={() => setIsFocusPanelOpen(true)} className="h-9">
          <Brain className="mr-2 h-4 w-4" /> Open Focus Tools
        </Button>
      </div>

      <Card className="w-full h-[calc(100vh-150px)] flex items-center justify-center text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            {focusedTask ? "Your Focused Task" : "No Task in Focus"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4">
          {focusedTask ? (
            <>
              <p className="text-xl text-muted-foreground">{focusedTask.description}</p>
              <Button onClick={handleOpenFocusView} className="h-10 text-base">
                Start Focus Session
              </Button>
              <Button variant="outline" onClick={() => setFocusTask(null)} className="h-9 text-base">
                Clear Focus
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">
              Select a task from your daily tasks or the focus panel to begin.
            </p>
          )}
        </CardContent>
      </Card>

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={focusedTask}
        allTasks={processedTasks} // Pass processedTasks
        filteredTasks={filteredTasks}
        updateTask={updateTask}
        onOpenDetail={handleOpenDetail}
        onDeleteTask={deleteTask}
        sections={sections}
        allCategories={allCategories}
        handleAddTask={handleAddTask}
        currentDate={currentDate}
        setFocusTask={setFocusTask}
        doTodayOffIds={doTodayOffIds}
        toggleDoToday={toggleDoToday}
      />
    </div>
  );
};

export default FocusMode;