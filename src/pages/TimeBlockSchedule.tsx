import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useAppointments } from '@/hooks/useAppointments';
import { useWorkHours } from '@/hooks/useWorkHours';
import { useSettings } from '@/context/SettingsContext';
import { Task, TaskCategory, TaskSection, Appointment, WorkHour, NewTaskData, UpdateTaskData, NewAppointmentData, UpdateAppointmentData, ProjectBalanceTrackerProps, TimeBlockScheduleProps, UserSettings } from '@/types';
import { format, startOfDay, addDays, subDays, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Plus, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import ScheduleGridContent from '@/components/ScheduleGridContent';
import WorkHoursSettings from '@/components/WorkHoursSettings';
import { toast } from 'react-hot-toast';

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [isWorkHoursModalOpen, setIsWorkHoursModalOpen] = useState(false);
  const [showFocusTasksOnly, setShowFocusTasksOnly] = useState(true);

  const {
    tasks,
    categories: allCategories,
    sections: allSections,
    isLoading: tasksLoading,
    error: tasksError,
    addTask,
    updateTask,
    deleteTask,
    onToggleFocusMode,
    onLogDoTodayOff,
    updateSectionIncludeInFocusMode,
    doTodayOffLog,
  } = useTasks({ userId: currentUserId, isDemo, demoUserId });

  const {
    appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments({ userId: currentUserId, date: selectedDate });

  const {
    workHours,
    isLoading: workHoursLoading,
    error: workHoursError,
    addWorkHour,
    updateWorkHour,
    deleteWorkHour,
  } = useWorkHours({ userId: currentUserId });

  const { settings, isLoading: settingsLoading, error: settingsError, updateSettings } = useSettings();

  useEffect(() => {
    setShowFocusTasksOnly(settings?.schedule_show_focus_tasks_only ?? true);
  }, [settings?.schedule_show_focus_tasks_only]);

  const handleSaveWorkHours = async (updatedWorkHours: WorkHour[]) => {
    if (!currentUserId) return;

    for (const updatedHour of updatedWorkHours) {
      const existingHour = workHours.find(wh => wh.id === updatedHour.id);
      if (existingHour) {
        await updateWorkHour({ id: existingHour.id, updates: updatedHour });
      } else if (updatedHour.enabled) {
        await addWorkHour(updatedHour);
      }
    }
    // Also handle deletion if a work hour was disabled and doesn't exist in the new list
    for (const existingHour of workHours) {
      if (!updatedWorkHours.some(uh => uh.id === existingHour.id) && !existingHour.enabled) {
        await deleteWorkHour(existingHour.id);
      }
    }
  };

  const handleToggleShowFocusTasksOnly = async (checked: boolean) => {
    setShowFocusTasksOnly(checked);
    try {
      await updateSettings({ schedule_show_focus_tasks_only: checked });
      toast.success('Setting updated!');
    } catch (error) {
      toast.error('Failed to update setting.');
      console.error('Error updating setting:', error);
    }
  };

  if (authLoading || tasksLoading || appointmentsLoading || workHoursLoading || settingsLoading) {
    return <div className="p-4 text-center">Loading schedule...</div>;
  }

  if (tasksError || appointmentsError || workHoursError || settingsError) {
    return <div className="p-4 text-red-500">Error loading data: {tasksError?.message || appointmentsError?.message || workHoursError?.message || settingsError?.message}</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Time Block Schedule</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
            <ChevronLeft className="h-4 w-4" /> Previous Day
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
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
            Next Day <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsWorkHoursModalOpen(true)}>
            <Clock className="mr-2 h-4 w-4" /> Work Hours
          </Button>
          <div className="flex items-center space-x-2">
            <Label htmlFor="show-focus-tasks-only">Focus Tasks Only</Label>
            <Switch
              id="show-focus-tasks-only"
              checked={showFocusTasksOnly}
              onCheckedChange={handleToggleShowFocusTasksOnly}
            />
          </div>
        </div>
      </div>

      <ScheduleGridContent
        currentDate={selectedDate}
        workHours={workHours}
        tasks={tasks}
        appointments={appointments}
        allCategories={allCategories}
        allSections={allSections}
        onAddAppointment={addAppointment}
        onUpdateAppointment={updateAppointment}
        onDeleteAppointment={deleteAppointment}
        onAddTask={addTask}
        onUpdateTask={updateTask}
        onDeleteTask={deleteTask}
        onAddSubtask={addTask}
        onToggleFocusMode={onToggleFocusMode}
        onLogDoTodayOff={onLogDoTodayOff}
        onUpdateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        showFocusTasksOnly={showFocusTasksOnly}
        doTodayOffLog={doTodayOffLog}
      />

      <WorkHoursSettings
        isOpen={isWorkHoursModalOpen}
        onClose={() => setIsWorkHoursModalOpen(false)}
        workHours={workHours}
        onSaveWorkHours={handleSaveWorkHours}
      />
    </div>
  );
};

export default TimeBlockSchedule;