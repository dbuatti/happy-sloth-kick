import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { AnimatePresence } from 'framer-motion';
import FocusToolsPanel from '@/components/FocusToolsPanel';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import TaskOverviewDialog from '@/components/TaskOverviewDialog'; // Import TaskOverviewDialog

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const navigate = useNavigate();

  const [currentDate] = useState(new Date());
  const {
    processedTasks,
    filteredTasks,
    nextAvailableTask,
    loading,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    handleAddTask,
    setFocusTask,
  } = useTasks({ currentDate, viewMode: 'focus', userId });

  const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false); // State for TaskOverviewDialog
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null); // State for TaskOverviewDialog

  const handleOpenFocusView = useCallback(() => {
    if (nextAvailableTask) {
      setIsFullScreenFocus(true);
    }
  }, [nextAvailableTask]);

  const handleCloseFocusView = useCallback(() => {
    setIsFullScreenFocus(false);
  }, []);

  const handleMarkDoneFromFullScreen = async () => {
    if (nextAvailableTask) {
      await updateTask(nextAvailableTask.id, { status: 'completed' });
      setIsFullScreenFocus(false);
    }
  };

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTaskFromOverview = useCallback((task: Task) => {
    setIsTaskOverviewOpen(false); // Close overview dialog
    // This would typically open a TaskDetailDialog for editing
    // For now, we'll just log it or re-open the overview for editing if that's the flow
    // Since TaskOverviewDialog has an 'onEditClick' prop, we'll use that.
    // If a separate edit dialog is needed, it would be opened here.
    console.log("Edit task from overview:", task.id);
    // Re-open the overview dialog, which has an edit button
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);


  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 bg-background">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Focus Mode</h1>
        <div className="w-24" /> {/* Spacer */}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-full shadow-lg rounded-xl flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-center text-primary">
                Your Focused Work Area
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center pt-0">
              {nextAvailableTask ? (
                <div className="text-center space-y-6">
                  <h2 className="text-4xl font-extrabold text-foreground leading-tight">
                    {nextAvailableTask.description}
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Time to concentrate on this task.
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button size="lg" onClick={handleMarkDoneFromFullScreen}>
                      Mark Done
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => setFocusTask(null)}>
                      Clear Focus
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-lg">
                  No task currently focused. Select one from your daily tasks or quick add.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <FocusToolsPanel
            nextAvailableTask={nextAvailableTask}
            allTasks={processedTasks} // Pass processedTasks
            filteredTasks={filteredTasks}
            updateTask={updateTask}
            onOpenDetail={handleOpenTaskOverview}
            onDeleteTask={deleteTask}
            sections={sections}
            allCategories={allCategories}
            currentDate={currentDate}
            handleAddTask={handleAddTask}
            onOpenFocusView={handleOpenFocusView} // Pass the handler here
          />
        </div>
      </div>

      <AnimatePresence>
        {isFullScreenFocus && nextAvailableTask && (
          <FullScreenFocusView
            taskDescription={nextAvailableTask.description}
            onClose={handleCloseFocusView}
            onMarkDone={handleMarkDoneFromFullScreen}
          />
        )}
      </AnimatePresence>

      {/* Task Overview Dialog for 'Next Up' and 'Upcoming' tasks */}
      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allTasks={processedTasks}
        />
      )}
    </div>
  );
};

export default FocusMode;