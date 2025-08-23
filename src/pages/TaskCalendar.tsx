import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useAppointments } from '@/hooks/useAppointments';
import { Task, Appointment, TaskCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import TaskItem from '@/components/TaskItem';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: {
    type: 'task' | 'appointment';
    task?: Task;
    appointment?: Appointment;
    style?: React.CSSProperties;
  };
}

const TaskCalendar = () => {
  const { userId: currentUserId } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const {
    tasks: allTasks,
    categories,
    loading: tasksLoading,
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
  } = useAppointments(selectedDate); // Use selectedDate for appointments hook

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const events = useMemo(() => {
    const calendarEvents: CalendarEvent[] = [];

    // Add tasks with due dates
    allTasks.forEach(task => {
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        calendarEvents.push({
          title: task.description,
          start: dueDate,
          end: dueDate,
          allDay: true,
          resource: {
            type: 'task',
            task: task,
            style: {
              backgroundColor: task.category_color || '#3b82f6', // Default blue if no category color
              color: 'white',
              borderRadius: '4px',
              border: 'none',
            },
          },
        });
      }
    });

    // Add appointments
    appointments.forEach(app => {
      const startDate = moment(`${app.date}T${app.start_time}`).toDate();
      const endDate = moment(`${app.date}T${app.end_time}`).toDate();
      calendarEvents.push({
        title: app.title,
        start: startDate,
        end: endDate,
        allDay: false,
        resource: {
          type: 'appointment',
          appointment: app,
          style: {
            backgroundColor: app.color,
            color: 'white',
            borderRadius: '4px',
            border: 'none',
          },
        },
      });
    });

    return calendarEvents;
  }, [allTasks, appointments]);

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    // Open a modal to add a new task or appointment for the selected slot
    // For simplicity, let's just log for now or open a generic add modal
    console.log('Selected slot:', start, end);
    // You might want to open a dialog here to let the user choose to add a task or appointment
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    if (selectedEvent.resource.type === 'task' && selectedEvent.resource.task) {
      await deleteTask(selectedEvent.resource.task.id);
    } else if (selectedEvent.resource.type === 'appointment' && selectedEvent.resource.appointment) {
      await deleteAppointment(selectedEvent.resource.appointment.id);
    }
    handleCloseModal();
  };

  if (tasksLoading || appointmentsLoading) return <div className="text-center py-8">Loading calendar...</div>;
  if (tasksError || appointmentsError) return <div className="text-center py-8 text-red-500">Error loading data.</div>;

  return (
    <div className="container mx-auto p-4 h-full flex flex-col">
      <h1 className="text-3xl font-bold mb-6">Task Calendar</h1>

      <div className="mb-6 flex items-center space-x-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Button onClick={() => setSelectedDate(new Date())}>Today</Button>
      </div>

      <div className="flex-grow bg-white rounded-lg shadow-md p-4">
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={(event) => ({
            style: event.resource.style,
          })}
        />
      </div>

      {/* Event Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedEvent?.resource.type === 'task' && selectedEvent.resource.task && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold mb-2">Task Details</h3>
                <TaskItem
                  task={selectedEvent.resource.task}
                  categories={categories as TaskCategory[]}
                  onUpdateTask={async (taskId: string, updates: Partial<Task>) => { await updateTask(taskId, updates); setIsModalOpen(false); }}
                  onDeleteTask={async (taskId: string) => { await deleteTask(taskId); setIsModalOpen(false); }}
                  onAddSubtask={async (description: string, parentTaskId: string) => { await addTask(description, null, parentTaskId); }}
                  onToggleFocusMode={onToggleFocusMode}
                  onLogDoTodayOff={onLogDoTodayOff}
                  isFocusedTask={false}
                  subtasks={allTasks.filter(t => t.parent_task_id === selectedEvent.resource.task?.id) as Task[]}
                  renderSubtasks={(parentTaskId) => (
                    <div className="ml-4 border-l pl-4 space-y-2">
                      {allTasks.filter(sub => sub.parent_task_id === parentTaskId).map(subtask => (
                        <TaskItem
                          key={subtask.id}
                          task={subtask}
                          categories={categories as TaskCategory[]}
                          onUpdateTask={async (taskId: string, updates: Partial<Task>) => { await updateTask(taskId, updates); }}
                          onDeleteTask={async (taskId: string) => { await deleteTask(taskId); }}
                          onAddSubtask={async (description: string, parentTaskId: string) => { await addTask(description, null, parentTaskId); }}
                          onToggleFocusMode={onToggleFocusMode}
                          onLogDoTodayOff={onLogDoTodayOff}
                          isFocusedTask={false}
                          subtasks={[]}
                          renderSubtasks={() => null}
                        />
                      ))}
                    </div>
                  )}
                />
              </div>
            )}
            {selectedEvent?.resource.type === 'appointment' && selectedEvent.resource.appointment && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold mb-2">Appointment Details</h3>
                <p><strong>Title:</strong> {selectedEvent.resource.appointment.title}</p>
                <p><strong>Description:</strong> {selectedEvent.resource.appointment.description || 'N/A'}</p>
                <p><strong>Date:</strong> {format(new Date(selectedEvent.resource.appointment.date), 'PPP')}</p>
                <p><strong>Time:</strong> {selectedEvent.resource.appointment.start_time.substring(0, 5)} - {selectedEvent.resource.appointment.end_time.substring(0, 5)}</p>
                <p><strong>Color:</strong> <span className="inline-block w-4 h-4 rounded-full" style={{ backgroundColor: selectedEvent.resource.appointment.color }}></span> {selectedEvent.resource.appointment.color}</p>
                {selectedEvent.resource.appointment.task_id && (
                  <p><strong>Linked Task:</strong> {allTasks.find(t => t.id === selectedEvent.resource.appointment?.task_id)?.description || 'N/A'}</p>
                )}
                <Button variant="destructive" onClick={handleDeleteEvent}>Delete Appointment</Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskCalendar;