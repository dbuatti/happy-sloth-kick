import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import ScheduleGridContent from '@/components/ScheduleGridContent';
import { useAppointments } from '@/hooks/useAppointments';
import { useSettings } from '@/context/SettingsContext';

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const {
    tasks: allTasks, // Renamed to allTasks to avoid confusion with processedTasks
    processedTasks, // Need processedTasks for TaskOverviewDialog
    filteredTasks: allDayTasks, // Renamed to allDayTasks for clarity in ScheduleGridContent
    updateTask,
    deleteTask,
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
  } = useTasks({ currentDate, userId: demoUserId });

  const { appointments, loading: appointmentsLoading, addAppointment, updateAppointment, deleteAppointment, clearDayAppointments, batchAddAppointments } = useAppointments({ startDate: currentDate, endDate: currentDate, userId: demoUserId });
  const { settings } = useSettings();

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTaskClick = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const scheduledTasksMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    appointments.forEach(app => {
      if (app.task_id) {
        map.set(app.task_id, app);
      }
    });
    return map;
  }, [appointments]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Time Block Schedule</CardTitle>
        </CardHeader>
        <ScheduleGridContent
          isDemo={isDemo}
          onOpenTaskOverview={handleOpenTaskOverview}
          currentViewDate={currentDate}
          daysInGrid={[currentDate]}
          allWorkHours={[]} // This will be fetched by ScheduleGridContent's internal useWorkHours
          saveWorkHours={() => Promise.resolve(true)} // Placeholder, actual save is internal
          appointments={appointments}
          addAppointment={addAppointment}
          updateAppointment={updateAppointment}
          deleteAppointment={deleteAppointment}
          clearDayAppointments={clearDayAppointments}
          batchAddAppointments={batchAddAppointments}
          allTasks={processedTasks} // Pass processedTasks here
          allDayTasks={allDayTasks}
          allCategories={allCategories}
          sections={sections}
          settings={settings}
          isLoading={appointmentsLoading}
        />
      </Card>

      <TaskOverviewDialog
        task={taskToOverview}
        isOpen={isTaskOverviewOpen}
        onClose={() => setIsTaskOverviewOpen(false)}
        onEditClick={handleEditTaskClick}
        onUpdate={updateTask}
        onDelete={deleteTask}
        sections={sections}
        allTasks={processedTasks} // Pass processedTasks here
      />
    </div>
  );
};

export default TimeBlockSchedule;