import React, { useState, useMemo } from 'react';
import { Calendar as BigCalendar, momentLocalizer, Event as CalendarEvent } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useAppointments } from '@/hooks/useAppointments';
import { Task, Appointment, TaskCategory, NewTaskData, UpdateTaskData, TaskCalendarProps } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import TaskForm from '@/components/TaskForm';
import AppointmentForm from '@/components/AppointmentForm';
import { format, startOfDay, addMinutes, parseISO } from 'date-fns';
import { toast } from 'react-hot-toast';

const localizer = momentLocalizer(moment);

interface CalendarEventResource {
  type: 'task' | 'appointment';
  task?: Task;
  appointment?: Appointment;
}

interface CustomCalendarEvent extends CalendarEvent {
  resource: CalendarEventResource;
}

const TaskCalendar: React.FC<TaskCalendarProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const {
    tasks,
    categories,
    sections,
    isLoading: tasksLoading,
    error: tasksError,
    addTask,
    updateTask,
    deleteTask,
    createSection,
    updateSection,
    deleteSection,
    onAddSubtask,
    onToggleFocusMode,
  } = useTasks({ userId: currentUserId, isDemo, demoUserId });

  const {
    appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments(startOfDay(new Date())); // Fetch all appointments for the current month/view

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CustomCalendarEvent | null>(null);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedDateForNewAppointment, setSelectedDateForNewAppointment] = useState<Date>(new Date());
  const [selectedTimeSlotForNewAppointment, setSelectedTimeSlotForNewAppointment] = useState<{ start: Date; end: Date } | null>(null);

  const calendarEvents = useMemo(() => {
    const events: CustomCalendarEvent[] = [];

    tasks?.forEach(task => {
      if (task.due_date) {
        const dueDate = parseISO(task.due_date);
        events.push({
          id: task.id,
          title: task.description,
          start: dueDate,
          end: addMinutes(dueDate, 60), // Default 1 hour for tasks
          allDay: true,
          resource: { type: 'task', task },
          color: categories?.find(cat => cat.id === task.category?.id)?.color || '#cccccc',
        });
      }
    });

    appointments?.forEach(appointment => {
      const appDate = parseISO(appointment.date);
      const startTime = parseISO(`${appointment.date}T${appointment.start_time}`);
      const endTime = parseISO(`${appointment.date}T${appointment.end_time}`);
      events.push({
        id: appointment.id,
        title: appointment.title,
        start: startTime,
        end: endTime,
        allDay: false,
        resource: { type: 'appointment', appointment },
        color: appointment.color,
      });
    });

    return events;
  }, [tasks, appointments, categories]);

  const handleSelectEvent = (event: CustomCalendarEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleEventDrop = async ({ event, start, end, allDay }: { event: CustomCalendarEvent, start: Date, end: Date, allDay: boolean }) => {
    if (event.resource.type === 'task' && event.resource.task) {
      const taskId = event.resource.task.id;
      const updates: UpdateTaskData = {
        due_date: format(start, 'yyyy-MM-dd'),
      };
      await updateTask(taskId, updates);
      toast.success('Task rescheduled!');
    } else if (event.resource.type === 'appointment' && event.resource.appointment) {
      const appointmentId = event.resource.appointment.id;
      const updates: UpdateAppointmentData = {
        date: format(start, 'yyyy-MM-dd'),
        start_time: format(start, 'HH:mm'),
        end_time: format(end, 'HH:mm'),
      };
      await updateAppointment(appointmentId, updates);
      toast.success('Appointment rescheduled!');
    }
  };

  const handleEventResize = async ({ event, start, end }: { event: CustomCalendarEvent, start: Date, end: Date }) => {
    if (event.resource.type === 'appointment' && event.resource.appointment) {
      const appointmentId = event.resource.appointment.id;
      const updates: UpdateAppointmentData = {
        start_time: format(start, 'HH:mm'),
        end_time: format(end, 'HH:mm'),
      };
      await updateAppointment(appointmentId, updates);
      toast.success('Appointment duration updated!');
    }
  };

  const handleSelectSlot = ({ start, end }: { start: Date, end: Date }) => {
    setSelectedDateForNewAppointment(start);
    setSelectedTimeSlotForNewAppointment({ start, end });
    setIsAppointmentFormOpen(true);
  };

  const handleSaveAppointment = async (data: NewAppointmentData | UpdateAppointmentData) => {
    if ('id' in data && data.id) {
      return await updateAppointment(data.id, data);
    } else {
      return await addAppointment(data as NewAppointmentData);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    await deleteAppointment(id);
  };

  if (isLoading || authLoading) return <p>Loading calendar...</p>;
  if (tasksError || appointmentsError) return <p>Error: {tasksError?.message || appointmentsError?.message}</p>;

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Task Calendar</h1>
      <div className="h-[700px]">
        <BigCalendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          selectable
          onSelectEvent={handleSelectEvent}
          onEventDrop={handleEventDrop}
          resizable
          onEventResize={handleEventResize}
          onSelectSlot={handleSelectSlot}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.color,
            },
          })}
        />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.resource.type === 'task' ? 'Task Details' : 'Appointment Details'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedEvent?.resource.type === 'task' && selectedEvent.resource.task && (
              <TaskForm
                initialData={selectedEvent.resource.task}
                onSave={async (updates) => {
                  const updated = await updateTask(selectedEvent.resource!.task!.id, updates as UpdateTaskData);
                  setIsModalOpen(false);
                  return updated;
                }}
                onCancel={() => setIsModalOpen(false)}
                categories={categories || []}
                sections={sections || []}
                createSection={createSection}
                updateSection={updateSection}
                deleteSection={deleteSection}
              />
            )}
            {selectedEvent?.resource.type === 'appointment' && selectedEvent.resource.appointment && (
              <AppointmentForm
                isOpen={true} // Always open when selected
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveAppointment}
                onDelete={handleDeleteAppointment}
                initialData={selectedEvent.resource.appointment}
                selectedDate={parseISO(selectedEvent.resource.appointment.date)}
                selectedTimeSlot={{ start: selectedEvent.start as Date, end: selectedEvent.end as Date }}
                tasks={tasks || []}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AppointmentForm
        isOpen={isAppointmentFormOpen}
        onClose={() => setIsAppointmentFormOpen(false)}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
        selectedDate={selectedDateForNewAppointment}
        selectedTimeSlot={selectedTimeSlotForNewAppointment}
        tasks={tasks || []}
      />
    </div>
  );
};

export default TaskCalendar;