import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import FocusToolsPanel from '@/components/FocusToolsPanel';
import { useSettings } from '@/context/SettingsContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { PanelRightOpen } from 'lucide-react';

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const [currentDate] = useState(new Date());
  const { settings } = useSettings(); // Keep settings as it's used for schedule_show_focus_tasks_only in useTaskProcessing
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

  const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);

  const handleOpenFullScreenFocus = useCallback(() => {
    if (nextAvailableTask) {
      setIsFullScreenFocus(true);
    }
  }, [nextAvailableTask]);

  const handleMarkDoneAndCloseFullScreen = useCallback(async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      setIsFullScreenFocus(false);
    }
  }, [nextAvailableTask, updateTask]);

  const handleOpenDetail = useCallback((task: Task) => {
    // This function is passed to FocusToolsPanel, which then passes it to TaskOverviewDialog.
    // TaskOverviewDialog's onEditClick will then set taskToEdit and open TaskDetailDialog.
    // For now, we'll just log it as the full edit flow is handled within TaskOverviewDialog.
    console.log('Opening detail for task:', task.description);
  }, []);

  if (isFullScreenFocus && nextAvailableTask) {
    return (
      <FullScreenFocusView
        taskDescription={nextAvailableTask.description}
        onClose={() => setIsFullScreenFocus(false)}
        onMarkDone={handleMarkDoneAndCloseFullScreen}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full">
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Focus Mode</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            {nextAvailableTask ? (
              <>
                <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
                  Your Next Focus:
                </h2>
                <p className="text-5xl md:text-6xl font-extrabold text-primary leading-tight">
                  {nextAvailableTask.description}
                </p>
                <Button size="lg" onClick={handleOpenFullScreenFocus} className="h-14 px-8 text-lg">
                  Start Focus
                </Button>
              </>
            ) : (
              <div className="text-center text-muted-foreground text-lg">
                No tasks currently set for focus. Add some tasks or set a task as focus!
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isMobile ? (
        <Drawer open={isFocusPanelOpen} onOpenChange={setIsFocusPanelOpen}>
          <DrawerContent className="h-[90vh] bg-background">
            <DrawerHeader>
              <DrawerTitle>Focus Tools</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <FocusToolsPanel
                nextAvailableTask={nextAvailableTask}
                allTasks={processedTasks}
                filteredTasks={filteredTasks}
                updateTask={updateTask}
                onDeleteTask={deleteTask}
                sections={sections}
                allCategories={allCategories}
                onOpenDetail={handleOpenDetail}
                handleAddTask={handleAddTask}
                currentDate={currentDate}
                setFocusTask={setFocusTask}
                doTodayOffIds={doTodayOffIds}
                toggleDoToday={toggleDoToday}
              />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <div className="w-full lg:w-1/3 xl:w-1/4 p-4 md:p-6 border-l bg-muted/40 overflow-y-auto">
          <FocusToolsPanel
            nextAvailableTask={nextAvailableTask}
            allTasks={processedTasks}
            filteredTasks={filteredTasks}
            updateTask={updateTask}
            onDeleteTask={deleteTask}
            sections={sections}
            allCategories={allCategories}
            onOpenDetail={handleOpenDetail}
            handleAddTask={handleAddTask}
            currentDate={currentDate}
            setFocusTask={setFocusTask}
            doTodayOffIds={doTodayOffIds}
            toggleDoToday={toggleDoToday}
          />
        </div>
      )}

      {isMobile && (
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
          onClick={() => setIsFocusPanelOpen(true)}
        >
          <PanelRightOpen className="h-7 w-7" />
        </Button>
      )}
    </div>
  );
};

export default FocusMode;