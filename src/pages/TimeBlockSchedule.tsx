import React, { useState } from 'react';
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useTasks, Task } from '@/hooks/useTasks';
import DailyScheduleView from '@/components/DailyScheduleView';
import WeeklyScheduleView from '@/components/WeeklyScheduleView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskOverviewDialog from '@/components/TaskOverviewDialog';

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  // The filters are not directly used in TimeBlockSchedule, but the hook needs them.
  const {
    sections,
    processedTasks,
    updateTask,
    deleteTask,
  } = useTasks({ currentDate, userId: demoUserId });

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <div className="max-w-full mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Time Block Schedule</h1>
        <p className="text-muted-foreground">Plan your day and week by blocking out time for tasks and appointments.</p>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'daily' | 'weekly')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily">Daily View</TabsTrigger>
            <TabsTrigger value="weekly">Weekly View</TabsTrigger>
          </TabsList>
          <TabsContent value="daily" className="mt-4">
            <DailyScheduleView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              onOpenTaskOverview={handleOpenTaskOverview}
              isDemo={isDemo}
              demoUserId={demoUserId}
            />
          </TabsContent>
          <TabsContent value="weekly" className="mt-4">
            <WeeklyScheduleView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              onOpenTaskOverview={handleOpenTaskOverview}
              isDemo={isDemo}
              demoUserId={demoUserId}
            />
          </TabsContent>
        </Tabs>
      </div>

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleOpenTaskOverview} // Pass the same handler for editing
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