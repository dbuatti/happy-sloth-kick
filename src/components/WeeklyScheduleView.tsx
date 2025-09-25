import React from 'react';
import { CardContent } from "@/components/ui/card";
import DateNavigator from '@/components/DateNavigator'; // Reusing DateNavigator for now
import { useWorkHours, WorkHour } from '@/hooks/useWorkHours';
import { useAppointments } from '@/hooks/useAppointments';
import { useTasks, Task } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import { format, startOfWeek, addWeeks, eachDayOfInterval } from 'date-fns';
import ScheduleGridContent from './ScheduleGridContent';

interface WeeklyScheduleViewProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  isDemo?: boolean;
  demoUserId?: string;
  onOpenTaskOverview: (task: Task) => void;
}

const WeeklyScheduleView: React.FC<WeeklyScheduleViewProps> = ({
  currentDate,
  setCurrentDate,
  isDemo = false,
  demoUserId,
  onOpenTaskOverview,
}) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday as start of week
  const weekEnd = addWeeks(weekStart, 1); // End of the week (Sunday)

  const daysInGrid = eachDayOfInterval({ start: weekStart, end: addWeeks(weekStart, 0) }); // Just one week for now

  const { workHours: allWorkHours, loading: workHoursLoading, saveWorkHours } = useWorkHours({ userId: demoUserId });
  const { appointments, loading: appointmentsLoading, addAppointment, updateAppointment, deleteAppointment, clearDayAppointments, batchAddAppointments } = useAppointments({ startDate: weekStart, endDate: weekEnd });
  const { 
    tasks: allTasks,
    filteredTasks: allDayTasks, 
    allCategories, 
    sections, 
  } = useTasks({ currentDate, userId: demoUserId });
  const { settings } = useSettings();

  return (
    <CardContent className="pt-0">
      <DateNavigator
        currentDate={weekStart}
        onPreviousDay={() => setCurrentDate(prevDate => addWeeks(prevDate, -1))}
        onNextDay={() => setCurrentDate(prevDate => addWeeks(prevDate, 1))}
        onGoToToday={() => setCurrentDate(new Date())}
        setCurrentDate={(date) => setCurrentDate(startOfWeek(date, { weekStartsOn: 1 }))}
      />
      <ScheduleGridContent
        isDemo={isDemo}
        onOpenTaskOverview={onOpenTaskOverview}
        currentViewDate={currentDate}
        daysInGrid={daysInGrid}
        allWorkHours={allWorkHours as WorkHour[]} // Cast to array
        saveWorkHours={saveWorkHours}
        appointments={appointments}
        addAppointment={addAppointment}
        updateAppointment={(id, updates) => updateAppointment({ id, updates })}
        deleteAppointment={deleteAppointment}
        clearDayAppointments={clearDayAppointments}
        batchAddAppointments={batchAddAppointments}
        allTasks={allTasks as Task[]}
        allDayTasks={allDayTasks}
        allCategories={allCategories}
        sections={sections}
        settings={settings}
        isLoading={workHoursLoading || appointmentsLoading}
      />
    </CardContent>
  );
};

export default WeeklyScheduleView;