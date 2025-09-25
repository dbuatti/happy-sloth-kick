"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useTasks, Task, TaskSection, Category } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import FocusToolsPanel from '@/components/FocusToolsPanel';
import FocusPanelDrawer from '@/components/FocusPanelDrawer';
import { CheckCircle2 } from 'lucide-react'; // Imported CheckCircle2
import { Appointment } from '@/hooks/useAppointments';
import { useAllAppointments } from '@/hooks/useAllAppointments';

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const [currentDate] = useState(new Date());
  // Removed unused isTaskOverviewOpen and taskToOverview states
  const [isFullScreenFocusViewOpen, setIsFullScreenFocusViewOpen] = useState(false);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);

  const {
    processedTasks,
    filteredTasks,
    nextAvailableTask,
    loading,
    handleAddTask,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({ currentDate, userId, viewMode: 'focus' });

  const { appointments: allAppointments } = useAllAppointments();

  const scheduledTasksMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    allAppointments.forEach(app => {
      if (app.task_id) {
        map.set(app.task_id, app);
      }
    });
    return map;
  }, [allAppointments]);

  const handleOpenFocusView = () => {
    setIsFullScreenFocusViewOpen(true);
  };

  const handleMarkDoneFromFullScreen = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      setIsFullScreenFocusViewOpen(false);
    }
  };

  const handleOpenTaskOverview = (task: Task) => {
    // This function is passed to FocusToolsPanel, which then uses TaskOverviewDialog
    // The state for TaskOverviewDialog is managed within FocusToolsPanel
    // So, no need for isTaskOverviewOpen and taskToOverview here.
    console.log("Opening task overview for:", task.description);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 overflow-auto">
      <Card className="w-full shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold">Focus Mode</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col items-center justify-center space-y-6 py-8">
            {nextAvailableTask ? (
              <>
                <h2 className="text-4xl font-extrabold text-center tracking-tight">
                  Your Next Focus:
                </h2>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${nextAvailableTask.priority === 'urgent' ? 'bg-priority-urgent' : nextAvailableTask.priority === 'high' ? 'bg-priority-high' : nextAvailableTask.priority === 'medium' ? 'bg-priority-medium' : 'bg-priority-low'}`} />
                  <p className="text-2xl font-semibold text-foreground">
                    {nextAvailableTask.description}
                  </p>
                </div>
                <button
                  onClick={handleOpenFocusView}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg text-lg font-semibold shadow-md hover:bg-primary/90 transition-colors"
                >
                  Start Deep Work
                </button>
              </>
            ) : (
              <div className="text-center text-muted-foreground text-lg py-8">
                <p>No tasks currently set for focus.</p>
                <p>Add some tasks or set a task as focus to begin!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isFullScreenFocusViewOpen && nextAvailableTask && (
        <FullScreenFocusView
          taskDescription={nextAvailableTask.description}
          onClose={() => setIsFullScreenFocusViewOpen(false)}
          onMarkDone={handleMarkDoneFromFullScreen}
        />
      )}

      <FocusPanelDrawer
        isOpen={isFocusPanelOpen}
        onClose={() => setIsFocusPanelOpen(false)}
        nextAvailableTask={nextAvailableTask}
        allTasks={processedTasks}
        filteredTasks={filteredTasks}
        updateTask={updateTask}
        onOpenDetail={handleOpenTaskOverview}
        onDeleteTask={deleteTask}
        sections={sections}
        allCategories={allCategories}
        handleAddTask={handleAddTask}
        currentDate={currentDate}
      />
    </div>
  );
};

export default FocusMode;