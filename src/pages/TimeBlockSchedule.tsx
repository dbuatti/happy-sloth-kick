import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import DailyScheduleView from '@/components/DailyScheduleView';
import WeeklyScheduleView from '@/components/WeeklyScheduleView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Task } from '@/hooks/useTasks';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { useTasks } from '@/hooks/useTasks';

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const { settings: userSettings } = useSettings(); // Renamed to userSettings to avoid conflict if 'settings' was used elsewhere
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const {
    sections,
    allCategories,
    updateTask,
    deleteTask,
    processedTasks,
  } = useTasks({ currentDate, userId: demoUserId });

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskClick = (task: Task) => {
    // For now, just close the overview and let the user re-open with edit mode if needed
    // Or, if there's a TaskDetailDialog, open that instead.
    // For this context, we'll just close the overview.
    setIsTaskOverviewOpen(false);
    // If you had a TaskDetailDialog, you'd open it here:
    // setIsTaskDetailOpen(true);
    // setTaskToEdit(task);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8 md:pt-12">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Schedule</h2>
        <div className="flex items-center space-x-2">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'daily' | 'weekly')}>
            <TabsList>
              <TabsTrigger value="daily">Day</TabsTrigger>
              <TabsTrigger value="weekly">Week</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Card className="flex-1">
        {viewMode === 'daily' ? (
          <DailyScheduleView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            isDemo={isDemo}
            demoUserId={demoUserId}
            onOpenTaskOverview={handleOpenTaskOverview}
          />
        ) : (
          <WeeklyScheduleView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            isDemo={isDemo}
            demoUserId={demoUserId}
            onOpenTaskOverview={handleOpenTaskOverview}
          />
        )}
      </Card>

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleEditTaskClick}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allTasks={processedTasks}
        />
      )}
    </div>
  );
};

export default TimeBlockSchedule;