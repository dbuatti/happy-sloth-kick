import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useAppointments } from '@/hooks/useAppointments';
import { useWorkHours } from '@/hooks/useWorkHours';
import { useSettings } from '@/context/SettingsContext';
import { Task, TaskCategory, TaskSection, Appointment, WorkHour, NewTaskData, UpdateTaskData, NewAppointmentData, UpdateAppointmentData, ProjectBalanceTrackerProps, TimeBlockScheduleProps } from '@/types';
import { format, startOfDay, addDays, subDays, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Plus, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import ScheduleGridContent from '@/components/ScheduleGridContent';
import WorkHoursSettings from '@/components/WorkHoursSettings';
import { toast } from 'react-hot-toast';
import { Switch } from '@/components/ui/switch';

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const { settings, updateSettings, loading: settingsLoading } = useSettings();

  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [isWorkHoursModalOpen, setIsWorkHoursModalOpen] = useState(false);
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [workEndTime, setWorkEndTime] = useState('17:00');
  const [showFocusTasksOnly, setShowFocusTasksOnly] = useState(settings?.schedule_show_focus_tasks_only ?? true);

  const {
    tasks,
    categories: allCategories,
    sections: allSections,
    isLoading: tasksLoading,
    error: tasksError,
    addTask,
    updateTask,
    deleteTask,
    onAddSubtask,
    onToggleFocusMode,
    updateSectionIncludeInFocusMode,
  } = useTasks({ userId: currentUserId, isDemo, demoUserId });

  const {
    appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments(selectedDate);

  const {
    workHours,
    isLoading: workHoursLoading,
    error: workHoursError,
    updateWorkHour,
    addWorkHour,
  } = useWorkHours(currentUserId);

  const isLoading = authLoading || tasksLoading || appointmentsLoading || workHoursLoading || settingsLoading;
  const error = tasksError || appointmentsError || workHoursError;

  useEffect(() => {
    setShowFocusTasksOnly(settings?.schedule_show_focus_tasks_only ?? true);
  }, [settings?.schedule_show_focus_tasks_only]);

  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const handleToday = () => {
    setSelectedDate(startOfDay(new Date()));
  };

  const handleToggleShowFocusTasksOnly = async (checked: boolean) => {
    setShowFocusTasksOnly(checked);
    await updateSettings({ schedule_show_focus_tasks_only: checked });
  };

  const handleOpenWorkHoursModal = useCallback(async () => {
    const dayOfWeek = format(selectedDate, 'EEEE').toLowerCase();
    const currentDayWorkHour = workHours?.find(wh => wh.day_of_week === dayOfWeek);
    if (currentDayWorkHour) {
      setWorkStartTime(currentDayWorkHour.start_time.substring(0, 5));
      setWorkEndTime(currentDayWorkHour.end_time.substring(0, 5));
    } else {
      setWorkStartTime('09:00');
      setWorkEndTime('17:00');
    }
    setIsWorkHoursModalOpen(true);
  }, [selectedDate, workHours]);

  const handleSaveWorkHours = async (dayOfWeek: string, startTime: string, endTime: string, enabled: boolean) => {
    const existingWorkHour = workHours?.find(wh => wh.day_of_week === dayOfWeek);
    const updates: UpdateWorkHourData = {
      start_time: startTime + ':00',
      end_time: endTime + ':00',
      enabled: enabled,
    };

    try {
      if (existingWorkHour) {
        await updateWorkHour({ id: existingWorkHour.id, updates });
      } else {
        await addWorkHour({ day_of_week: dayOfWeek, start_time: startTime + ':00', end_time: endTime + ':00', enabled: enabled, user_id: currentUserId! });
      }
      toast.success('Work hours updated!');
      setIsWorkHoursModalOpen(false);
    } catch (err) {
      toast.error('Failed to save work hours.');
      console.error(err);
    }
  };

  if (!currentUserId) {
    return <p>Please log in to view your time block schedule.</p>;
  }

  if (isLoading) {
    return <p>Loading schedule...</p>;
  }

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Time Block Schedule</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handlePreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[180px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={() => setIsWorkHoursModalOpen(true)}>
            <Settings className="mr-2 h-4 w-4" /> Work Hours
          </Button>
          <div className="flex items-center space-x-2">
            <Label htmlFor="focus-tasks-toggle">Focus Tasks Only</Label>
            <Switch
              id="focus-tasks-toggle"
              checked={showFocusTasksOnly}
              onCheckedChange={handleToggleShowFocusTasksOnly}
            />
          </div>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden">
        <CardContent className="h-full p-0">
          <ScheduleGridContent
            currentDate={selectedDate}
            appointments={appointments || []}
            tasks={tasks || []}
            workHours={workHours || []}
            allCategories={allCategories || []}
            allSections={allSections || []}
            showFocusTasksOnly={showFocusTasksOnly}
            onAddAppointment={addAppointment}
            onUpdateAppointment={updateAppointment}
            onDeleteAppointment={deleteAppointment}
            onAddTask={addTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={deleteTask}
            onAddSubtask={onAddSubtask}
            onToggleFocusMode={onToggleFocusMode}
          />
        </CardContent>
      </Card>

      <WorkHoursSettings
        isOpen={isWorkHoursModalOpen}
        onClose={() => setIsWorkHoursModalOpen(false)}
        workHours={workHours || []}
        onSaveWorkHours={handleSaveWorkHours}
      />
    </div>
  );
};

export default TimeBlockSchedule;