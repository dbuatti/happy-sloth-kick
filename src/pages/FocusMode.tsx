import React, { useState, useCallback } from 'react';
import { useTasks, Task } from '@/hooks/useTasks';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FocusModeProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ isDemo = false, demoUserId }) => {
  // Removed unused 'user' and 'settings' variables
  const [currentDate] = useState(new Date());
  const navigate = useNavigate();

  const {
    nextAvailableTask,
    processedTasks: allTasks, // Renamed to allTasks for clarity in this component
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

  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(true);

  const handleMarkDone = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      setFocusTask(null); // Clear focus after completing
    }
  };

  const handleCloseFocusView = useCallback(() => {
    setFocusTask(null); // Clear focus when closing the full-screen view
  }, [setFocusTask]);

  const handleOpenDetail = useCallback((_task: Task) => { // Renamed to _task to mark as intentionally unused
    // In focus mode, we don't open a separate dialog, but rather the panel
    // This function is passed to FocusToolsPanel, which then uses it to open TaskOverviewDialog
    // So, this is just a passthrough.
    // The TaskOverviewDialog will be rendered inside the FocusPanelDrawer.
    // For now, we'll just ensure the panel is open and the task is set for overview.
    setIsFocusPanelOpen(true);
    // The FocusToolsPanel will handle setting the task for its internal TaskOverviewDialog
  }, []);

  const handleExitFocusMode = () => {
    setFocusTask(null); // Clear focus task when exiting
    navigate(isDemo ? '/demo/dashboard' : '/dashboard');
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {nextAvailableTask ? (
        <FullScreenFocusView
          taskDescription={nextAvailableTask.description}
          onClose={handleCloseFocusView}
          onMarkDone={handleMarkDone}
        />
      ) : (
        <div className="flex items-center justify-center h-full w-full bg-accent text-accent-foreground p-8 text-center">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">No Focus Task Set</h1>
            <p className="text-xl md:text-2xl">Select a task from the panel to begin focusing.</p>
            <Button size="lg" onClick={handleExitFocusMode} className="mt-8">
              <X className="mr-2 h-6 w-6" /> Exit Focus Mode
            </Button>
          </div>
        </div>
      )}

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        allTasks={allTasks}
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