import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScheduleGridContent from '@/components/ScheduleGridContent';
import { useAppointments, Appointment, NewAppointmentData } from '@/hooks/useAppointments'; // Import Appointment and NewAppointmentData
import { useSettings } from '@/context/SettingsContext';
import { useWorkHours } from '@/hooks/useWorkHours';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import TaskDetailDialog from '@/components/TaskDetailDialog';

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const {
    tasks: allTasks, // Renamed to allTasks to avoid confusion with processedTasks
    processedTasks, // Need processedTasks for TaskOverviewDialog
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
  } = useTasks({ currentDate, userId: demoUserId });

  const { settings } = useSettings();
  const { workHours: allWorkHours, loading: workHoursLoading, saveWorkHours } = useWorkHours({ userId: demoUserId });
  const { appointments, loading: appointmentsLoading, addAppointment, updateAppointment, deleteAppointment, clearDayAppointments, batchAddAppointments } = useAppointments({ startDate: currentDate, endDate: currentDate, userId: demoUserId });

  const scheduledTasksMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    appointments.forEach(app => {
      if (app.task_id) {
        map.set(app.task_id, app);
      }
    });
    return map;
  }, [appointments]);

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTaskClick = useCallback((task: Task) => {
    setTaskToEdit(task);
    setIsEditTaskDialogOpen(true);
    setIsTaskOverviewOpen(false); // Close overview if opening edit
  }, []);

  const handleSaveTask = async (taskId: string, updates: Partial<Task>) => {
    const result = await updateTask(taskId, updates);
    if (result) {
      setIsEditTaskDialogOpen(false);
      setTaskToEdit(null);
    }
    return result;
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Time Block Schedule</CardTitle>
        </CardHeader>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily">Daily View</TabsTrigger>
            <TabsTrigger value="weekly">Weekly View</TabsTrigger>
          </TabsList>
          <TabsContent value="daily">
            <ScheduleGridContent
              isDemo={isDemo}
              onOpenTaskOverview={handleOpenTaskOverview}
              currentViewDate={currentDate}
              daysInGrid={[currentDate]}
              allWorkHours={allWorkHours as any}
              saveWorkHours={saveWorkHours}
              appointments={appointments}
              addAppointment={addAppointment}
              updateAppointment={({ id, updates }) => updateAppointment({ id, updates })}
              deleteAppointment={deleteAppointment}
              clearDayAppointments={clearDayAppointments}
              batchAddAppointments={batchAddAppointments}
              allTasks={allTasks}
              allDayTasks={filteredTasks}
              allCategories={allCategories}
              sections={sections}
              settings={settings}
              isLoading={workHoursLoading || appointmentsLoading}
            />
          </TabsContent>
          <TabsContent value="weekly">
            <ScheduleGridContent
              isDemo={isDemo}
              onOpenTaskOverview={handleOpenTaskOverview}
              currentViewDate={currentDate}
              daysInGrid={Array.from({ length: 7 }).map((_, i) => {
                const startOfWeek = new Date(currentDate);
                startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + (i === 0 ? 1 : i)); // Monday as start of week
                return startOfWeek;
              })}
              allWorkHours={allWorkHours as any}
              saveWorkHours={saveWorkHours}
              appointments={appointments}
              addAppointment={addAppointment}
              updateAppointment={({ id, updates }) => updateAppointment({ id, updates })}
              deleteAppointment={deleteAppointment}
              clearDayAppointments={clearDayAppointments}
              batchAddAppointments={batchAddAppointments}
              allTasks={allTasks}
              allDayTasks={filteredTasks}
              allCategories={allCategories}
              sections={sections}
              settings={settings}
              isLoading={workHoursLoading || appointmentsLoading}
            />
          </TabsContent>
        </Tabs>
      </Card>

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

      <TaskDetailDialog
        task={taskToEdit}
        isOpen={isEditTaskDialogOpen}
        onClose={() => setIsEditTaskDialogOpen(false)}
        onUpdate={handleSaveTask}
        onDelete={deleteTask}
        sections={sections}
        allCategories={allCategories}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        allTasks={processedTasks}
      />
    </div>
  );
};

export default TimeBlockSchedule;