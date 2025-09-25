import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTasks, Task } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import DailyScheduleView from '@/components/DailyScheduleView';
import WeeklyScheduleView from '@/components/WeeklyScheduleView';
import TaskOverviewDialog from '@/components/TaskOverviewDialog'; // Import TaskOverviewDialog
import { useAllAppointments } from '@/hooks/useAllAppointments'; // Import useAllAppointments
import { Appointment } from '@/hooks/useAppointments'; // Import Appointment type

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleView, setScheduleView] = useState<'daily' | 'weekly'>('daily');
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const { settings } = useSettings();

  const {
    processedTasks,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    loading: tasksLoading,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
  } = useTasks({ currentDate, userId: demoUserId });

  const { appointments: allAppointments } = useAllAppointments();

  const scheduledTasksMap = React.useMemo(() => {
    const map = new Map<string, Appointment>();
    allAppointments.forEach(app => {
      if (app.task_id) {
        map.set(app.task_id, app);
      }
    });
    return map;
  }, [allAppointments]);

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-3xl font-bold">Schedule</CardTitle>
          <Tabs value={scheduleView} onValueChange={(value) => setScheduleView(value as 'daily' | 'weekly')}>
            <TabsList>
              <TabsTrigger value="daily">Day</TabsTrigger>
              <TabsTrigger value="weekly">Week</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <TabsContent value="daily" className="mt-0">
          <DailyScheduleView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            isDemo={isDemo}
            demoUserId={demoUserId}
            onOpenTaskOverview={handleOpenTaskOverview}
          />
        </TabsContent>
        <TabsContent value="weekly" className="mt-0">
          <WeeklyScheduleView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            isDemo={isDemo}
            demoUserId={demoUserId}
            onOpenTaskOverview={handleOpenTaskOverview}
          />
        </TabsContent>
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

export default TimeBlockSchedule;