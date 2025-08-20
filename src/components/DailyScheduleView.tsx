import React, { useMemo, useCallback } from 'react'; // Removed useState
import { format, addDays, subDays, isToday, isSameDay, parseISO } from 'date-fns'; // Added isSameDay, parseISO
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ScheduleGridContent from './ScheduleGridContent';
import { useWorkHours } from '@/hooks/useWorkHours';
import { useAppointments } from '@/hooks/useAppointments';
import { Task, useTasks } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';

interface DailyScheduleViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  isDemo?: boolean;
  demoUserId?: string;
  onOpenTaskOverview: (task: Task) => void;
}

const DailyScheduleView: React.FC<DailyScheduleViewProps> = ({
  currentDate,
  setCurrentDate,
  isDemo = false,
  demoUserId,
  onOpenTaskOverview,
}) => {
  const { settings } = useSettings();
  const {
    tasks: allTasks, // All tasks (real and generated recurring)
    isLoading: tasksLoading,
    sections,
    allCategories,
  } = useTasks({ userId: demoUserId, currentDate: currentDate });

  const {
    workHours: allWorkHours,
    saveWorkHours,
    loading: workHoursLoading, // Corrected prop name
  } = useWorkHours({ userId: demoUserId });

  const {
    appointments,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    clearDayAppointments,
    batchAddAppointments,
    loading: appointmentsLoading, // Corrected prop name
  } = useAppointments({ userId: demoUserId, startDate: currentDate, endDate: currentDate }); // Added startDate, endDate

  const daysInGrid = useMemo(() => [currentDate], [currentDate]);

  const handlePreviousDay = useCallback(() => {
    setCurrentDate((prevDate: Date) => subDays(prevDate, 1)); // Explicitly type prevDate
  }, [setCurrentDate]);

  const handleNextDay = useCallback(() => {
    setCurrentDate((prevDate: Date) => addDays(prevDate, 1)); // Explicitly type prevDate
  }, [setCurrentDate]);

  const isLoading = tasksLoading || workHoursLoading || appointmentsLoading;

  // Filter tasks for the current day to pass to ScheduleGridContent
  const allDayTasks = useMemo(() => {
    return allTasks.filter(task => {
      if (!task.due_date) return false;
      return isSameDay(parseISO(task.due_date), currentDate);
    });
  }, [allTasks, currentDate]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" size="icon" onClick={handlePreviousDay}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {isToday(currentDate) ? 'Today' : format(currentDate, 'EEEE, MMM d, yyyy')}
        </h2>
        <Button variant="outline" size="icon" onClick={handleNextDay}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-grow overflow-auto">
        <ScheduleGridContent
          isDemo={isDemo}
          onOpenTaskOverview={onOpenTaskOverview}
          currentViewDate={currentDate}
          daysInGrid={daysInGrid}
          allWorkHours={allWorkHours || []} // Ensure it's an array
          saveWorkHours={saveWorkHours}
          appointments={appointments}
          addAppointment={addAppointment}
          updateAppointment={(id, updates) => updateAppointment({ id, updates })} // Corrected call signature
          deleteAppointment={deleteAppointment}
          clearDayAppointments={clearDayAppointments}
          batchAddAppointments={batchAddAppointments}
          allTasks={allTasks}
          allDayTasks={allDayTasks}
          allCategories={allCategories}
          sections={sections}
          settings={settings}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default DailyScheduleView;