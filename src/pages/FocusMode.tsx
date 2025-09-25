import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { AnimatePresence } from 'framer-motion';
import { useSettings } from '@/context/SettingsContext';
import { Sparkles } from 'lucide-react';

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const { settings } = useSettings();

  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(true);
  const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);

  const {
    processedTasks: allTasks,
    filteredTasks,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    handleAddTask,
    currentDate,
    nextAvailableTask,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({ currentDate: new Date(), userId, viewMode: 'focus' });

  const handleOpenTaskDetail = (task: Task) => {
    // This function is passed to FocusToolsPanel to open TaskOverviewDialog
    // The TaskOverviewDialog is then responsible for calling onEditClick (which is onOpenDetail)
    // or onDelete.
  };

  const handleOpenFullScreenFocus = () => {
    if (nextAvailableTask) {
      setIsFullScreenFocus(true);
    }
  };

  const handleMarkDoneFullScreen = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      setIsFullScreenFocus(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-2xl text-center shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" /> Focus Mode
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            Minimize distractions and concentrate on your most important task.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 py-6">
          {nextAvailableTask ? (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-muted-foreground">Your current focus:</h3>
              <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
                {nextAvailableTask.description}
              </h2>
              <p className="text-sm text-muted-foreground">
                From section: {sections.find(s => s.id === nextAvailableTask.section_id)?.name || 'No Section'}
              </p>
              <div className="flex justify-center gap-4 mt-6">
                <Button size="lg" onClick={handleOpenFullScreenFocus} className="h-12 px-6 text-lg">
                  Go Fullscreen
                </Button>
                <Button size="lg" variant="outline" onClick={() => handleOpenTaskDetail(nextAvailableTask)} className="h-12 px-6 text-lg">
                  Details
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 flex flex-col items-center gap-4">
              <Sparkles className="h-16 w-16 text-muted-foreground" />
              <p className="text-xl font-medium">No tasks currently set for focus.</p>
              <p className="text-muted-foreground">
                Add a task or set one as focus from your daily tasks list.
              </p>
            </div>
          )}
        </CardContent>
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

      <AnimatePresence>
        {isFullScreenFocus && nextAvailableTask && (
          <FullScreenFocusView
            taskDescription={nextAvailableTask.description}
            onClose={() => setIsFullScreenFocus(false)}
            onMarkDone={handleMarkDoneFullScreen}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FocusMode;