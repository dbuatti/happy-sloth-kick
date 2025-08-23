import React, { useState, useMemo } from 'react';
import { format, parseISO, isSameDay, addMinutes, setHours, setMinutes } from 'date-fns';
import { CalendarIcon, Plus, Edit, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Appointment, WorkHour, Task, TaskCategory, TaskSection, UserSettings } from '@/types';
import { useTasks } from '@/hooks/useTasks';
import TaskItem from './TaskItem';

interface DailyScheduleViewProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  workHours: WorkHour[];
  saveWorkHours: (dayOfWeek: string, startTime: string, endTime: string, enabled: boolean) => Promise<void>;
  appointments: Appointment[];
  addAppointment: (newAppointment: Omit<Appointment, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Appointment>;
  updateAppointment: (id: string, updates: Partial<Omit<Appointment, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<Appointment>;
  deleteAppointment: (id: string) => Promise<void>;
  clearAppointmentsForDay: (date: Date) => Promise<void>;
  tasks: Task[];
  allCategories: TaskCategory[];
  sections: TaskSection[];
  settings: UserSettings | null;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  addTask: (description: string, sectionId: string | null, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
}

const DailyScheduleView: React.FC<DailyScheduleViewProps> = ({
  selectedDate,
  setSelectedDate,
  workHours,
  saveWorkHours,
  appointments,
  addAppointment,
  updateAppointment,
  deleteAppointment,
  clearAppointmentsForDay,
  tasks,
  allCategories,
  sections,
  settings,
  updateTask,
  deleteTask,
  addTask,
  onToggleFocusMode,
  onLogDoTodayOff,
}) => {
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);
  const [appointmentTitle, setAppointmentTitle] = useState('');
  const [appointmentDescription, setAppointmentDescription] = useState<string | null>(null);
  const [appointmentStartTime, setAppointmentStartTime] = useState('09:00');
  const [appointmentEndTime, setAppointmentEndTime] = useState('10:00');
  const [appointmentColor, setAppointmentColor] = useState('#3b82f6'); // Default blue
  const [appointmentTaskId, setAppointmentTaskId] = useState<string | null>(null);

  const [isWorkHoursModalOpen, setIsWorkHoursModalOpen] = useState(false);
  const [currentDayWorkHours, setCurrentDayWorkHours] = useState<WorkHour | null>(null);
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [workEndTime, setWorkEndTime] = useState('17:00');
  const [workEnabled, setWorkEnabled] = useState(true);

  const dayOfWeek = format(selectedDate, 'EEEE').toLowerCase(); // e.g., "monday"

  useEffect(() => {
    const dayHours = workHours.find(wh => wh.day_of_week === dayOfWeek);
    setCurrentDayWorkHours(dayHours || null);
    if (dayHours) {
      setWorkStartTime(dayHours.start_time.substring(0, 5));
      setWorkEndTime(dayHours.end_time.substring(0, 5));
      setWorkEnabled(dayHours.enabled ?? true);
    } else {
      setWorkStartTime('09:00');
      setWorkEndTime('17:00');
      setWorkEnabled(true);
    }
  }, [selectedDate, workHours, dayOfWeek]);

  const handleOpenNewAppointmentModal = (startTime?: string, endTime?: string) => {
    setCurrentAppointment(null);
    setAppointmentTitle('');
    setAppointmentDescription(null);
    setAppointmentStartTime(startTime || '09:00');
    setAppointmentEndTime(endTime || '10:00');
    setAppointmentColor('#3b82f6');
    setAppointmentTaskId(null);
    setIsAppointmentModalOpen(true);
  };

  const handleOpenEditAppointmentModal = (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    setAppointmentTitle(appointment.title);
    setAppointmentDescription(appointment.description);
    setAppointmentStartTime(appointment.start_time.substring(0, 5));
    setAppointmentEndTime(appointment.end_time.substring(0, 5));
    setAppointmentColor(appointment.color);
    setAppointmentTaskId(appointment.task_id);
    setIsAppointmentModalOpen(true);
  };

  const handleSaveAppointment = async () => {
    if (!appointmentTitle.trim() || !appointmentStartTime || !appointmentEndTime) return;

    const newAppointmentData = {
      title: appointmentTitle,
      description: appointmentDescription,
      date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: appointmentStartTime + ':00',
      end_time: appointmentEndTime + ':00',
      color: appointmentColor,
      task_id: appointmentTaskId,
    };

    if (currentAppointment) {
      await updateAppointment(currentAppointment.id, newAppointmentData);
    } else {
      await addAppointment(newAppointmentData);
    }
    setIsAppointmentModalOpen(false);
  };

  const handleDeleteAppointment = async (id: string) => {
    await deleteAppointment(id);
    setIsAppointmentModalOpen(false);
  };

  const handleSaveWorkHours = async () => {
    await saveWorkHours(dayOfWeek, workStartTime + ':00', workEndTime + ':00', workEnabled);
    setIsWorkHoursModalOpen(false);
  };

  const handleClearAppointments = async () => {
    if (window.confirm('Are you sure you want to clear all appointments for this day?')) {
      await clearAppointmentsForDay(selectedDate);
    }
  };

  const filteredTasksForSchedule = useMemo(() => {
    const today = format(selectedDate, 'yyyy-MM-dd');
    const focusModeSectionIds = new Set((sections as TaskSection[]).filter(s => s.include_in_focus_mode).map(s => s.id));

    return tasks.filter(task => {
      const isFocusModeTask = task.section_id && focusModeSectionIds.has(task.section_id);
      const isDueToday = task.due_date && isSameDay(parseISO(task.due_date as string), selectedDate);
      const isRecurringDaily = task.recurring_type === 'daily';

      // If settings.schedule_show_focus_tasks_only is true, only show focus mode tasks
      if (settings?.schedule_show_focus_tasks_only) {
        return task.status !== 'completed' && task.parent_task_id === null && isFocusModeTask;
      }

      // Otherwise, show all relevant tasks
      return task.status !== 'completed' && task.parent_task_id === null && (isFocusModeTask || isDueToday || isRecurringDaily);
    }).sort((a, b) => {
      // Sort by priority (urgent > high > medium > low > none), then due date (earliest first), then created_at
      const priorityOrder: { [key: string]: number } = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3, 'none': 4 };
      const aPriority = priorityOrder[a.priority || 'none'];
      const bPriority = priorityOrder[b.priority || 'none'];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [tasks, selectedDate, sections, settings?.schedule_show_focus_tasks_only]);

  const renderSubtasks = (parentTaskId: string) => {
    const subtasks = tasks.filter(sub => sub.parent_task_id === parentTaskId);
    return (
      <div className="ml-4 border-l pl-4 space-y-2">
        {subtasks.map(subtask => (
          <TaskItem
            key={subtask.id}
            task={subtask}
            categories={allCategories}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onAddSubtask={async (description, parentTaskId) => { await addTask(description, null, parentTaskId); }}
            onToggleFocusMode={onToggleFocusMode}
            onLogDoTodayOff={onLogDoTodayOff}
            isFocusedTask={settings?.focused_task_id === subtask.id}
            subtasks={[]}
            renderSubtasks={() => null}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Panel: Calendar and Tasks */}
      <div className="w-full lg:w-1/2 flex flex-col space-y-6">
        <Card className="flex-shrink-0">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border shadow mx-auto"
            />
          </CardContent>
        </Card>

        <Card className="flex-grow flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tasks for {format(selectedDate, 'PPP')}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleOpenNewAppointmentModal()}>
              <Plus className="h-4 w-4 mr-2" /> Add Appointment
            </Button>
          </CardHeader>
          <CardContent className="flex-grow overflow-y-auto">
            {filteredTasksForSchedule.length === 0 && appointments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No tasks or appointments for this day.</p>
            ) : (
              <div className="space-y-4">
                {filteredTasksForSchedule.filter(task => task.parent_task_id === null).map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    categories={allCategories}
                    onUpdateTask={updateTask}
                    onDeleteTask={deleteTask}
                    onAddSubtask={async (description, parentTaskId) => { await addTask(description, null, parentTaskId); }}
                    onToggleFocusMode={onToggleFocusMode}
                    onLogDoTodayOff={onLogDoTodayOff}
                    isFocusedTask={settings?.focused_task_id === task.id}
                    subtasks={tasks.filter(sub => sub.parent_task_id === task.id)}
                    renderSubtasks={renderSubtasks}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: Daily Schedule */}
      <Card className="w-full lg:w-1/2 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daily Schedule for {format(selectedDate, 'PPP')}</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => setIsWorkHoursModalOpen(true)}>
              <Edit className="h-4 w-4 mr-2" /> Work Hours
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClearAppointments}>
              <Trash2 className="h-4 w-4 mr-2" /> Clear Day
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto">
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No appointments scheduled.</p>
            ) : (
              appointments.map(app => (
                <div
                  key={app.id}
                  className="flex items-center gap-3 p-3 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderLeft: `4px solid ${app.color}` }}
                  onClick={() => handleOpenEditAppointmentModal(app)}
                >
                  <Clock className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{app.title}</p>
                    <p className="text-sm text-gray-600">{app.start_time.substring(0, 5)} - {app.end_time.substring(0, 5)}</p>
                    {app.description && <p className="text-xs text-gray-500">{app.description}</p>}
                    {app.task_id && (
                      <p className="text-xs text-gray-500 flex items-center">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Task: {tasks.find(t => t.id === app.task_id)?.description}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Appointment Modal */}
      <Dialog open={isAppointmentModalOpen} onOpenChange={setIsAppointmentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentAppointment ? 'Edit Appointment' : 'Add New Appointment'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Title</Label>
              <Input id="title" value={appointmentTitle} onChange={(e) => setAppointmentTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Textarea id="description" value={appointmentDescription || ''} onChange={(e) => setAppointmentDescription(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startTime" className="text-right">Start Time</Label>
              <Input id="startTime" type="time" value={appointmentStartTime} onChange={(e) => setAppointmentStartTime(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endTime" className="text-right">End Time</Label>
              <Input id="endTime" type="time" value={appointmentEndTime} onChange={(e) => setAppointmentEndTime(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="color" className="text-right">Color</Label>
              <Input id="color" type="color" value={appointmentColor} onChange={(e) => setAppointmentColor(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task" className="text-right">Link Task</Label>
              <Select value={appointmentTaskId || ''} onValueChange={setAppointmentTaskId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a task (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {tasks.filter(t => t.status !== 'completed').map(task => (
                    <SelectItem key={task.id} value={task.id}>{task.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            {currentAppointment && (
              <Button variant="destructive" onClick={() => handleDeleteAppointment(currentAppointment.id)}>Delete</Button>
            )}
            <Button type="submit" onClick={handleSaveAppointment}>Save Appointment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Work Hours Modal */}
      <Dialog open={isWorkHoursModalOpen} onOpenChange={setIsWorkHoursModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Work Hours for {format(selectedDate, 'EEEE')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="workEnabled"
                checked={workEnabled}
                onChange={(e) => setWorkEnabled(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <Label htmlFor="workEnabled">Enable Work Hours for this day</Label>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="workStartTime" className="text-right">Start Time</Label>
              <Input id="workStartTime" type="time" value={workStartTime} onChange={(e) => setWorkStartTime(e.target.value)} className="col-span-3" disabled={!workEnabled} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="workEndTime" className="text-right">End Time</Label>
              <Input id="workEndTime" type="time" value={workEndTime} onChange={(e) => setWorkEndTime(e.target.value)} className="col-span-3" disabled={!workEnabled} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSaveWorkHours}>Save Work Hours</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailyScheduleView;