import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks'; // Assuming useTasks exists and is correctly typed
import { Task, ScheduleAppointment } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import TaskItem from '@/components/TaskItem'; // Assuming TaskItem is correctly typed
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

const localizer = momentLocalizer(moment);

interface TaskCalendarProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TaskCalendar: React.FC<TaskCalendarProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const {
    tasks: allTasks,
    sections,
    categories,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
  } = useTasks(currentUserId); // Assuming useTasks accepts userId, isDemo, demoUserId

  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState<Partial<ScheduleAppointment>>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00:00',
    end_time: '10:00:00',
    color: '#3b82f6', // Default blue
  });

  useEffect(() => {
    if (allTasks.length > 0) {
      const taskEvents = allTasks
        .filter(task => task.due_date)
        .map(task => ({
          id: task.id,
          title: task.description,
          start: new Date(task.due_date!),
          end: new Date(task.due_date!),
          allDay: true,
          resource: { type: 'task', task },
        }));
      setEvents(prev => [...prev.filter(e => e.resource.type !== 'task'), ...taskEvents]);
    }
  }, [allTasks]);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!currentUserId) return;
      const { data, error } = await supabase
        .from('schedule_appointments')
        .select('*')
        .eq('user_id', currentUserId);

      if (error) {
        console.error('Error fetching appointments:', error.message);
        toast.error('Failed to load appointments.');
        return;
      }

      const appointmentEvents = data.map(app => ({
        id: app.id,
        title: app.title,
        start: new Date(`${app.date}T${app.start_time}`),
        end: new Date(`${app.date}T${app.end_time}`),
        allDay: false,
        resource: { type: 'appointment', appointment: app },
        style: { backgroundColor: app.color },
      }));
      setEvents(prev => [...prev.filter(e => e.resource.type !== 'appointment'), ...appointmentEvents]);
    };

    fetchAppointments();
  }, [currentUserId]);

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleAddAppointment = async () => {
    if (!currentUserId || !newAppointment.title || !newAppointment.date || !newAppointment.start_time || !newAppointment.end_time) {
      toast.error('Please fill all required fields for the appointment.');
      return;
    }

    const { data, error } = await supabase
      .from('schedule_appointments')
      .insert({
        ...newAppointment,
        user_id: currentUserId,
      } as ScheduleAppointment)
      .select()
      .single();

    if (error) {
      console.error('Error adding appointment:', error.message);
      toast.error('Failed to add appointment.');
      return;
    }

    setEvents(prev => [
      ...prev,
      {
        id: data.id,
        title: data.title,
        start: new Date(`${data.date}T${data.start_time}`),
        end: new Date(`${data.date}T${data.end_time}`),
        allDay: false,
        resource: { type: 'appointment', appointment: data },
        style: { backgroundColor: data.color },
      },
    ]);
    toast.success('Appointment added!');
    setIsAppointmentModalOpen(false);
    setNewAppointment({
      title: '',
      date: new Date().toISOString().split('T')[0],
      start_time: '09:00:00',
      end_time: '10:00:00',
      color: '#3b82f6',
    });
  };

  if (loading) return <div className="p-4 text-center">Loading calendar...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Calendar</h1>
        <Dialog open={isAppointmentModalOpen} onOpenChange={setIsAppointmentModalOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Appointment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Appointment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Input
                placeholder="Appointment Title"
                value={newAppointment.title}
                onChange={(e) => setNewAppointment({ ...newAppointment, title: e.target.value })}
              />
              <div className="flex items-center space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !newAppointment.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newAppointment.date ? format(new Date(newAppointment.date), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newAppointment.date ? new Date(newAppointment.date) : undefined}
                      onSelect={(date) => setNewAppointment({ ...newAppointment, date: date?.toISOString().split('T')[0] })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={newAppointment.start_time}
                  onChange={(e) => setNewAppointment({ ...newAppointment, start_time: e.target.value })}
                  className="w-auto"
                />
                <Input
                  type="time"
                  value={newAppointment.end_time}
                  onChange={(e) => setNewAppointment({ ...newAppointment, end_time: e.target.value })}
                  className="w-auto"
                />
              </div>
              <Input
                type="color"
                value={newAppointment.color}
                onChange={(e) => setNewAppointment({ ...newAppointment, color: e.target.value })}
                className="w-full h-10"
              />
            </div>
            <Button onClick={handleAddAppointment}>Save Appointment</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="h-[700px]">
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          onSelectEvent={handleSelectEvent}
          eventPropGetter={(event) => ({
            style: event.resource.type === 'appointment' ? event.style : {},
          })}
        />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent?.resource.type === 'task' && selectedEvent.resource.task && (
            <div className="py-4">
              <h3 className="text-lg font-semibold mb-2">Task Details</h3>
              <TaskItem
                task={selectedEvent.resource.task as Task}
                categories={categories}
                onUpdateTask={async (taskId: string, updates: Partial<Task>) => { await updateTask(taskId, updates); setIsModalOpen(false); }}
                onDeleteTask={async (taskId: string) => { await deleteTask(taskId); setIsModalOpen(false); }}
                onAddSubtask={async (description: string, parentTaskId: string) => { await addTask(description, null, parentTaskId); }}
                onToggleFocusMode={() => {}} // Not directly applicable here
                onLogDoTodayOff={() => {}} // Not directly applicable here
                isFocusedTask={false}
                subtasks={allTasks.filter(t => t.parent_task_id === selectedEvent.resource.task.id)}
                renderSubtasks={(parentTaskId) => (
                  allTasks
                    .filter(t => t.parent_task_id === parentTaskId)
                    .map(subtask => (
                      <TaskItem
                        key={subtask.id}
                        task={subtask as Task}
                        categories={categories}
                        onUpdateTask={async (taskId: string, updates: Partial<Task>) => { await updateTask(taskId, updates); }}
                        onDeleteTask={async (taskId: string) => { await deleteTask(taskId); }}
                        onAddSubtask={async (description: string, parentTaskId: string) => { await addTask(description, null, parentTaskId); }}
                        onToggleFocusMode={() => {}}
                        onLogDoTodayOff={() => {}}
                        isFocusedTask={false}
                        subtasks={[]} // Recursion handled by renderSubtasks in TaskItem
                        renderSubtasks={() => null}
                        isDragging={false}
                        onDragStart={() => {}}
                      />
                    ))
                )}
                isDragging={false}
                onDragStart={() => {}}
              />
            </div>
          )}
          {selectedEvent?.resource.type === 'appointment' && selectedEvent.resource.appointment && (
            <div className="py-4">
              <h3 className="text-lg font-semibold mb-2">Appointment Details</h3>
              <p><strong>Title:</strong> {selectedEvent.resource.appointment.title}</p>
              <p><strong>Date:</strong> {format(new Date(selectedEvent.resource.appointment.date), 'PPP')}</p>
              <p><strong>Time:</strong> {selectedEvent.resource.appointment.start_time} - {selectedEvent.resource.appointment.end_time}</p>
              {selectedEvent.resource.appointment.description && <p><strong>Description:</strong> {selectedEvent.resource.appointment.description}</p>}
            </div>
          )}
          <Button onClick={() => setIsModalOpen(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskCalendar;