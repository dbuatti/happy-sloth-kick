import React, { useMemo } from 'react';
import { addDays, startOfWeek } from 'date-fns';
import { CardContent } from "@/components/ui/card";
import { useWorkHours } from '@/hooks/useWorkHours';
import { useAppointments } from '@/hooks/useAppointments';
import { useTasks, Task } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import WeeklyDateNavigator from './WeeklyDateNavigator';
import ScheduleGridContent from './ScheduleGridContent'; // Import the new component

interface WeeklyScheduleGridProps {
  currentWeekStart: Date;
  isDemo?: boolean;
  demoUserId?: string;
  onOpenTaskOverview: (task: Task) => void; // Changed to any for now, will be Task
}

const WeeklyScheduleGrid: React.FC<WeeklyScheduleGridProps> = ({
  currentWeekStart,
  isDemo = false,
  demoUserId,
  onOpenTaskOverview,
}) => {
  const weekEnd = addDays(currentWeekStart, 6);

  const { workHours: allWorkHoursRaw, loading: workHoursLoading, saveWorkHours } = useWorkHours({ userId: demoUserId });
  const allWorkHours = Array.isArray(allWorkHoursRaw) ? allWorkHoursRaw : [];

  const { appointments, loading: appointmentsLoading, addAppointment, updateAppointment, deleteAppointment, clearDayAppointments, batchAddAppointments } = useAppointments({ startDate: currentWeekStart, endDate: weekEnd });
  const {
    tasks: allTasks,
    filteredTasks: allDayTasks,
    allCategories,
    sections,
   } = useTasks({ currentDate: currentWeekStart, userId: demoUserId });
  const { settings } = useSettings();

  const daysInGrid = useMemo(() => {
    const days = [];
    let currentDay = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
    for (let i = 0; i < 7; i++) {
      days.push(currentDay);
      currentDay = addDays(currentDay, 1);
    }
    return days;
  }, [currentWeekStart]);

  return (
    <CardContent className="pt-0">
      <WeeklyDateNavigator
        currentWeekStart={currentWeekStart}
        onPreviousWeek={() => { /* Handled by parent */ }}
        onNextWeek={() => { /* Handled by parent */ }}
        onGoToCurrentWeek={() => { /* Handled by parent */ }}
        setCurrentWeekStart={() => { /* Handled by parent */ }}
      />
      <ScheduleGridContent
        isDemo={isDemo}
        onOpenTaskOverview={onOpenTaskOverview}
        currentViewDate={currentWeekStart}
        daysInGrid={daysInGrid}
        allWorkHours={allWorkHours}
        saveWorkHours={saveWorkHours}
        appointments={appointments}
        addAppointment={addAppointment}
        updateAppointment={(id, updates) => updateAppointment({ id, updates })}
        deleteAppointment={deleteAppointment}
        clearDayAppointments={clearDayAppointments}
        batchAddAppointments={batchAddAppointments}
        allTasks={allTasks as Task[]} // Cast to Task[]
        allDayTasks={allDayTasks}
        allCategories={allCategories}
        sections={sections}
        settings={settings}
        isLoading={workHoursLoading || appointmentsLoading}
      />
    </CardContent>
  );
};

export default WeeklyScheduleGrid;