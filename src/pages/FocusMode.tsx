import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useTasks, Task, TaskSection, Category } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { useSettings } from '@/context/SettingsContext';

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const [currentDate] = useState(new Date());
  const { settings, updateSettings } = useSettings();

  const {
    processedTasks: allTasks, // Renamed to allTasks for clarity in this context
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
  } = useTasks({ currentDate, viewMode: 'focus', userId });

  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(true);
  const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);

  const handleOpenTaskDetail = (task: Task) => {
    // This function would typically open a TaskDetailDialog
    // For now, we'll just log it or set a state if a dialog exists
    console.log('Opening task detail for:', task.description);
  };

  const handleOpenFullScreenFocus = () => {
    if (nextAvailableTask) {
      setIsFullScreenFocus(true);
      setIsFocusPanelOpen(false); // Close panel when full screen is active
    }
  };

  const handleMarkFullScreenTaskDone = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      setIsFullScreenFocus(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 pt-6 md:p-8 md:pt-12">
      <h2 className="text-3xl font-bold tracking-tight mb-6">Focus Mode</h2>

      <Card className="flex-1 flex items-center justify-center p-6">
        {loading ? (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        ) : (
          <div className="text-center space-y-4">
            {nextAvailableTask ? (
              <>
                <h3 className="text-2xl font-semibold text-foreground">
                  Your next task:
                </h3>
                <p className="text-4xl font-extrabold text-primary leading-tight">
                  {nextAvailableTask.description}
                </p>
                <p className="text-muted-foreground text-lg">
                  Ready to dive in?
                </p>
                <div className="flex justify-center gap-4 mt-6">
                  <button
                    onClick={handleOpenFullScreenFocus}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg text-lg font-semibold hover:bg-primary/90 transition-colors shadow-md"
                  >
                    Start Focus
                  </button>
                  <button
                    onClick={() => handleOpenTaskDetail(nextAvailableTask)}
                    className="px-6 py-3 border border-input bg-background rounded-lg text-lg font-semibold hover:bg-accent hover:text-accent-foreground transition-colors shadow-md"
                  >
                    Details
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xl text-muted-foreground">
                No tasks currently available for focus. Great job!
              </p>
            )}
          </div>
        )}
      </Card>

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

      {isFullScreenFocus && nextAvailableTask && (
        <FullScreenFocusView
          taskDescription={nextAvailableTask.description}
          onClose={() => setIsFullScreenFocus(false)}
          onMarkDone={handleMarkFullScreenTaskDone}
        />
      )}
    </div>
  );
};

export default FocusMode;