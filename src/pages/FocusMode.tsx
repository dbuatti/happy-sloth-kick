import React, { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Target } from 'lucide-react';

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const [currentDate] = useState(new Date());
  const { settings, updateSettings } = useSettings();
  const isMobile = useIsMobile();

  const {
    processedTasks,
    filteredTasks,
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

  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(true);
  const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);

  const handleOpenDetail = (task: any) => {
    // This function is passed to FocusPanelDrawer, which then passes it to TaskOverviewDialog.
    // TaskOverviewDialog expects a task object and will handle opening itself.
    // For now, we'll just log it or pass it through.
    console.log("Opening detail for task:", task);
    // If you have a TaskOverviewDialog in this component's scope, you'd set its state here.
    // Since it's handled within FocusPanelDrawer, we don't need to do anything here.
  };

  const handleStartFullScreenFocus = () => {
    if (nextAvailableTask) {
      setIsFullScreenFocus(true);
      setIsFocusPanelOpen(false); // Close the drawer when full screen is active
    }
  };

  const handleExitFullScreenFocus = () => {
    setIsFullScreenFocus(false);
    setIsFocusPanelOpen(true); // Re-open the drawer when exiting full screen
  };

  const handleMarkFullScreenTaskDone = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      handleExitFullScreenFocus();
    }
  };

  if (isFullScreenFocus && nextAvailableTask) {
    return (
      <FullScreenFocusView
        taskDescription={nextAvailableTask.description}
        onClose={handleExitFullScreenFocus}
        onMarkDone={handleMarkFullScreenTaskDone}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Focus Mode</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Minimize distractions and concentrate on your most important tasks.
        </p>
        <Button
          size="lg"
          onClick={handleStartFullScreenFocus}
          disabled={!nextAvailableTask}
          className="h-12 px-6 text-lg"
        >
          <Target className="mr-2 h-5 w-5" /> Start Focused Work
        </Button>
      </div>

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        allTasks={processedTasks}
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