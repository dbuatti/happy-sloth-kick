import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import FocusToolsPanel from '@/components/FocusToolsPanel';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { useSettings } from '@/context/SettingsContext';

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const [currentDate] = useState(new Date());
  const { settings } = useSettings();

  const {
    processedTasks: allTasks, // Renamed to allTasks for clarity in FocusToolsPanel
    filteredTasks,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    handleAddTask,
    nextAvailableTask,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({ currentDate, viewMode: 'focus', userId: demoUserId });

  const [isFullScreenFocusOpen, setIsFullScreenFocusOpen] = useState(false);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const handleOpenFullScreenFocus = useCallback(() => {
    if (nextAvailableTask) {
      setIsFullScreenFocusOpen(true);
    }
  }, [nextAvailableTask]);

  const handleMarkFullScreenTaskDone = useCallback(async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      setIsFullScreenFocusOpen(false);
      setFocusTask(null); // Clear focus task after completion
    }
  }, [nextAvailableTask, updateTask, setFocusTask]);

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTaskClick = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  if (isFullScreenFocusOpen && nextAvailableTask) {
    return (
      <FullScreenFocusView
        taskDescription={nextAvailableTask.description}
        onClose={() => setIsFullScreenFocusOpen(false)}
        onMarkDone={handleMarkFullScreenTaskDone}
      />
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Focus Mode</CardTitle>
          <p className="text-muted-foreground">
            Minimize distractions and concentrate on your most important tasks.
          </p>
        </CardHeader>
        <CardContent>
          <FocusToolsPanel
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
        </CardContent>
      </Card>

      <TaskOverviewDialog
        task={taskToOverview}
        isOpen={isTaskOverviewOpen}
        onClose={() => setIsTaskOverviewOpen(false)}
        onEditClick={handleEditTaskClick}
        onUpdate={updateTask}
        onDelete={deleteTask}
        sections={sections}
        allTasks={allTasks}
      />
    </div>
  );
};

export default FocusMode;