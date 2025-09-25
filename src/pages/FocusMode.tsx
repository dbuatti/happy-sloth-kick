import React, { useState } from 'react';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const { settings, updateSettings } = useSettings();
  const [currentDate] = useState(new Date());

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
  } = useTasks({ currentDate, userId, viewMode: 'focus' });

  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);
  const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);

  const handleOpenTaskOverview = (task: Task) => {
    // In focus mode, we don't open a separate dialog, but rather the panel
    // and potentially set the task as the next available task.
    // For now, we'll just open the panel.
    setIsFocusPanelOpen(true);
    // If we wanted to highlight this task in the panel, we'd need more state.
  };

  const handleOpenFocusView = () => {
    if (nextAvailableTask) {
      setIsFullScreenFocus(true);
    }
  };

  const handleCloseFocusView = () => {
    setIsFullScreenFocus(false);
  };

  const handleMarkDoneFromFullScreen = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      setIsFullScreenFocus(false);
    }
  };

  useKeyboardShortcuts({
    'f': () => handleOpenFocusView(),
    'escape': () => handleCloseFocusView(),
    'd': () => handleMarkDoneFromFullScreen(),
  });

  if (isFullScreenFocus && nextAvailableTask) {
    return (
      <FullScreenFocusView
        taskDescription={nextAvailableTask.description}
        onClose={handleCloseFocusView}
        onMarkDone={handleMarkDoneFromFullScreen}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden">
      <div className="flex-1 flex items-center justify-center">
        <h2 className="text-2xl font-bold text-center text-muted-foreground">
          Focus Mode is active.
        </h2>
      </div>

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        allTasks={processedTasks}
        filteredTasks={filteredTasks}
        updateTask={updateTask}
        onDeleteTask={deleteTask}
        sections={sections}
        allCategories={allCategories}
        onOpenDetail={handleOpenTaskOverview}
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