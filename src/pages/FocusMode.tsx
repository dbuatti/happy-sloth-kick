import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import FocusToolsPanel from '@/components/FocusToolsPanel';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

interface FocusModeProps {
  demoUserId?: string;
}

const FocusMode: React.FC<FocusModeProps> = ({ demoUserId }) => {
  const navigate = useNavigate(); // Initialize useNavigate
  const [currentDate] = useState(new Date());
  const { settings } = useSettings();

  const {
    processedTasks,
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

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  useEffect(() => {
    if (settings?.focused_task_id && !nextAvailableTask) {
      setFocusTask(null); // Clear focus if the task is no longer available
    }
  }, [settings?.focused_task_id, nextAvailableTask, setFocusTask]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-3xl font-bold">Focus Mode</CardTitle>
          <p className="text-muted-foreground">
            Dedicated space for deep work and mindfulness.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {nextAvailableTask ? (
            <FocusToolsPanel
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
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
              <p className="text-lg font-semibold mb-4">No tasks to focus on right now.</p>
              <p className="mb-4">
                You can set a task as "Focus" from the Daily Tasks page, or add a new task here.
              </p>
              <Button onClick={() => navigate('/daily-tasks')}>
                Select a Task to Focus
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={(taskToEdit) => {
            setTaskToOverview(taskToEdit);
            // Optionally open a full edit form here if needed, or just update the overview
          }}
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