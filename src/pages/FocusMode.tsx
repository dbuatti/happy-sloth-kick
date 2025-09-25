import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import FocusToolsPanel from '@/components/FocusToolsPanel';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const { settings } = useSettings();
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

  const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(true);

  const handleMarkDone = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      setIsFullScreenFocus(false);
    }
  };

  const handleOpenDetail = (task: Task) => {
    // This function would typically open a TaskDetailDialog,
    // but for FocusMode, we'll just log for now or navigate.
    console.log("Opening detail for task:", task);
    // You might want to implement a modal here or navigate to a task detail page
  };

  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden">
      <h1 className="text-3xl font-bold mb-6">Focus Mode</h1>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center bg-card rounded-xl shadow-lg p-6 text-center overflow-auto">
          {nextAvailableTask ? (
            <>
              <h2 className="text-4xl font-extrabold tracking-tight mb-4 text-foreground">
                {nextAvailableTask.description}
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Time to focus on this task.
              </p>
              <div className="flex gap-4">
                <Button size="lg" onClick={() => setIsFullScreenFocus(true)}>
                  Go Fullscreen
                </Button>
                <Button size="lg" variant="outline" onClick={() => handleMarkDone()}>
                  Mark Done
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <h2 className="text-2xl font-bold mb-2">No Focus Task Set</h2>
              <p className="mb-4">Select a task from the panel to start focusing.</p>
              <Button onClick={() => setIsFocusPanelOpen(true)}>Open Focus Tools</Button>
            </div>
          )}
        </div>

        <div className={cn(
          "lg:w-[350px] flex-shrink-0 transition-all duration-300 ease-in-out",
          isFocusPanelOpen ? "block" : "hidden"
        )}>
          <div className="lg:sticky lg:top-4 h-full bg-card rounded-xl shadow-lg p-4 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Focus Tools</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsFocusPanelOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
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
          </div>
        </div>
      </div>

      {isFullScreenFocus && nextAvailableTask && (
        <FullScreenFocusView
          taskDescription={nextAvailableTask.description}
          onClose={() => setIsFullScreenFocus(false)}
          onMarkDone={handleMarkDone}
        />
      )}
    </div>
  );
};

export default FocusMode;