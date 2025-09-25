import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DateNavigator from '@/components/DateNavigator';
import WeeklyDateNavigator from '@/components/WeeklyDateNavigator';
import { useWorkHours, WorkHour } from '@/hooks/useWorkHours';
import { useAppointments } from '@/hooks/useAppointments';
import { useTasks, Task, TaskSection, Category } from '@/hooks/useTasks';
import { format, startOfWeek, addWeeks, addDays, isSameDay } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from '@/context/SettingsContext';
import ScheduleGridContent from '@/components/ScheduleGridContent';
import TaskOverviewDialog from '@/components/TaskOverviewDialog'; // Import TaskOverviewDialog

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday as start of week

  const { settings } = useSettings();

  const daysInGrid = useMemo(() => {
    if (viewMode === 'daily') {
      return [currentDate];
    } else {
      return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
    }
  }, [viewMode, currentDate, currentWeekStart]);

  const { workHours: allWorkHours, loading: workHoursLoading, saveWorkHours } = useWorkHours({ userId });

  const { appointments, loading: appointmentsLoading, addAppointment, updateAppointment, deleteAppointment, clearDayAppointments, batchAddAppointments } = useAppointments({
    startDate: daysInGrid[0],
    endDate: daysInGrid[daysInGrid.length - 1],
    userId,
  });

  const {
    processedTasks,
    allCategories,
    sections,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
  } = useTasks({ currentDate, userId });

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTaskFromOverview = useCallback((task: Task) => {
    setIsTaskOverviewOpen(false);
    // If you have a separate TaskDetailDialog for editing, open it here.
    // For now, we'll just log and close.
    console.log("Edit task from overview:", task.id);
  }, []);

  const allWorkHoursArray = useMemo(() => {
    if (Array.isArray(allWorkHours)) {
      return allWorkHours;
    }
    return [];
  }, [allWorkHours]);

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 bg-muted/40">
      <Card className="mb-6 shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold text-primary">Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'daily' | 'weekly')} className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="daily">Daily View</TabsTrigger>
              <TabsTrigger value="weekly">Weekly View</TabsTrigger>
            </TabsList>
            <TabsContent value="daily" className="mt-4">
              <DateNavigator
                currentDate={currentDate}
                onPreviousDay={() => setCurrentDate(prevDate => addDays(prevDate, -1))}
                onNextDay={() => setCurrentDate(prevDate => addDays(prevDate, 1))}
                onGoToToday={() => setCurrentDate(new Date())}
                setCurrentDate={setCurrentDate}
              />
            </TabsContent>
            <TabsContent value="weekly" className="mt-4">
              <WeeklyDateNavigator
                currentWeekStart={currentWeekStart}
                onPreviousWeek={() => setCurrentWeekStart(prevWeek => addWeeks(prevWeek, -1))}
                onNextWeek={() => setCurrentWeekStart(prevWeek => addWeeks(prevWeek, 1))}
                onGoToCurrentWeek={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                setCurrentWeekStart={setCurrentWeekStart}
              />
            </TabsContent>
          </Tabs>

          <ScheduleGridContent
            isDemo={isDemo}
            onOpenTaskOverview={handleOpenTaskOverview}
            currentViewDate={viewMode === 'daily' ? currentDate : currentWeekStart}
            daysInGrid={daysInGrid}
            allWorkHours={allWorkHoursArray}
            saveWorkHours={saveWorkHours}
            appointments={appointments}
            addAppointment={addAppointment}
            updateAppointment={(id, updates) => updateAppointment({ id, updates })}
            deleteAppointment={deleteAppointment}
            clearDayAppointments={clearDayAppointments}
            batchAddAppointments={batchAddAppointments}
            allTasks={processedTasks}
            allDayTasks={processedTasks.filter(t => isSameDay(t.created_at ? parseISO(t.created_at) : new Date(), currentDate))} // Filter for current day tasks
            allCategories={allCategories}
            sections={sections}
            settings={settings}
            isLoading={workHoursLoading || appointmentsLoading}
          />
        </CardContent>
      </Card>

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={(taskId, updates) => updateTask(taskId, updates)}
          onDelete={(taskId) => deleteSection(taskId)} // Assuming deleteSection is a placeholder for deleteTask
          sections={sections}
          allTasks={processedTasks}
        />
      )}
    </div>
  );
};

export default TimeBlockSchedule;