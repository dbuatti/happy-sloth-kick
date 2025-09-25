import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import FocusToolsPanel from '@/components/FocusToolsPanel';
import { Button } from '@/components/ui/button'; // Added missing import

interface FocusModeProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate] = useState(new Date());
  const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(true); // Panel is open by default in Focus Mode
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const {
    processedTasks,
    filteredTasks,
    loading,
    nextAvailableTask,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    handleAddTask,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({ currentDate, viewMode: 'focus', userId: demoUserId });

  const handleOpenFullScreenFocus = useCallback(() => {
    if (nextAvailableTask) {
      setIsFullScreenFocus(true);
    }
  }, [nextAvailableTask]);

  const handleCloseFullScreenFocus = useCallback(() => {
    setIsFullScreenFocus(false);
  }, []);

  const handleMarkTaskDoneFromFullScreen = useCallback(async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      setIsFullScreenFocus(false);
    }
  }, [nextAvailableTask, updateTask]);

  const handleOpenTaskDetail = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isFullScreenFocus && nextAvailableTask) {
    return (
      <FullScreenFocusView
        taskDescription={nextAvailableTask.description}
        onClose={handleCloseFullScreenFocus}
        onMarkDone={handleMarkTaskDoneFromFullScreen}
      />
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6 flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <Card className="w-full shadow-lg rounded-xl h-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold flex items-center gap-2">
              Focus Mode
            </CardTitle>
            <p className="text-muted-foreground">Deep work session for your most important tasks.</p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-6">
            {nextAvailableTask ? (
              <>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6">
                  {nextAvailableTask.description}
                </h2>
                <div className="flex justify-center gap-4 mt-6">
                  <Button size="lg" onClick={handleOpenFullScreenFocus} className="h-12 px-6 text-lg">
                    Go Fullscreen
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => handleOpenTaskDetail(nextAvailableTask)} className="h-12 px-6 text-lg">
                    Details
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground text-lg">
                No tasks currently set for focus. Add some tasks or set a task as focus.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <FocusToolsPanel
        nextAvailableTask={nextAvailableTask}
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

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleOpenTaskDetail} // Pass itself to allow re-opening with edit form
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