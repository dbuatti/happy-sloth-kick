import React, { useMemo, useCallback } from 'react';
import { format, addDays, subDays, isToday, isSameDay, parseISO, isValid } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWorkHours } from '@/hooks/useWorkHours';
import { useAppointments } from '@/hooks/useAppointments';
import { useTasks } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import ScheduleGridContent from '@/components/ScheduleGridContent';
import { cn } from '@/lib/utils';
import { Task } from '@/hooks/useTasks';

interface DailyScheduleViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  isDemo?: boolean;
  demoUserId?: string;
  onOpenTaskOverview: (task: any) => void;
}

const DailyScheduleView: React.FC<DailyScheduleViewProps> = ({
  currentDate,
  setCurrentDate,
  isDemo = false,
  demoUserId,
  onOpenTaskOverview,
}) => {
  const userId = isDemo ? demoUserId : undefined;
  
  const { workHours, saveWorkHours } = useWorkHours({ userId });
  const {
    appointments,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    clearDayAppointments,
    batchAddAppointments,
    loading: appointmentsLoading,
  } = useAppointments({ 
    startDate: currentDate, 
    endDate: currentDate,
    userId 
  });
  
  const {
    tasks: allTasks,
    sections,
    allCategories,
    loading: tasksLoading,
  } = useTasks({ currentDate, userId });

  const { settings } = useSettings();

  // Combine real tasks for the current day
  const tasksForCurrentDay = useMemo(() => {
    // Filter real tasks that are due today or have no due date (all-day tasks)
    return allTasks.filter(task => {
      if (!task.due_date) return true; // All-day tasks
      const taskDate = parseISO(task.due_date);
      return isValid(taskDate) && isSameDay(taskDate, currentDate);
    });
  }, [allTasks, currentDate]);

  // Filter to only get "Do Today" tasks (to-do status)
  const allDayTasks = useMemo(() => {
    return tasksForCurrentDay.filter(task => task.status === 'to-do');
  }, [tasksForCurrentDay]);

  const handlePreviousDay = useCallback(() => {
    setCurrentDate(subDays(currentDate, 1));
  }, [currentDate, setCurrentDate]);

  const handleNextDay = useCallback(() => {
    setCurrentDate(addDays(currentDate, 1));
  }, [currentDate, setCurrentDate]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, [setCurrentDate]);

  const isLoading = appointmentsLoading || tasksLoading;

  // Ensure workHours is always an array
  const workHoursArray = Array.isArray(workHours) ? workHours : workHours ? [workHours] : [];

  return (
    <div className="flex flex-col h-full">
      {/* Date Navigation Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousDay} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            onClick={handleToday}
            className={cn("font-medium", isToday(currentDate) && "bg-primary text-primary-foreground")}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextDay} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-2">
            <h2 className="text-xl font-bold">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h2>
            <p className="text-sm text-muted-foreground">
              {isToday(currentDate) ? 'Today' : format(currentDate, 'EEEE')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Daily View
          </Badge>
        </div>
      </div>

      {/* Schedule Grid */}
      <Card className="flex-grow flex flex-col overflow-hidden shadow-none border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Schedule</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow p-0">
          <ScheduleGridContent
            isDemo={isDemo}
            onOpenTaskOverview={onOpenTaskOverview}
            currentViewDate={currentDate}
            daysInGrid={[currentDate]} // Only current day
            allWorkHours={workHoursArray} // Ensure it's always an array
            saveWorkHours={saveWorkHours}
            appointments={appointments}
            addAppointment={addAppointment}
            updateAppointment={(id, updates) => updateAppointment({ id, updates } as any)}
            deleteAppointment={deleteAppointment}
            clearDayAppointments={clearDayAppointments}
            batchAddAppointments={batchAddAppointments}
            allTasks={tasksForCurrentDay as Task[]} // Type assertion to Task[]
            allDayTasks={allDayTasks as Task[]} // Type assertion to Task[]
            allCategories={allCategories}
            sections={sections}
            settings={settings}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyScheduleView;