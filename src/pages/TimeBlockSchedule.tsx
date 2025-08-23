import React, { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useAppointments } from '@/hooks/useAppointments';
import { useWorkHours } from '@/hooks/useWorkHours';
import { useSettings } from '@/context/SettingsContext';
import { Task, TaskCategory, TaskSection, Appointment, WorkHour, NewTaskData, UpdateTaskData, NewAppointmentData, UpdateAppointmentData, ProjectBalanceTrackerProps } from '@/types';
import { format, startOfDay, addMinutes, isSameDay, parse } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ScheduleGridContent from '@/components/ScheduleGridContent';
import { toast } from 'react-hot-toast';

const TimeBlockSchedule: React.FC<ProjectBalanceTrackerProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const { settings, updateSettings } = useSettings();

  const {
    tasks,
    categories: allCategories,
    sections: allSections,
    isLoading: tasksLoading,
    error: tasksError,
    addTask,
    updateTask,
    deleteTask,
    updateSectionIncludeInFocusMode,
    onToggleFocusMode, // Added from useTasks
    onLogDoTodayOff, // Added from useTasks
  } = useTasks({ userId: currentUserId! });

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
    fetchWorkHourForDay,
    singleDayWorkHour,
    isLoadingSingleDay,
    errorSingleDay,
  } = useWorkHours();

  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [newAppointmentTitle, setNewAppointmentTitle] = useState('');
  const [newAppointmentDescription, setNewAppointmentDescription] = useState('');
  const [newAppointmentStartTime, setNewAppointmentStartTime] = useState('09:00');
  const [newAppointmentEndTime, setNewAppointmentEndTime] = useState('10:00');
  const [newAppointmentColor, setNewAppointmentColor] = useState('#3b82f6'); // Default blue
  const [newAppointmentTaskId, setNewAppointmentTaskId] = useState<string | null>(null);

  const [isEditAppointmentModalOpen, setIsEditAppointmentModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editAppointmentTitle, setEditAppointmentTitle] = useState('');
  const [editAppointmentDescription, setEditAppointmentDescription] = useState('');
  const [editAppointmentStartTime, setEditAppointmentStartTime] = useState('');
  const [editAppointmentEndTime, setEditAppointmentEndTime] = useState('');
  const [editAppointmentColor, setEditAppointmentColor] = useState('');
  const [editAppointmentTaskId, setEditAppointmentTaskId] = useState<string | null>(null);

  const [isWorkHoursModalOpen, setIsWorkHoursModalOpen] = useState(false);
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [workEndTime, setWorkEndTime] = useState('17:00');
  const [workHoursEnabled, setWorkHoursEnabled] = useState(true);

  const availableTasks = useMemo(() => {
    if (!tasks) return [];
    const focusModeOnly = settings?.schedule_show_focus_tasks_only;
    return tasks.filter(task =>
      task.status !== 'completed' &&
      task.status !== 'archived' &&
      !task.parent_task_id && // Only show top-level tasks
      (focusModeOnly ? allSections?.find(s => s.id === task.section_id)?.include_in_focus_mode : true)
    );
  }, [tasks, settings, allSections]);

  const handleOpenNewAppointmentModal = (task?: Task) => {
    setNewAppointmentTitle(task?.description || '');
    setNewAppointmentDescription(task?.notes || '');
    setNewAppointmentTaskId(task?.id || null);
    setNewAppointmentStartTime('09:00');
    setNewAppointmentEndTime('10:00');
    setNewAppointmentColor('#3b82f6');
    setIsNewAppointmentModalOpen(true);
  };

  const handleAddAppointment = async () => {
    if (!newAppointmentTitle.trim() || !newAppointmentStartTime || !newAppointmentEndTime) {
      toast.error('Title, start time, and end time are required.');
      return;
    }
    try {
      const newAppointmentData: NewAppointmentData = {
        title: newAppointmentTitle.trim(),
        description: newAppointmentDescription.trim() || null,
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: newAppointmentStartTime + ':00',
        end_time: newAppointmentEndTime + ':00',
        color: newAppointmentColor,
        task_id: newAppointmentTaskId,
      };
      await addAppointment(newAppointmentData);
      toast.success('Appointment added!');
      setIsNewAppointmentModalOpen(false);
    } catch (err) {
      toast.error(`Failed to add appointment: ${(err as Error).message}`);
      console.error('Error adding appointment:', err);
    }
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setEditAppointmentTitle(appointment.title);
    setEditAppointmentDescription(appointment.description || '');
    setEditAppointmentStartTime(appointment.start_time.substring(0, 5));
    setEditAppointmentEndTime(appointment.end_time.substring(0, 5));
    setEditAppointmentColor(appointment.color);
    setEditAppointmentTaskId(appointment.task_id);
    setIsEditAppointmentModalOpen(true);
  };

  const handleUpdateAppointment = async () => {
    if (!editingAppointment || !editAppointmentTitle.trim() || !editAppointmentStartTime || !editAppointmentEndTime) {
      toast.error('Title, start time, and end time are required.');
      return;
    }
    try {
      const updates: UpdateAppointmentData = {
        title: editAppointmentTitle.trim(),
        description: editAppointmentDescription.trim() || null,
        start_time: editAppointmentStartTime + ':00',
        end_time: editAppointmentEndTime + ':00',
        color: editAppointmentColor,
        task_id: editAppointmentTaskId,
      };
      await updateAppointment({ id: editingAppointment.id, updates });
      toast.success('Appointment updated!');
      setIsEditAppointmentModalOpen(false);
      setEditingAppointment(null);
    } catch (err) {
      toast.error(`Failed to update appointment: ${(err as Error).message}`);
      console.error('Error updating appointment:', err);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        await deleteAppointment(id);
        toast.success('Appointment deleted!');
      } catch (err) {
        toast.error(`Failed to delete appointment: ${(err as Error).message}`);
        console.error('Error deleting appointment:', err);
      }
    }
  };

  const handleOpenWorkHoursModal = useCallback(async () => {
    const dayOfWeek = format(selectedDate, 'EEEE').toLowerCase();
    await fetchWorkHourForDay(dayOfWeek);
    setWorkStartTime(singleDayWorkHour?.start_time?.substring(0, 5) || '09:00');
    setWorkEndTime(singleDayWorkHour?.end_time?.substring(0, 5) || '17:00');
    setWorkHoursEnabled(singleDayWorkHour?.enabled ?? true);
    setIsWorkHoursModalOpen(true);
  }, [selectedDate, fetchWorkHourForDay, singleDayWorkHour]);

  const handleSaveWorkHours = async () => {
    const dayOfWeek = format(selectedDate, 'EEEE').toLowerCase();
    const updates: UpdateWorkHourData = {
      start_time: workStartTime + ':00',
      end_time: workEndTime + ':00',
      enabled: workHoursEnabled,
    };

    try {
      if (singleDayWorkHour) {
        await updateWorkHour({ id: singleDayWorkHour.id, updates });
      } else {
        toast.error("Adding new work hours for a day is not yet implemented. Please update existing ones.");
      }
      toast.success('Work hours updated!');
      setIsWorkHoursModalOpen(false);
    } catch (err) {
      toast.error(`Failed to save work hours: ${(err as Error).message}`);
      console.error('Error saving work hours:', err);
    }
  };

  const isLoadingData = tasksLoading || appointmentsLoading || workHoursLoading || authLoading || isLoadingSingleDay;
  const hasError = tasksError || appointmentsError || workHoursError || errorSingleDay;

  if (isLoadingData) {
    return <div className="flex justify-center items-center h-full">Loading schedule...</div>;
  }

  if (hasError) {
    return <div className="flex justify-center items-center h-full text-red-500">Error: {hasError.message}</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4">
      {/* Left Panel: Date Selector and Tasks */}
      <div className="w-full lg:w-1/2 flex flex-col space-y-6">
        <Card className="flex-shrink-0">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(startOfDay(date))}
              initialFocus
            />
          </CardContent>
        </Card>

        <Card className="flex-grow flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tasks for {format(selectedDate, 'PPP')}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleOpenNewAppointmentModal()}>
              <Plus className="mr-2 h-4 w-4" /> Add Appointment
            </Button>
          </CardHeader>
          <CardContent className="flex-grow overflow-y-auto">
            <ScheduleGridContent
              selectedDate={selectedDate}
              appointments={appointments || []}
              tasks={tasks || []}
              allCategories={allCategories || []}
              allSections={allSections || []}
              settings={settings}
              addAppointment={addAppointment}
              updateAppointment={updateAppointment}
              deleteAppointment={deleteAppointment}
              addTask={addTask}
              updateTask={updateTask}
              deleteTask={deleteTask}
              onToggleFocusMode={onToggleFocusMode}
              onLogDoTodayOff={onLogDoTodayOff}
              handleOpenNewAppointmentModal={handleOpenNewAppointmentModal}
              handleEditAppointment={handleEditAppointment}
              updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            />
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: Daily Schedule */}
      <Card className="w-full lg:w-1/2 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daily Schedule for {format(selectedDate, 'PPP')}</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleOpenWorkHoursModal}>
              <Clock className="mr-2 h-4 w-4" /> Work Hours
            </Button>
            <Button variant="outline" size="sm" onClick={() => settings && updateSettings({ schedule_show_focus_tasks_only: !settings.schedule_show_focus_tasks_only })}>
              {settings?.schedule_show_focus_tasks_only ? 'Show All Tasks' : 'Show Focus Tasks'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto">
          {/* Schedule grid content will go here */}
          <p className="text-center text-gray-500">Schedule visualization to be implemented.</p>
        </CardContent>
      </Card>

      {/* New Appointment Modal */}
      <Dialog open={isNewAppointmentModalOpen} onOpenChange={setIsNewAppointmentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Appointment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Title</Label>
              <Input id="title" value={newAppointmentTitle} onChange={(e) => setNewAppointmentTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Input id="description" value={newAppointmentDescription} onChange={(e) => setNewAppointmentDescription(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startTime" className="text-right">Start Time</Label>
              <Input id="startTime" type="time" value={newAppointmentStartTime} onChange={(e) => setNewAppointmentStartTime(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endTime" className="text-right">End Time</Label>
              <Input id="endTime" type="time" value={newAppointmentEndTime} onChange={(e) => setNewAppointmentEndTime(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="color" className="text-right">Color</Label>
              <Input id="color" type="color" value={newAppointmentColor} onChange={(e) => setNewAppointmentColor(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task" className="text-right">Link Task</Label>
              <Select value={newAppointmentTaskId || ''} onValueChange={(value) => setNewAppointmentTaskId(value || null)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {availableTasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleAddAppointment}>Add Appointment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Modal */}
      <Dialog open={isEditAppointmentModalOpen} onOpenChange={setIsEditAppointmentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-title" className="text-right">Title</Label>
              <Input id="edit-title" value={editAppointmentTitle} onChange={(e) => setEditAppointmentTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">Description</Label>
              <Input id="edit-description" value={editAppointmentDescription} onChange={(e) => setEditAppointmentDescription(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-startTime" className="text-right">Start Time</Label>
              <Input id="edit-startTime" type="time" value={editAppointmentStartTime} onChange={(e) => setEditAppointmentStartTime(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-endTime" className="text-right">End Time</Label>
              <Input id="edit-endTime" type="time" value={editAppointmentEndTime} onChange={(e) => setEditAppointmentEndTime(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-color" className="text-right">Color</Label>
              <Input id="edit-color" type="color" value={editAppointmentColor} onChange={(e) => setEditAppointmentColor(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-task" className="text-right">Link Task</Label>
              <Select value={editAppointmentTaskId || ''} onValueChange={(value) => setEditAppointmentTaskId(value || null)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {availableTasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateAppointment}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Work Hours Modal */}
      <Dialog open={isWorkHoursModalOpen} onOpenChange={setIsWorkHoursModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Work Hours for {format(selectedDate, 'EEEE')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="workHoursEnabled"
                checked={workHoursEnabled}
                onChange={(e) => setWorkHoursEnabled(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <Label htmlFor="workHoursEnabled">Enable Work Hours for this day</Label>
            </div>
            {workHoursEnabled && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="workStartTime" className="text-right">Start Time</Label>
                  <Input id="workStartTime" type="time" value={workStartTime} onChange={(e) => setWorkStartTime(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="workEndTime" className="text-right">End Time</Label>
                  <Input id="workEndTime" type="time" value={workEndTime} onChange={(e) => setWorkEndTime(e.target.value)} className="col-span-3" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSaveWorkHours}>Save Work Hours</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeBlockSchedule;