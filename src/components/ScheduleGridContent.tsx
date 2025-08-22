import React, { useState } from 'react';
import { format, parseISO, isSameDay, addMinutes, setHours, setMinutes, isBefore, isAfter } from 'date-fns';
import { Appointment, Task, TaskSection, TaskCategory, WorkHour } from '@/types/task';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CalendarIcon, ClockIcon } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { showError, showSuccess } from '@/utils/toast';
import { useAuth } from '@/context/AuthContext';
import DraggableAppointmentCard from './DraggableAppointmentCard';
import DraggableScheduleTaskItem from './DraggableScheduleTaskItem';
import { ScheduleGridContentProps } from '@/types/props';
import { getCategoryColorProps } from '@/utils/categoryColors';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { TimeBlockActionMenu } from './TimeBlockActionMenu';

const ScheduleGridContent: React.FC<ScheduleGridContentProps> = ({
  isDemo,
  onOpenTaskOverview,
  currentViewDate,
  daysInGrid,
  allWorkHours,
  saveWorkHours,
  appointments,
  tasks,
  sections,
  categories,
  addAppointment,
  updateAppointment,
  deleteAppointment,
  onAddTask,
  onUpdateTask,
  onOpenTaskDetail,
  isLoading,
}) => {
  const { user } = useAuth();
  const userId = user?.id;

  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [newAppointmentTitle, setNewAppointmentTitle] = useState('');
  const [newAppointmentDescription, setNewAppointmentDescription] = useState('');
  const [newAppointmentDate, setNewAppointmentDate] = useState<Date | undefined>(undefined);
  const [newAppointmentStartTime, setNewAppointmentStartTime] = useState<Date | undefined>(undefined);
  const [newAppointmentEndTime, setNewAppointmentEndTime] = useState<Date | undefined>(undefined);
  const [newAppointmentColor, setNewAppointmentColor] = useState('#3b82f6'); // Default blue
  const [newAppointmentTaskId, setNewAppointmentTaskId] = useState<string | null>(null);

  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);

  const timeSlots = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return setMinutes(setHours(currentViewDate, hour), minute);
  });

  const unscheduledTasks = tasks.filter(
    (task) =>
      task.status === 'to-do' &&
      !task.parent_task_id &&
      !appointments.some((app) => app.task_id === task.id)
  );

  const getAppointmentsForTimeSlot = (slotTime: Date) => {
    return appointments.filter((app) => {
      const appStart = parseISO(`${format(parseISO(app.date), 'yyyy-MM-dd')}T${app.start_time}`);
      const appEnd = parseISO(`${format(parseISO(app.date), 'yyyy-MM-dd')}T${app.end_time}`);
      return isSameDay(appStart, slotTime) && isBefore(slotTime, appEnd) && isAfter(addMinutes(slotTime, -15), appStart);
    });
  };

  const getTasksForTimeSlot = (slotTime: Date) => {
    return tasks.filter(task => {
      if (!task.due_date || !task.section_id) return false; // Only tasks with due dates and sections can be scheduled
      const taskDueDate = parseISO(task.due_date);
      const taskSection = sections.find(s => s.id === task.section_id);
      return isSameDay(taskDueDate, slotTime) && taskSection?.include_in_focus_mode;
    });
  };

  const handleOpenAppointmentDialog = (appointment: Appointment | null, initialBlock?: { start: Date; end: Date }) => {
    if (appointment) {
      setEditingAppointment(appointment);
      setNewAppointmentTitle(appointment.title);
      setNewAppointmentDescription(appointment.description || '');
      setNewAppointmentDate(parseISO(appointment.date));
      setNewAppointmentStartTime(parseISO(`${appointment.date}T${appointment.start_time}`));
      setNewAppointmentEndTime(parseISO(`${appointment.date}T${appointment.end_time}`));
      setNewAppointmentColor(appointment.color);
      setNewAppointmentTaskId(appointment.task_id);
    } else {
      setEditingAppointment(null);
      setNewAppointmentTitle('');
      setNewAppointmentDescription('');
      setNewAppointmentDate(initialBlock?.start || currentViewDate);
      setNewAppointmentStartTime(initialBlock?.start || undefined);
      setNewAppointmentEndTime(initialBlock?.end || undefined);
      setNewAppointmentColor('#3b82f6');
      setNewAppointmentTaskId(null);
    }
    setIsAppointmentDialogOpen(true);
  };

  const handleSaveAppointment = async () => {
    if (!newAppointmentTitle.trim() || !newAppointmentDate || !newAppointmentStartTime || !newAppointmentEndTime) {
      showError('Please fill all required appointment fields.');
      return;
    }

    const appointmentData: Partial<Appointment> = {
      title: newAppointmentTitle.trim(),
      description: newAppointmentDescription,
      date: format(newAppointmentDate, 'yyyy-MM-dd'),
      start_time: format(newAppointmentStartTime, 'HH:mm:ss'),
      end_time: format(newAppointmentEndTime, 'HH:mm:ss'),
      color: newAppointmentColor,
      task_id: newAppointmentTaskId,
      user_id: userId!,
    };

    try {
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, appointmentData);
        showSuccess('Appointment updated successfully!');
      } else {
        await addAppointment(appointmentData);
        showSuccess('Appointment added successfully!');
      }
      setIsAppointmentDialogOpen(false);
    } catch (error) {
      showError('Failed to save appointment.');
      console.error('Error saving appointment:', error);
    }
  };

  const handleDeleteAppointment = async () => {
    if (editingAppointment) {
      try {
        await deleteAppointment(editingAppointment.id);
        showSuccess('Appointment deleted successfully!');
        setIsAppointmentDialogOpen(false);
      } catch (error) {
        showError('Failed to delete appointment.');
        console.error('Error deleting appointment:', error);
      }
    }
  };

  const handleScheduleTask = async (taskId: string, blockStart: Date) => {
    try {
      await onUpdateTask(taskId, { due_date: format(blockStart, 'yyyy-MM-dd') });
      showSuccess('Task scheduled successfully!');
    } catch (error) {
      showError('Failed to schedule task.');
      console.error('Error scheduling task:', error);
    }
  };

  const getWorkHoursForDay = (date: Date) => {
    const dayOfWeek = format(date, 'EEEE').toLowerCase(); // e.g., "monday"
    return allWorkHours.filter(wh => wh.day_of_week.toLowerCase() === dayOfWeek && wh.enabled);
  };

  return (
    <div className="flex-grow overflow-auto relative">
      <div className="grid grid-cols-1 min-h-full">
        {timeSlots.map((slotTime, index) => {
          const isHourStart = slotTime.getMinutes() === 0;
          const dayWorkHours = getWorkHoursForDay(slotTime);
          const isWorkHour = dayWorkHours.some(wh => {
            const start = parseISO(format(slotTime, 'yyyy-MM-dd') + 'T' + wh.start_time);
            const end = parseISO(format(slotTime, 'yyyy-MM-dd') + 'T' + wh.end_time);
            return isAfter(slotTime, start) && isBefore(slotTime, end);
          });

          const slotAppointments = getAppointmentsForTimeSlot(slotTime);
          const slotTasks = getTasksForTimeSlot(slotTime);

          return (
            <div
              key={index}
              className={cn(
                'relative h-16 border-b border-gray-200 dark:border-gray-700',
                isHourStart ? 'border-t border-gray-300 dark:border-gray-600' : '',
                isWorkHour ? 'bg-blue-50 dark:bg-blue-950' : ''
              )}
            >
              {isHourStart && (
                <div className="absolute -left-16 top-0 w-14 text-right text-xs text-gray-500 pr-2">
                  {format(slotTime, 'h a')}
                </div>
              )}

              {/* Render appointments */}
              {slotAppointments.map((app) => (
                <DraggableAppointmentCard
                  key={app.id}
                  appointment={app}
                  onClick={() => handleOpenAppointmentDialog(app)}
                  className="absolute inset-0 m-1"
                />
              ))}

              {/* Render tasks */}
              {slotTasks.map((task) => (
                <DraggableScheduleTaskItem
                  key={task.id}
                  task={task}
                  sections={sections}
                  categories={categories}
                  onClick={() => onOpenTaskDetail(task)}
                  className="absolute inset-0 m-1"
                />
              ))}

              {/* Time block action menu */}
              <TimeBlockActionMenu
                block={{ start: slotTime, end: addMinutes(slotTime, 15) }}
                onAddAppointment={(block) => handleOpenAppointmentDialog(null, block)}
                onScheduleTask={handleScheduleTask}
                unscheduledTasks={unscheduledTasks}
                sections={sections}
              />
            </div>
          );
        })}
      </div>

      {/* Appointment Dialog */}
      <Dialog open={isAppointmentDialogOpen} onOpenChange={setIsAppointmentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingAppointment ? 'Edit Appointment' : 'Add New Appointment'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={newAppointmentTitle}
                onChange={(e) => setNewAppointmentTitle(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={newAppointmentDescription}
                onChange={(e) => setNewAppointmentDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <div className="col-span-3">
                <DatePicker date={newAppointmentDate} setDate={setNewAppointmentDate} />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start-time" className="text-right">
                Start Time
              </Label>
              <div className="col-span-3">
                <TimePicker date={newAppointmentStartTime} setDate={setNewAppointmentStartTime} />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end-time" className="text-right">
                End Time
              </Label>
              <div className="col-span-3">
                <TimePicker date={newAppointmentEndTime} setDate={setNewAppointmentEndTime} />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="color" className="text-right">
                Color
              </Label>
              <Select value={newAppointmentColor} onValueChange={setNewAppointmentColor}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="#3b82f6">Blue</SelectItem> {/* Tailwind blue-500 */}
                  <SelectItem value="#22c55e">Green</SelectItem> {/* Tailwind green-500 */}
                  <SelectItem value="#ef4444">Red</SelectItem> {/* Tailwind red-500 */}
                  <SelectItem value="#eab308">Yellow</SelectItem> {/* Tailwind yellow-500 */}
                  <SelectItem value="#a855f7">Purple</SelectItem> {/* Tailwind purple-500 */}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-link" className="text-right">
                Link Task
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="col-span-3 justify-start">
                    {newAppointmentTaskId
                      ? tasks.find((t) => t.id === newAppointmentTaskId)?.description || 'Select Task'
                      : 'Select Task'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
                  <Command>
                    <CommandInput placeholder="Search tasks..." />
                    <CommandList>
                      <CommandEmpty>No tasks found.</CommandEmpty>
                      <CommandGroup>
                        {tasks
                          .filter((t) => t.status === 'to-do' && !t.parent_task_id)
                          .map((task) => (
                            <CommandItem
                              key={task.id}
                              value={task.description || ''}
                              onSelect={() => {
                                setNewAppointmentTaskId(task.id);
                              }}
                            >
                              {task.description}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            {editingAppointment && (
              <Button variant="destructive" onClick={handleDeleteAppointment}>
                Delete
              </Button>
            )}
            <Button variant="secondary" onClick={() => setIsAppointmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAppointment}>
              {editingAppointment ? 'Save Changes' : 'Add Appointment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduleGridContent;