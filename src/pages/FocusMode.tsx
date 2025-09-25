import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const [currentDate] = useState(new Date());

  const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);

  const {
    processedTasks: allTasks,
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
  } = useTasks({ currentDate, userId, viewMode: 'focus' });

  const handleOpenFocusView = () => {
    if (nextAvailableTask) {
      setIsFullScreenFocus(true);
    }
  };

  const handleMarkDoneAndCloseFocusView = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      setIsFullScreenFocus(false);
    }
  };

  const handleOpenTaskDetail = (task: Task) => {
    // This function is passed to FocusToolsPanel to open TaskOverviewDialog
    // The TaskOverviewDialog itself has an edit button that will open TaskDetailDialog.
    // So, we just need to ensure the TaskOverviewDialog is opened with the correct task.
    // The FocusToolsPanel will handle the state for TaskOverviewDialog.
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <Card className="shadow-lg rounded-xl h-full flex flex-col items-center justify-center text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Focus Mode</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col items-center justify-center space-y-6">
          {loading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          ) : nextAvailableTask ? (
            <>
              <h2 className="text-4xl font-extrabold tracking-tight text-foreground max-w-2xl line-clamp-3">
                {nextAvailableTask.description}
              </h2>
              <Button size="lg" onClick={handleOpenFocusView} className="h-14 px-8 text-lg">
                <Play className="mr-2 h-6 w-6" /> Start Focus
              </Button>
            </>
          ) : (
            <div className="text-center text-muted-foreground text-lg">
              No tasks currently set for focus. Add some tasks or adjust your sections!
            </div>
          )}
        </CardContent>
      </Card>

      {isFullScreenFocus && nextAvailableTask && (
        <FullScreenFocusView
          taskDescription={nextAvailableTask.description}
          onClose={() => setIsFullScreenFocus(false)}
          onMarkDone={handleMarkDoneAndCloseFocusView}
        />
      )}

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        allTasks={allTasks}
        filteredTasks={filteredTasks}
        updateTask={updateTask}
        onOpenDetail={handleOpenTaskDetail}
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