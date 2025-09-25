import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import { useIsMobile } from '@/hooks/use-mobile';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import { Button } from '@/components/ui/button';
import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const [currentDate] = useState(new Date());
  const { settings } = useSettings();
  const isMobile = useIsMobile();

  const {
    processedTasks: allTasks,
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

  const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);

  const handleOpenFocusView = () => {
    if (nextAvailableTask) {
      setIsFullScreenFocus(true);
    }
  };

  const handleMarkDoneAndCloseFocus = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      setIsFullScreenFocus(false);
      setFocusTask(null); // Clear focus after completion
    }
  };

  const handleOpenDetail = (task: any) => {
    // This function is passed to FocusToolsPanel, which then passes it to TaskOverviewDialog.
    // For now, we'll just log it or implement a placeholder.
    console.log("Open task detail for:", task);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      {isFullScreenFocus && nextAvailableTask ? (
        <FullScreenFocusView
          taskDescription={nextAvailableTask.description}
          onClose={() => setIsFullScreenFocus(false)}
          onMarkDone={handleMarkDoneAndCloseFocus}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center space-y-6">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground">
            Focus Mode
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
            Eliminate distractions and concentrate on your most important tasks.
          </p>
          {nextAvailableTask ? (
            <div className="space-y-4">
              <p className="text-2xl font-bold text-primary">
                Next: {nextAvailableTask.description}
              </p>
              <Button size="lg" onClick={handleOpenFocusView} className="h-14 px-8 text-lg">
                <Brain className="mr-2 h-6 w-6" /> Start Focus
              </Button>
            </div>
          ) : (
            <p className="text-xl text-muted-foreground">
              No tasks currently set for focus. Add a task or select one from your daily list.
            </p>
          )}
          <Button variant="outline" onClick={() => setIsFocusPanelOpen(true)} className="mt-8">
            Open Focus Tools
          </Button>
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