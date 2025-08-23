import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { format, parse, startOfWeek, getDay, parseISO } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useAppointments } from '@/hooks/useAppointments';
import { Task, Appointment, TaskCategory, NewTaskData, UpdateTaskData, TaskCalendarProps, CustomCalendarEvent, NewAppointmentData, UpdateAppointmentData } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import TaskForm from '@/components/TaskForm';
import AppointmentForm from '@/components/AppointmentForm';
import { toast } from 'react-hot-toast';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DragAndDropCalendar = withDragAndDrop(Calendar);

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
    onToggleFocusMode,
    onLogDoTodayOff,
  } = useTasks({ userId: currentUserId, isDemo, demoUserId });

  const {
    appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments({ userId: currentUserId });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CustomCalendarEvent | null>(null);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ start: Date; end: Date } | undefined>(undefined);

  const events = useMemo(() => {
    const allEvents: CustomCalendarEvent[] = [];

    tasks?.forEach(task => {
      if (task.due_date) {
        allEvents.push({
          id: task.id,
          title: task.description,
          start: parseISO(task.due_date),
          end: parseISO(task.due_date),
          allDay: true,
          resource: { type: 'task', task },
          color: categories?.find(cat => cat.id === task.category)?.color || '#cccccc',
        });
      }
    });

    appointments?.forEach(appointment => {
      const startTime = parseISO(`${appointment.date}T${appointment.start_time}`);
      const endTime = parseISO(`${appointment.date}T${appointment.end_time}`);
      allEvents.push({
        id: appointment.id,
        title: appointment.title,
        start: startTime,
        end: endTime,
        allDay: false,
        resource: { type: 'appointment', appointment },
        color: appointment.color,
      });
    });

    return allEvents;
  }, [tasks, appointments, categories]);

  const handleSelectEvent = useCallback((event: CustomCalendarEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  const handleEventDrop = async ({ event, start, end, allDay }: { event: CustomCalendarEvent, start: Date, end: Date, allDay: boolean }) => {
    if (event.resource.type === 'task' && event.resource.task) {
      const taskId = event.resource.task.id;
      const updates: UpdateTaskData = {
        due_date: format(start, 'yyyy-MM-dd'),
      };
      await updateTask({ id: taskId, updates });
      toast.success('Task rescheduled!');
    } else if (event.resource.type === 'appointment' && event.resource.appointment) {
      const appointmentId = event.resource.appointment.id;
      const updates: UpdateAppointmentData = {
        date: format(start, 'yyyy-MM-dd'),
        start_time: format(start, 'HH:mm'),
        end_time: format(end, 'HH:mm'),
      };
      await updateAppointment({ id: appointmentId, updates });
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
      await updateAppointment({ id: appointmentId, updates });
      toast.success('Appointment duration updated!');
    }
  };

  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    setSelectedDate(start);
    setSelectedTimeSlot({ start, end });
    setEditingAppointment(null); // Clear any previous editing appointment
    setIsAppointmentFormOpen(true);
  }, []);

  const handleSaveAppointment = async (data: NewAppointmentData | UpdateAppointmentData) => {
    if ('id' in data && data.id) {
      return await updateAppointment({ id: data.id, updates: data });
    } else {
      return await addAppointment(data as NewAppointmentData);
    }
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setSelectedDate(parseISO(appointment.date));
    setSelectedTimeSlot({ start: parseISO(`${appointment.date}T${appointment.start_time}`), end: parseISO(`${appointment.date}T${appointment.end_time}`) });
    setIsAppointmentFormOpen(true);
  };

  const handleDeleteAppointment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      await deleteAppointment(id);
      toast.success('Appointment deleted!');
    }
  };

  if (tasksLoading || appointmentsLoading || authLoading) return <p className="p-4 text-center">Loading calendar...</p>;
  if (tasksError || appointmentsError) return <p className="p-4 text-red-500">Error: {tasksError?.message || appointmentsError?.message}</p>;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Task Calendar</h2>
      </div>

      <div className="h-[700px]">
        <DragAndDropCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          selectable
          onSelectEvent={handleSelectEvent}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          onSelectSlot={handleSelectSlot}
          resizable
          defaultView="week"
          eventPropGetter={(event: CustomCalendarEvent) => ({
            style: {
              backgroundColor: event.color,
            },
          })}
        />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.resource.type === 'task' ? 'Task Details' : 'Appointment Details'}</DialogTitle>
          </DialogHeader>
          {selectedEvent?.resource.type === 'task' && selectedEvent.resource.task && (
            <TaskForm
              initialData={selectedEvent.resource.task}
              onSave={async (updates) => {
                const updated = await updateTask({ id: selectedEvent.resource!.task!.id, updates: updates as UpdateTaskData });
                setIsModalOpen(false);
                return updated;
              }}
              onCancel={() => setIsModalOpen(false)}
              categories={categories || []}
              sections={sections || []}
            />
          )}
          {selectedEvent?.resource.type === 'appointment' && selectedEvent.resource.appointment && (
            <AppointmentForm
              initialData={selectedEvent.resource.appointment}
              onSave={handleSaveAppointment}
              onCancel={() => setIsModalOpen(false)}
              tasks={tasks || []}
              selectedDate={selectedDate}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAppointmentFormOpen} onOpenChange={setIsAppointmentFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingAppointment ? 'Edit Appointment' : 'Add New Appointment'}</DialogTitle>
          </DialogHeader>
          <AppointmentForm
            initialData={editingAppointment || undefined}
            onSave={handleSaveAppointment}
            onCancel={() => setIsAppointmentFormOpen(false)}
            tasks={tasks || []}
            selectedDate={selectedDate}
            selectedTimeSlot={selectedTimeSlot}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskCalendar;