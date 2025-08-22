"use client";

import React, { useState, useMemo } from 'react';
import { format, parseISO, isSameHour, isSameMinute, setHours, setMinutes, addMinutes, isBefore, isAfter } from 'date-fns';
import { Appointment, NewAppointmentData, UpdateAppointmentData } from '@/hooks/useAppointments';
import { Task, TaskSection, TaskCategory } from '@/types/task'; // Corrected import
import DraggableAppointmentCard from './DraggableAppointmentCard';
import DraggableScheduleTaskItem from './DraggableScheduleTaskItem';
import TimeBlockActionMenu from './TimeBlockActionMenu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';
import { parseAppointmentText } from '@/integrations/supabase/api';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks'; // Import useTasks for task management

interface ScheduleGridContentProps {
  date: Date;
  appointments: Appointment[];
  tasks: Task[];
  sections: TaskSection[];
  categories: TaskCategory[];
  onAddAppointment: (data: NewAppointmentData) => Promise<void>;
  onUpdateAppointment: (id: string, data: UpdateAppointmentData) => Promise<void>;
  onDeleteAppointment: (id: string) => Promise<void>;
  onAddTask: (payload: { description: string; due_date?: string | null; section_id?: string | null; priority?: string; category?: string | null }) => Promise<boolean>;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onOpenTaskDetail: (task: Task) => void;
  onOpenAppointmentDetail: (appointment: Appointment) => void;
  showFocusTasksOnly: boolean;
  futureTasksDaysVisible: number;
}

const ScheduleGridContent: React.FC<ScheduleGridContentProps> = ({
  date,
  appointments,
  tasks,
  sections,
  categories,
  onAddAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
  onAddTask,
  onUpdateTask,
  onOpenTaskDetail,
  onOpenAppointmentDetail,
  showFocusTasksOnly,
  futureTasksDaysVisible,
}) => {
  const { user } = useAuth();
  const { handleAddTask: addTaskFromHook } = useTasks({ currentDate: date, userId: user?.id }); // Use the hook's addTask

  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [appointmentTitle, setAppointmentTitle] = useState('');
  const [appointmentDescription, setAppointmentDescription] = useState('');
  const [appointmentStartTime, setAppointmentStartTime] = useState('09:00');
  const [appointmentEndTime, setAppointmentEndTime] = useState('10:00');
  const [appointmentColor, setAppointmentColor] = useState('#3b82f6'); // Default blue
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(date);
  const [appointmentTaskId, setAppointmentTaskId] = useState<string | null>(null);

  const [selectedTimeBlock, setSelectedTimeBlock] = useState<string | null>(null); // HH:mm format
  const [isTimeBlockMenuOpen, setIsTimeBlockMenuOpen] = useState(false);

  const timeSlots = useMemo(() => {
    const slots = [];
    let currentTime = setMinutes(setHours(date, 0), 0); // Start of the day
    for (let i = 0; i < 24 * 4; i++) { // 24 hours * 4 (15-minute intervals)
      slots.push(currentTime);
      currentTime = addMinutes(currentTime, 15);
    }
    return slots;
  }, [date]);

  const filteredTasks = useMemo(() => {
    const todayTasks = tasks.filter(task =>
      task.due_date && format(parseISO(task.due_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') &&
      task.status !== 'completed' && task.status !== 'archived' && !task.parent_task_id
    );

    const unassignedTasks = tasks.filter(task =>
      !task.section_id && !task.due_date && task.status !== 'completed' && task.status !== 'archived' && !task.parent_task_id
    );

    const focusModeTasks = tasks.filter(task =>
      task.include_in_focus_mode && task.status !== 'completed' && task.status !== 'archived' && !task.parent_task_id
    );

    const futureTasks = tasks.filter(task =>
      task.due_date && isAfter(parseISO(task.due_date), date) &&
      isBefore(parseISO(task.due_date), addMinutes(date, futureTasksDaysVisible * 24 * 60)) &&
      task.status !== 'completed' && task.status !== 'archived' && !task.parent_task_id
    );

    let combinedTasks = [...todayTasks, ...unassignedTasks, ...futureTasks];

    if (showFocusTasksOnly) {
      combinedTasks = [...focusModeTasks];
    }

    // Filter out tasks already assigned to an appointment on this date
    const assignedTaskIds = appointments
      .filter(app => format(parseISO(app.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') && app.task_id)
      .map(app => app.task_id);

    return combinedTasks.filter(task => !assignedTaskIds.includes(task.id));
  }, [tasks, date, appointments, showFocusTasksOnly, futureTasksDaysVisible]);

  const handleOpenAppointmentForm = (time: string, appointment?: Appointment) => {
    setEditingAppointment(appointment || null);
    setAppointmentTitle(appointment?.title || '');
    setAppointmentDescription(appointment?.description || '');
    setAppointmentStartTime(appointment?.start_time || time);
    setAppointmentEndTime(appointment?.end_time || format(addMinutes(parseISO(`2000-01-01T${time}`), 60), 'HH:mm'));
    setAppointmentColor(appointment?.color || '#3b82f6');
    setAppointmentDate(appointment?.date ? parseISO(appointment.date) : date);
    setAppointmentTaskId(appointment?.task_id || null);
    setIsAppointmentFormOpen(true);
  };

  const handleCloseAppointmentForm = () => {
    setIsAppointmentFormOpen(false);
    setEditingAppointment(null);
    setAppointmentTitle('');
    setAppointmentDescription('');
    setAppointmentStartTime('09:00');
    setAppointmentEndTime('10:00');
    setAppointmentColor('#3b82f6');
    setAppointmentDate(date);
    setAppointmentTaskId(null);
  };

  const handleSaveAppointment = async () => {
    if (!appointmentTitle.trim() || !appointmentDate || !appointmentStartTime || !appointmentEndTime) {
      showError("Title, date, start time, and end time are required.");
      return;
    }

    const startDateTime = parseISO(`${format(appointmentDate, 'yyyy-MM-dd')}T${appointmentStartTime}`);
    const endDateTime = parseISO(`${format(appointmentDate, 'yyyy-MM-dd')}T${appointmentEndTime}`);

    if (isBefore(endDateTime, startDateTime)) {
      showError("End time cannot be before start time.");
      return;
    }

    const appointmentData = {
      title: appointmentTitle.trim(),
      description: appointmentDescription.trim() || null,
      date: format(appointmentDate, 'yyyy-MM-dd'),
      start_time: appointmentStartTime,
      end_time: appointmentEndTime,
      color: appointmentColor,
      task_id: appointmentTaskId,
    };

    try {
      if (editingAppointment) {
        await onUpdateAppointment(editingAppointment.id, appointmentData);
        showSuccess("Appointment updated successfully!");
      } else {
        await onAddAppointment(appointmentData);
        showSuccess("Appointment created successfully!");
      }
      handleCloseAppointmentForm();
    } catch (error) {
      showError("Failed to save appointment.");
      console.error("Failed to save appointment:", error);
    }
  };

  const handleDeleteAppointmentClick = async () => {
    if (editingAppointment) {
      try {
        await onDeleteAppointment(editingAppointment.id);
        showSuccess("Appointment deleted successfully!");
        handleCloseAppointmentForm();
      } catch (error) {
        showError("Failed to delete appointment.");
        console.error("Failed to delete appointment:", error);
      }
    }
  };

  const handleTimeBlockClick = (time: Date) => {
    setSelectedTimeBlock(format(time, 'HH:mm'));
    setIsTimeBlockMenuOpen(true);
  };

  const handleCloseTimeBlockMenu = () => {
    setSelectedTimeBlock(null);
    setIsTimeBlockMenuOpen(false);
  };

  const handleAddTaskToTimeBlock = async (time: string) => {
    const description = prompt("Enter task description:");
    if (description) {
      const success = await addTaskFromHook({
        description,
        due_date: format(date, 'yyyy-MM-dd'),
        // Optionally set a section or priority here
      });
      if (success) {
        showSuccess("Task added!");
      } else {
        showError("Failed to add task.");
      }
    }
    handleCloseTimeBlockMenu();
  };

  const handleAddAppointmentToTimeBlock = (time: string) => {
    handleOpenAppointmentForm(time);
    handleCloseTimeBlockMenu();
  };

  const handleEditAppointmentFromMenu = () => {
    const app = appointments.find(a =>
      format(parseISO(`2000-01-01T${a.start_time}`), 'HH:mm') === selectedTimeBlock &&
      format(parseISO(a.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    if (app) {
      handleOpenAppointmentForm(selectedTimeBlock!, app);
    }
    handleCloseTimeBlockMenu();
  };

  const handleDeleteAppointmentFromMenu = async () => {
    const app = appointments.find(a =>
      format(parseISO(`2000-01-01T${a.start_time}`), 'HH:mm') === selectedTimeBlock &&
      format(parseISO(a.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    if (app) {
      try {
        await onDeleteAppointment(app.id);
        showSuccess("Appointment deleted!");
      } catch (error) {
        showError("Failed to delete appointment.");
        console.error("Failed to delete appointment:", error);
      }
    }
    handleCloseTimeBlockMenu();
  };

  const handleAssignTaskToAppointment = async (taskId: string | null) => {
    const app = appointments.find(a =>
      format(parseISO(`2000-01-01T${a.start_time}`), 'HH:mm') === selectedTimeBlock &&
      format(parseISO(a.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    if (app) {
      try {
        await onUpdateAppointment(app.id, { task_id: taskId });
        showSuccess("Task assigned to appointment!");
      } catch (error) {
        showError("Failed to assign task.");
        console.error("Failed to assign task:", error);
      }
    }
    handleCloseTimeBlockMenu();
  };

  const getAppointmentsForTimeSlot = (slotTime: Date) => {
    return appointments.filter(app => {
      const appStart = parseISO(`2000-01-01T${app.start_time}`);
      const appEnd = parseISO(`2000-01-01T${app.end_time}`);
      const slotStart = slotTime;
      const slotEnd = addMinutes(slotTime, 14); // 15-minute slot

      return format(parseISO(app.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') &&
             ((isSameHour(appStart, slotStart) && isSameMinute(appStart, slotStart)) ||
              (isAfter(appStart, slotStart) && isBefore(appStart, slotEnd)) ||
              (isBefore(appStart, slotStart) && isAfter(appEnd, slotStart)));
    });
  };

  const getTasksForTimeSlot = (slotTime: Date) => {
    return tasks.filter(task =>
      task.due_date && format(parseISO(task.due_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') &&
      task.status !== 'completed' && task.status !== 'archived' &&
      !appointments.some(app => app.task_id === task.id && format(parseISO(app.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) &&
      !task.parent_task_id // Only show top-level tasks
    );
  };

  return (
    <div className="grid grid-cols-[60px_1fr_1fr] gap-x-2 h-full">
      {/* Time Labels */}
      <div className="col-span-1 flex flex-col sticky top-0 bg-background z-10">
        {timeSlots.filter((_, i) => i % 4 === 0).map((slot, index) => (
          <div key={index} className="h-[60px] flex items-center justify-end pr-2 text-xs text-muted-foreground border-b">
            {format(slot, 'h a')}
          </div>
        ))}
      </div>

      {/* Schedule Grid */}
      <div className="col-span-2 flex flex-col relative">
        {timeSlots.map((slot, index) => {
          const slotAppointments = getAppointmentsForTimeSlot(slot);
          const slotTasks = getTasksForTimeSlot(slot);
          const isCurrentTimeSlot = isSameHour(slot, new Date()) && isSameMinute(slot, setMinutes(new Date(), Math.floor(new Date().getMinutes() / 15) * 15));
          const hasContent = slotAppointments.length > 0 || slotTasks.length > 0;

          return (
            <div
              key={index}
              className={cn(
                "relative h-[15px] border-b border-l",
                index % 4 === 0 ? "border-t" : "",
                isCurrentTimeSlot ? "bg-primary/10" : "hover:bg-accent/20",
                hasContent ? "z-10" : "z-0"
              )}
              onClick={() => handleTimeBlockClick(slot)}
            >
              {slotAppointments.map(app => {
                const appTask = tasks.find(t => t.id === app.task_id);
                const appStart = parseISO(`2000-01-01T${app.start_time}`);
                const appEnd = parseISO(`2000-01-01T${app.end_time}`);
                const durationMinutes = (appEnd.getTime() - appStart.getTime()) / (1000 * 60);
                const height = (durationMinutes / 15) * 15; // Height in pixels for 15-minute slots

                // Only render if this is the start of the appointment
                if (isSameHour(appStart, slot) && isSameMinute(appStart, slot)) {
                  return (
                    <DraggableAppointmentCard
                      key={app.id}
                      appointment={app}
                      task={appTask}
                      onClick={onOpenAppointmentDetail}
                      className="absolute left-0 right-0 p-1 z-20"
                      style={{ height: `${height}px` }}
                    />
                  );
                }
                return null;
              })}

              {slotTasks.map(task => (
                <DraggableScheduleTaskItem
                  key={task.id}
                  task={task}
                  sections={sections}
                  onClick={onOpenTaskDetail}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Time Block Action Menu */}
      {isTimeBlockMenuOpen && selectedTimeBlock && (
        <div className="absolute top-0 left-0 w-full h-full bg-background/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={handleCloseTimeBlockMenu}>
          <div className="bg-card p-4 rounded-lg shadow-lg" onClick={(e) => e.stopPropagation()}>
            <TimeBlockActionMenu
              selectedTime={selectedTimeBlock}
              onAddTask={handleAddTaskToTimeBlock}
              onAddAppointment={handleAddAppointmentToTimeBlock}
              onEditAppointment={handleEditAppointmentFromMenu}
              onDeleteAppointment={handleDeleteAppointmentFromMenu}
              onAssignTask={handleAssignTaskToAppointment}
              availableTasks={filteredTasks}
              isAppointmentSelected={appointments.some(a =>
                format(parseISO(`2000-01-01T${a.start_time}`), 'HH:mm') === selectedTimeBlock &&
                format(parseISO(a.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
              )}
            />
            <Button variant="outline" onClick={handleCloseTimeBlockMenu} className="mt-4 w-full">Close</Button>
          </div>
        </div>
      )}

      {/* Appointment Form Dialog */}
      <Dialog open={isAppointmentFormOpen} onOpenChange={handleCloseAppointmentForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingAppointment ? 'Edit Appointment' : 'Add New Appointment'}</DialogTitle>
            <DialogDescription>
              Fill in the details for your appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={appointmentTitle}
                onChange={(e) => setAppointmentTitle(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={appointmentDescription}
                onChange={(e) => setAppointmentDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !appointmentDate && "text-muted-foreground"
                    )}
                  >
                    {appointmentDate ? format(appointmentDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={appointmentDate}
                    onSelect={setAppointmentDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start-time" className="text-right">
                Start Time
              </Label>
              <Input
                id="start-time"
                type="time"
                value={appointmentStartTime}
                onChange={(e) => setAppointmentStartTime(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end-time" className="text-right">
                End Time
              </Label>
              <Input
                id="end-time"
                type="time"
                value={appointmentEndTime}
                onChange={(e) => setAppointmentEndTime(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="color" className="text-right">
                Color
              </Label>
              <Select value={appointmentColor} onValueChange={setAppointmentColor}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="#3b82f6">Blue</SelectItem>
                  <SelectItem value="#22c55e">Green</SelectItem>
                  <SelectItem value="#ef4444">Red</SelectItem>
                  <SelectItem value="#f97316">Orange</SelectItem>
                  <SelectItem value="#a855f7">Purple</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-id" className="text-right">
                Assign Task
              </Label>
              <Select value={appointmentTaskId || "null"} onValueChange={(value) => setAppointmentTaskId(value === "null" ? null : value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">No Task</SelectItem>
                  {filteredTasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            {editingAppointment && (
              <Button variant="destructive" onClick={handleDeleteAppointmentClick} className="mr-auto">
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={handleCloseAppointmentForm}>
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