import React, { useMemo } from 'react';
import { addDays, startOfWeek, setHours, setMinutes, addMinutes } from 'date-fns';
import { CardContent } from "@/components/ui/card";
import { useWorkHours } from '@/hooks/useWorkHours';
import { useAppointments } from '@/hooks/useAppointments';
import { useTasks } from '@/hooks/useTasks'; // Corrected import syntax
import { useSettings } from '@/context/SettingsContext';
import WeeklyDateNavigator from './WeeklyDateNavigator';
import ScheduleGridContent from './ScheduleGridContent'; // Import the new component

interface WeeklyScheduleGridProps {
  currentWeekStart: Date;
  isDemo?: boolean;
  demoUserId?: string;
  onOpenTaskDetail: (task: any) => void; // Changed to any for now, will be Task
  onOpenTaskOverview: (task: any) => void; // Changed to any for now, will be Task
}

const WeeklyScheduleGrid: React.FC<WeeklyScheduleGridProps> = ({
  currentWeekStart,
  isDemo = false,
  demoUserId,
  onOpenTaskDetail,
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

  const timeBlocks = useMemo(() => {
    const blocks = [];
    let currentTime = setHours(setMinutes(currentWeekStart, 0), 0);
    const endTime = setHours(setMinutes(currentWeekStart, 0), 24);

    while (currentTime.getTime() < endTime.getTime()) {
      const blockStart = currentTime;
      const blockEnd = addMinutes(currentTime, 30);
      blocks.push({
        start: blockStart,
        end: blockEnd,
      });
      currentTime = blockEnd;
    }
    return blocks;
  }, [currentWeekStart]);

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
        timeBlocks={timeBlocks}
        allWorkHours={allWorkHours}
        saveWorkHours={saveWorkHours}
        appointments={appointments}
        addAppointment={addAppointment}
        updateAppointment={updateAppointment}
        deleteAppointment={deleteAppointment}
        clearDayAppointments={clearDayAppointments}
        batchAddAppointments={batchAddAppointments}
        allTasks={allTasks}
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