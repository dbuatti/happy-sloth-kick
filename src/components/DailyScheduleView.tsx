import React, { useMemo } from 'react';
import { CardContent } from "@/components/ui/card";
import { useWorkHours, WorkHour } from '@/hooks/useWorkHours';
import DateNavigator from '@/components/DateNavigator';
import { useAppointments } from '@/hooks/useAppointments';
import { Task, useTasks } from '@/hooks/useTasks'; // Only import Task type
import { useSettings } from '@/context/SettingsContext';
import ScheduleGridContent from './ScheduleGridContent';
import { useTaskSections } from '@/hooks/useTaskSections'; // Import useTaskSections
import { useTaskCategories } from '@/hooks/useTaskCategories'; // Import useTaskCategories

interface DailyScheduleViewProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
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
  const { workHours, loading: workHoursLoading, saveWorkHours } = useWorkHours({ date: currentDate, userId: demoUserId });
  const singleDayWorkHours = workHours as WorkHour | null;

  const { appointments, loading: appointmentsLoading, addAppointment, updateAppointment, deleteAppointment, clearDayAppointments, batchAddAppointments } = useAppointments({ startDate: currentDate, endDate: currentDate });
  const { 
    tasks: allTasks,
    filteredTasks: allDayTasks, 
  } = useTasks({ currentDate, userId: demoUserId });
  const { data: allCategories } = useTaskCategories(); // Use useTaskCategories hook
  const { data: sections } = useTaskSections(); // Use useTaskSections hook
  const { settings } = useSettings();

  const daysInGrid = useMemo(() => [currentDate], [currentDate]);

  const allWorkHoursArray = useMemo(() => {
    return singleDayWorkHours ? [singleDayWorkHours] : [];
  }, [singleDayWorkHours]);

  return (
    <CardContent className="pt-0">
      <DateNavigator
        currentDate={currentDate}
        onPreviousDay={() => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() - 1)))}
        onNextDay={() => setCurrentDate(prevDate => new Date(prevDate.setDate(prevDate.getDate() + 1)))}
        onGoToToday={() => setCurrentDate(new Date())}
        setCurrentDate={setCurrentDate}
      />
      <ScheduleGridContent
        isDemo={isDemo}
        onOpenTaskOverview={onOpenTaskOverview}
        currentViewDate={currentDate}
        daysInGrid={daysInGrid}
        allWorkHours={allWorkHoursArray}
        saveWorkHours={saveWorkHours}
        appointments={appointments}
        addAppointment={addAppointment}
        updateAppointment={(id, updates) => updateAppointment({ id, updates })}
        deleteAppointment={deleteAppointment}
        clearDayAppointments={clearDayAppointments}
        batchAddAppointments={batchAddAppointments}
        allTasks={allTasks as Task[]}
        allDayTasks={allDayTasks}
        allCategories={allCategories} // Pass from hook
        sections={sections} // Pass from hook
        settings={settings}
        isLoading={workHoursLoading || appointmentsLoading}
      />
    </CardContent>
  );
};

export default DailyScheduleView;