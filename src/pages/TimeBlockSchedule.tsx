import React, { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useAppointments } from '@/hooks/useAppointments';
import { useWorkHours } from '@/hooks/useWorkHours';
import { useSettings } from '@/context/SettingsContext';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DailyScheduleView from '@/components/DailyScheduleView';
import { TaskSection } from '@/types';

const TimeBlockSchedule = () => {
  const { userId: currentUserId } = useAuth();
  const { settings } = useSettings();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState(new Date());

  const {
    tasks,
    categories: allCategories,
    sections,
    loading: tasksLoading,
    error: tasksError,
    updateTask,
    deleteTask,
    addTask,
    onToggleFocusMode,
    onLogDoTodayOff,
  } = useTasks({ userId: currentUserId! });

  const {
    workHours,
    isLoading: workHoursLoading,
    error: workHoursError,
    addWorkHour,
    updateWorkHour,
  } = useWorkHours();

  const {
    appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    clearAppointmentsForDay,
  } = useAppointments(selectedDate);

  const saveWorkHours = async (dayOfWeek: string, startTime: string, endTime: string, enabled: boolean) => {
    const existingWorkHour = workHours.find(wh => wh.day_of_week === dayOfWeek);
    if (existingWorkHour) {
      await updateWorkHour({ id: existingWorkHour.id, updates: { start_time: startTime, end_time: endTime, enabled } });
    } else {
      await addWorkHour({ day_of_week: dayOfWeek, start_time: startTime, end_time: endTime, enabled });
    }
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, 7));
  };

  const weekDays = useMemo(() => {
    const days = [];
    let currentDay = currentWeekStart;
    for (let i = 0; i < 7; i++) {
      days.push(currentDay);
      currentDay = addDays(currentDay, 1);
    }
    return days;
  }, [currentWeekStart]);

  if (tasksLoading || workHoursLoading || appointmentsLoading) return <div className="text-center py-8">Loading schedule...</div>;
  if (tasksError || workHoursError || appointmentsError) return <div className="text-center py-8 text-red-500">Error loading data.</div>;

  return (
    <div className="container mx-auto p-4 h-full flex flex-col">
      <h1 className="text-3xl font-bold mb-6">Time Block Schedule</h1>

      <Card className="mb-6 flex-shrink-0">
        <CardHeader>
          <CardTitle>Weekly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <Button variant="outline" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4 mr-2" /> Previous Week
            </Button>
            <h3 className="text-xl font-semibold">
              {format(currentWeekStart, 'MMM dd')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM dd, yyyy')}
            </h3>
            <Button variant="outline" onClick={goToNextWeek}>
              Next Week <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center">
            {weekDays.map(day => (
              <Button
                key={format(day, 'yyyy-MM-dd')}
                variant={isSameDay(day, selectedDate) ? 'default' : 'outline'}
                onClick={() => setSelectedDate(day)}
                className="flex flex-col h-auto py-2"
              >
                <span className="text-xs font-medium">{format(day, 'EEE')}</span>
                <span className="text-lg font-bold">{format(day, 'dd')}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex-grow">
        <DailyScheduleView
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          workHours={workHours}
          saveWorkHours={saveWorkHours}
          appointments={appointments}
          addAppointment={addAppointment}
          updateAppointment={updateAppointment}
          deleteAppointment={deleteAppointment}
          clearAppointmentsForDay={clearAppointmentsForDay}
          tasks={tasks}
          allCategories={allCategories}
          sections={sections as TaskSection[]}
          settings={settings}
          updateTask={updateTask}
          deleteTask={deleteTask}
          addTask={addTask}
          onToggleFocusMode={onToggleFocusMode}
          onLogDoTodayOff={onLogDoTodayOff}
        />
      </div>
    </div>
  );
};

export default TimeBlockSchedule;