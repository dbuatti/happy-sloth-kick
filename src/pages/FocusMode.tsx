import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task, TaskSection, Category } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import { Button } from '@/components/ui/button'; // Import Button
import { useNavigate } from 'react-router-dom';
import { Target } from 'lucide-react';

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const {
    allTasks,
    filteredTasks,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    handleAddTask,
    currentDate,
    nextAvailableTask,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
    loading: tasksLoading,
  } = useTasks({ currentDate: new Date(), viewMode: 'focus', userId: demoUserId });

  const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  useEffect(() => {
    if (settings?.focused_task_id) {
      const focusedTask = allTasks.find(t => t.id === settings.focused_task_id);
      if (focusedTask && focusedTask.status === 'to-do') {
        setTaskToOverview(focusedTask);
      } else {
        updateSettings({ focused_task_id: null });
      }
    } else {
      setTaskToOverview(null);
    }
  }, [settings?.focused_task_id, allTasks, updateSettings]);

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsFocusPanelOpen(true);
  }, []);

  const handleMarkDone = async () => {
    if (taskToOverview) {
      await updateTask(taskToOverview.id, { status: 'completed' });
      setIsFullScreenFocus(false);
      setFocusTask(null);
    }
  };

  const handleOpenFocusView = () => {
    if (taskToOverview) {
      setIsFullScreenFocus(true);
    }
  };

  if (tasksLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isFullScreenFocus && taskToOverview) {
    return (
      <FullScreenFocusView
        taskDescription={taskToOverview.description}
        onClose={() => setIsFullScreenFocus(false)}
        onMarkDone={handleMarkDone}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <Target className="h-7 w-7 text-primary" /> Focus Mode
          </CardTitle>
          <p className="text-muted-foreground">
            {taskToOverview ? "You're currently focused on:" : "Select a task to enter deep focus."}
          </p>
        </CardHeader>
        <CardContent className="text-center space-y-6 py-6">
          {taskToOverview ? (
            <>
              <h2 className="text-4xl font-extrabold text-foreground leading-tight">
                {taskToOverview.description}
              </h2>
              <div className="flex justify-center gap-4">
                <Button size="lg" onClick={handleOpenFocusView}>
                  Start Focus Session
                </Button>
                <Button size="lg" variant="outline" onClick={() => handleOpenTaskOverview(taskToOverview)}>
                  View Details
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-lg text-muted-foreground mb-4">No task selected for focus.</p>
              <Button onClick={() => navigate('/daily-tasks')}>
                Select a Task to Focus
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        allTasks={allTasks}
        filteredTasks={filteredTasks}
        updateTask={updateTask}
        onOpenDetail={handleOpenTaskOverview}
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