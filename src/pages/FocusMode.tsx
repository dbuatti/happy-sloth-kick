import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import { Target } from 'lucide-react';
import TaskOverviewDialog from '@/components/TaskOverviewDialog'; // Added missing import

interface FocusModeProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate] = useState(new Date());
  const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const {
    processedTasks,
    filteredTasks,
    nextAvailableTask,
    loading,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    handleAddTask,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({ currentDate, viewMode: 'focus', userId: demoUserId });

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleOpenFullScreenFocus = useCallback(() => {
    if (nextAvailableTask) {
      setIsFullScreenFocus(true);
    }
  }, [nextAvailableTask]);

  const handleMarkFullScreenTaskDone = useCallback(async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      setIsFullScreenFocus(false);
    }
  }, [nextAvailableTask, updateTask]);

  return (
    <div className="flex-1 space-y-4 p-4 lg:p-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" /> Focus Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold text-muted-foreground mb-4">
                {nextAvailableTask ? "Your next task is ready!" : "No tasks to focus on right now."}
              </h3>
              {nextAvailableTask && (
                <p className="text-3xl font-bold text-foreground mb-6">
                  {nextAvailableTask.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Use the Focus Tools panel on the right to manage your tasks and access mindfulness tools.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <FocusPanelDrawer
        isOpen={true} // Always open in Focus Mode
        onClose={() => {}} // No-op as it's always open
        nextAvailableTask={nextAvailableTask}
        allTasks={processedTasks}
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

      {isFullScreenFocus && nextAvailableTask && (
        <FullScreenFocusView
          taskDescription={nextAvailableTask.description}
          onClose={() => setIsFullScreenFocus(false)}
          onMarkDone={handleMarkFullScreenTaskDone}
        />
      )}

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleOpenTaskOverview} // Pass itself for editing
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allTasks={processedTasks}
        />
      )}
    </div>
  );
};

export default FocusMode;