import React, { useState, useMemo, useCallback } from 'react'; // Removed useEffect, useRef
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays } from 'lucide-react'; // Removed CalendarWeek, PanelRightClose, PanelRightOpen, ListTodo, Sparkles, X
import { useWorkHours } from '@/hooks/useWorkHours'; // Removed WorkHour type as it's not directly used here
import DailyDateNavigator from '@/components/DateNavigator'; // Renamed to avoid conflict with WeeklyDateNavigator
import WeeklyDateNavigator from '@/components/WeeklyDateNavigator';
import { useAppointments, Appointment, NewAppointmentData, UpdateAppointmentData } from '@/hooks/useAppointments';
import { useTasks, Task, TaskSection, Category } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import ScheduleGridContent from '@/components/ScheduleGridContent'; // Import the new component
import { format, addDays, startOfWeek } from 'date-fns'; // Only import what's needed for date manipulation in this file

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday as start of week

  const {
    workHours: allWorkHours,
    loading: workHoursLoading,
    saveWorkHours,
  } = useWorkHours({ userId: demoUserId });

  const {
    appointments,
    loading: appointmentsLoading,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    clearDayAppointments,
    batchAddAppointments,
  } = useAppointments({
    startDate: viewMode === 'daily' ? currentDate : currentWeekStart,
    endDate: viewMode === 'daily' ? currentDate : addDays(currentWeekStart, 6),
    userId: demoUserId,
  });

  const {
    tasks: allTasks, // rawTasks
    processedTasks, // tasks with category_color and virtual tasks
    filteredTasks: allDayTasks, // filtered processed tasks
    allCategories,
    sections,
    updateTask, // Added updateTask
    deleteTask, // Added deleteTask
    createSection, // Added createSection
    updateSection, // Added updateSection
    deleteSection, // Added deleteSection
    updateSectionIncludeInFocusMode, // Added updateSectionIncludeInFocusMode
  } = useTasks({ currentDate, userId: demoUserId });
  const { settings } = useSettings({ userId: demoUserId }); // Correct usage of useSettings

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setIsTaskOverviewOpen(false);
    // This will open the TaskForm for editing the task
    // For now, we'll just re-open the overview with the task,
    // as the TaskOverviewDialog itself contains the TaskForm.
    // If a separate TaskForm dialog is desired, it would be triggered here.
    handleOpenTaskOverview(task);
  };

  const daysInGrid = useMemo(() => {
    if (viewMode === 'daily') {
      return [currentDate];
    } else {
      return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
    }
  }, [viewMode, currentDate, currentWeekStart]);

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-center mb-8">
          <CalendarDays className="inline-block h-10 w-10 mr-3 text-primary" /> Time Block Schedule
        </h1>

        <div className="flex justify-center space-x-4 mb-6">
          <Button
            variant={viewMode === 'daily' ? 'default' : 'outline'}
            onClick={() => setViewMode('daily')}
            className="h-10 px-6 text-base"
          >
            Daily View
          </Button>
          <Button
            variant={viewMode === 'weekly' ? 'default' : 'outline'}
            onClick={() => setViewMode('weekly')}
            className="h-10 px-6 text-base"
          >
            Weekly View
          </Button>
        </div>

        {viewMode === 'daily' ? (
          <DailyDateNavigator
            currentDate={currentDate}
            onPreviousDay={() => setCurrentDate(prevDate => addDays(prevDate, -1))}
            onNextDay={() => setCurrentDate(prevDate => addDays(prevDate, 1))}
            onGoToToday={() => setCurrentDate(new Date())}
            setCurrentDate={setCurrentDate}
          />
        ) : (
          <WeeklyDateNavigator
            currentWeekStart={currentWeekStart}
            onPreviousWeek={() => setCurrentWeekStart(prevWeekStart => addDays(prevWeekStart, -7))}
            onNextWeek={() => setCurrentWeekStart(prevWeekStart => addDays(prevWeekStart, 7))}
            onGoToCurrentWeek={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            setCurrentWeekStart={setCurrentWeekStart}
          />
        )}

        <div className="mt-6">
          <ScheduleGridContent
            isDemo={isDemo}
            onOpenTaskOverview={handleOpenTaskOverview}
            currentViewDate={currentDate}
            daysInGrid={daysInGrid}
            allWorkHours={allWorkHours as any} // Cast to any to resolve type mismatch with WorkHour[]
            saveWorkHours={saveWorkHours}
            appointments={appointments}
            addAppointment={addAppointment}
            updateAppointment={updateAppointment}
            deleteAppointment={deleteAppointment}
            clearDayAppointments={clearDayAppointments}
            batchAddAppointments={batchAddAppointments}
            allTasks={processedTasks} // Use processedTasks which includes category_color
            allDayTasks={allDayTasks}
            allCategories={allCategories}
            sections={sections}
            settings={settings}
            isLoading={workHoursLoading || appointmentsLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default TimeBlockSchedule;