import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScheduleGridContent from '@/components/ScheduleGridContent';
import { useAppointments, Appointment } from '@/hooks/useAppointments';
import { useSettings } from '@/context/SettingsContext';
import { useTasks, Task } from '@/hooks/useTasks';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [scheduleView, setScheduleView] = useState<'daily' | 'weekly'>('daily');
  const isMobile = useIsMobile();

  const {
    tasks: allTasks,
    filteredTasks,
    handleAddTask,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    loading: tasksLoading,
  } = useTasks({ currentDate, userId: demoUserId });

  const {
    appointments,
    loading: appointmentsLoading,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    clearDayAppointments,
    batchAddAppointments,
  } = useAppointments({ startDate: currentDate, endDate: currentDate, userId: demoUserId });

  const scheduledTasksMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    appointments.forEach(app => {
      if (app.task_id) {
        map.set(app.task_id, app);
      }
    });
    return map;
  }, [appointments]);

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <CardTitle className="text-3xl font-bold tracking-tight">Time Block Schedule</CardTitle>
          <Tabs value={scheduleView} onValueChange={(value) => setScheduleView(value as 'daily' | 'weekly')}>
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly" disabled>Weekly (Coming Soon)</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <TabsContent value="daily" className="mt-0">
          <ScheduleGridContent
            isDemo={isDemo}
            onOpenTaskOverview={handleOpenTaskOverview}
            currentViewDate={currentDate}
            daysInGrid={[currentDate]}
            allWorkHours={[]} // Work hours are fetched internally by ScheduleGridContent
            saveWorkHours={() => Promise.resolve(true)} // Placeholder, actual save is in WorkHoursSettings
            appointments={appointments}
            addAppointment={addAppointment}
            updateAppointment={(id, updates) => updateAppointment({ id, updates })}
            deleteAppointment={deleteAppointment}
            clearDayAppointments={clearDayAppointments}
            batchAddAppointments={batchAddAppointments}
            allTasks={allTasks as Task[]}
            allDayTasks={filteredTasks}
            allCategories={allCategories}
            sections={sections}
            settings={useSettings().settings}
            isLoading={tasksLoading || appointmentsLoading}
          />
        </TabsContent>
        <TabsContent value="weekly" className="mt-0">
          {/* Weekly view content will go here */}
          <ScheduleGridContent
            isDemo={isDemo}
            onOpenTaskOverview={handleOpenTaskOverview}
            currentViewDate={currentDate}
            daysInGrid={[]} // Placeholder for weekly days
            allWorkHours={[]}
            saveWorkHours={() => Promise.resolve(true)}
            appointments={appointments}
            addAppointment={addAppointment}
            updateAppointment={(id, updates) => updateAppointment({ id, updates })}
            deleteAppointment={deleteAppointment}
            clearDayAppointments={clearDayAppointments}
            batchAddAppointments={batchAddAppointments}
            allTasks={allTasks as Task[]}
            allDayTasks={filteredTasks}
            allCategories={allCategories}
            sections={sections}
            settings={useSettings().settings}
            isLoading={tasksLoading || appointmentsLoading}
          />
        </TabsContent>
      </Card>

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleEditTask}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allTasks={allTasks as Task[]}
        />
      )}
    </div>
  );
};

export default TimeBlockSchedule;