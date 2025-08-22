import React, { useState, useMemo } from 'react';
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DailyScheduleViewProps } from '@/types/props';
import ScheduleGridContent from './ScheduleGridContent';
import { useAppointments } from '@/hooks/useAppointments';
import { useTasks } from '@/hooks/useTasks';
import { useWorkHours } from '@/hooks/useWorkHours';
import { useAuth } from '@/context/AuthContext';
import { Task } from '@/types/task';

const DailyScheduleView: React.FC<DailyScheduleViewProps> = ({
  isDemo,
  onOpenTaskOverview,
}) => {
  const { user } = useAuth();
  const userId = user?.id;

  const [currentViewDate, setCurrentViewDate] = useState(new Date());

  const {
    appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments(userId);

  const {
    tasks,
    sections,
    allCategories: categories,
    isLoading: tasksLoading,
    error: tasksError,
    updateTask: onUpdateTask,
    handleAddTask: onAddTask,
  } = useTasks({ userId: userId, currentDate: currentViewDate, viewMode: 'all' });

  const {
    allWorkHours,
    isLoading: workHoursLoading,
    error: workHoursError,
    saveWorkHours,
  } = useWorkHours(userId);

  const daysInGrid = useMemo(() => {
    const start = startOfWeek(currentViewDate, { weekStartsOn: 1 }); // Monday start
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }
    return days;
  }, [currentViewDate]);

  const handlePreviousDay = () => {
    setCurrentViewDate((prev) => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setCurrentViewDate((prev) => addDays(prev, 1));
  };

  const handleToday = () => {
    setCurrentViewDate(new Date());
  };

  const isLoading = appointmentsLoading || tasksLoading || workHoursLoading;
  const error = appointmentsError || tasksError || workHoursError;

  if (isLoading) {
    return <div className="p-4 md:p-6">Loading schedule...</div>;
  }

  if (error) {
    return <div className="p-4 md:p-6 text-red-500">Error loading schedule: {error.message}</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
        <Button variant="ghost" size="icon" onClick={handlePreviousDay}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-semibold">{format(currentViewDate, 'EEEE, MMM d, yyyy')}</h2>
          <Button variant="link" onClick={handleToday} className="text-sm text-blue-500">
            Today
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={handleNextDay}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-grow overflow-hidden">
        <ScheduleGridContent
          isDemo={isDemo}
          onOpenTaskOverview={onOpenTaskOverview}
          currentViewDate={currentViewDate}
          daysInGrid={daysInGrid}
          allWorkHours={allWorkHours}
          saveWorkHours={saveWorkHours}
          appointments={appointments.filter(app => isSameDay(parseISO(app.date), currentViewDate))}
          tasks={tasks}
          sections={sections}
          categories={categories}
          addAppointment={addAppointment}
          updateAppointment={updateAppointment}
          deleteAppointment={deleteAppointment}
          onAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
          onOpenTaskDetail={onOpenTaskOverview} // Reusing onOpenTaskOverview for detail
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default DailyScheduleView;