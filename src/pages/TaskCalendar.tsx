import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useAppointments } from '@/hooks/useAppointments';
import { Task, Appointment, TaskCategory, NewTaskData, UpdateTaskData, TaskCalendarProps } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TaskItem from '@/components/TaskItem';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfDay } from 'date-fns';
import { toast } from 'react-hot-toast';

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: {
    type: 'task' | 'appointment';
    task?: Task;
    appointment?: Appointment;
  };
}

const TaskCalendar: React.FC<TaskCalendarProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const {
    tasks,
    categories,
    isLoading: tasksLoading,
    error: tasksError,
    addTask,
    updateTask,
    deleteTask,
    onToggleFocusMode,
    onLogDoTodayOff,
  } = useTasks({ userId: currentUserId! });

  const {
    appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments(startOfDay(new Date())); // Fetch all appointments for the current month/view

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    tasks?.forEach(task => {
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        allEvents.push({
          title: task.description,
          start: dueDate,
          end: addMinutes(dueDate, 60), // Default 1 hour for tasks
          allDay: true,
          resource: { type: 'task', task },
        });
      }
    });

    appointments?.forEach(appointment => {
      const startDate = moment(`${appointment.date}T${appointment.start_time}`).toDate();
      const endDate = moment(`${appointment.date}T${appointment.end_time}`).toDate();
      allEvents.push({
        title: appointment.title,
        start: startDate,
        end: endDate,
        allDay: false,
        resource: { type: 'appointment', appointment },
      });
    });

    return allEvents;
  }, [tasks, appointments]);

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleEventDrop = async ({ event, start, end, allDay }: any) => {
    if (event.resource.type === 'task' && event.resource.task) {
      try {
        await updateTask({ id: event.resource.task.id, updates: { due_date: start.toISOString() } });
        toast.success('Task due date updated!');
      } catch (err) {
        toast.error(`Failed to update task: ${(err as Error).message}`);
        console.error('Error updating task:', err);
      }
    } else if (event.resource.type === 'appointment' && event.resource.appointment) {
      try {
        await updateAppointment({
          id: event.resource.appointment.id,
          updates: {
            date: format(start, 'yyyy-MM-dd'),
            start_time: format(start, 'HH:mm:ss'),
            end_time: format(end, 'HH:mm:ss'),
          },
        });
        toast.success('Appointment time updated!');
      } catch (err) {
        toast.error(`Failed to update appointment: ${(err as Error).message}`);
        console.error('Error updating appointment:', err);
      }
    }
  };

  if (tasksLoading || appointmentsLoading || authLoading) {
    return <div className="flex justify-center items-center h-full">Loading calendar...</div>;
  }

  if (tasksError || appointmentsError) {
    return <div className="flex justify-center items-center h-full text-red-500">Error: {tasksError?.message || appointmentsError?.message}</div>;
  }

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-64px)] flex flex-col">
      <h1 className="text-3xl font-bold mb-6">Task Calendar</h1>
      <div className="flex-grow">
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          selectable
          onSelectEvent={handleSelectEvent}
          onEventDrop={handleEventDrop}
          resizable
          onEventResize={handleEventDrop}
          defaultView="month"
        />
      </div>

      {selectedEvent && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {selectedEvent.resource?.type === 'task' && selectedEvent.resource.task && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Task Details</h3>
                  <TaskItem
                    task={selectedEvent.resource.task}
                    categories={categories as TaskCategory[]}
                    onUpdateTask={async (taskId: string, updates: Partial<Task>) => { await updateTask({ id: taskId, updates }); setIsModalOpen(false); return selectedEvent.resource!.task!; }}
                    onDeleteTask={async (taskId: string) => { await deleteTask(taskId); setIsModalOpen(false); }}
                    onAddSubtask={async (description: string, parentTaskId: string | null) => {
                      const newTaskData: NewTaskData = {
                        description,
                        section_id: null,
                        parent_task_id: parentTaskId,
                        due_date: null,
                        category: null,
                        priority: 'medium',
                        status: 'to-do',
                        recurring_type: 'none',
                        original_task_id: null,
                        link: null,
                        image_url: null,
                        notes: null,
                        remind_at: null,
                      };
                      return await addTask(newTaskData);
                    }}
                    onToggleFocusMode={onToggleFocusMode}
                    onLogDoTodayOff={onLogDoTodayOff}
                  />
                  {selectedEvent.resource.task.parent_task_id && (
                    <div className="mt-4">
                      <h4 className="font-semibold">Subtasks:</h4>
                      {tasks?.filter(t => t.parent_task_id === selectedEvent.resource?.task?.id).map(subtask => (
                        <TaskItem
                          key={subtask.id}
                          task={subtask}
                          categories={categories as TaskCategory[]}
                          onUpdateTask={async (taskId: string, updates: Partial<Task>) => { await updateTask({ id: taskId, updates }); return subtask; }}
                          onDeleteTask={async (taskId: string) => { await deleteTask(taskId); }}
                          onAddSubtask={async (description: string, parentTaskId: string | null) => {
                            const newTaskData: NewTaskData = {
                              description,
                              section_id: null,
                              parent_task_id: parentTaskId,
                              due_date: null,
                              category: null,
                              priority: 'medium',
                              status: 'to-do',
                              recurring_type: 'none',
                              original_task_id: null,
                              link: null,
                              image_url: null,
                              notes: null,
                              remind_at: null,
                            };
                            return await addTask(newTaskData);
                          }}
                          onToggleFocusMode={onToggleFocusMode}
                          onLogDoTodayOff={onLogDoTodayOff}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selectedEvent.resource?.type === 'appointment' && selectedEvent.resource.appointment && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Appointment Details</h3>
                  <p><strong>Description:</strong> {selectedEvent.resource.appointment.description || 'N/A'}</p>
                  <p><strong>Date:</strong> {format(selectedEvent.start, 'PPP')}</p>
                  <p><strong>Time:</strong> {format(selectedEvent.start, 'p')} - {format(selectedEvent.end, 'p')}</p>
                  <p><strong>Color:</strong> <span style={{ color: selectedEvent.resource.appointment.color }}>{selectedEvent.resource.appointment.color}</span></p>
                  {selectedEvent.resource.appointment.task_id && (
                    <p><strong>Linked Task:</strong> {tasks?.find(t => t.id === selectedEvent.resource?.appointment?.task_id)?.description || 'N/A'}</p>
                  )}
                  <div className="flex space-x-2 mt-4">
                    <Button onClick={() => toast("Edit appointment functionality to be implemented.")}>Edit</Button>
                    <Button variant="destructive" onClick={() => toast("Delete appointment functionality to be implemented.")}>Delete</Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TaskCalendar;