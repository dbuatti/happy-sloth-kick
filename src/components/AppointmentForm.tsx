import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import DatePicker from '@/components/ui/date-picker';
import TimePicker from '@/components/ui/time-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Appointment, Task, TaskSection, TaskCategory } from '@/types/task';
import { format, parseISO, setHours, setMinutes, isValid } from 'date-fns';
import { showError } from '@/utils/toast';

interface AppointmentFormProps {
  appointment?: Appointment | null;
  onSave: (data: Partial<Appointment>) => Promise<void>;
  onCancel: () => void;
  onDelete?: (id: string) => Promise<void>;
  tasks: Task[];
  sections: TaskSection[];
  categories: TaskCategory[];
  currentDate: Date;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({
  appointment,
  onSave,
  onCancel,
  onDelete,
  tasks,
  sections,
  categories,
  currentDate,
}) => {
  const [title, setTitle] = useState(appointment?.title || '');
  const [description, setDescription] = useState(appointment?.description || '');
  const [date, setDate] = useState<Date | undefined>(appointment?.date ? parseISO(appointment.date) : currentDate);
  const [startTime, setStartTime] = useState<Date | undefined>(
    appointment?.start_time ? parseISO(`2000-01-01T${appointment.start_time}`) : setMinutes(setHours(new Date(), 9), 0)
  );
  const [endTime, setEndTime] = useState<Date | undefined>(
    appointment?.end_time ? parseISO(`2000-01-01T${appointment.end_time}`) : setMinutes(setHours(new Date(), 10), 0)
  );
  const [color, setColor] = useState(appointment?.color || '#3b82f6'); // Default to blue-500
  const [selectedTask, setSelectedTask] = useState<Task | null>(
    appointment?.task_id ? tasks.find(t => t.id === appointment.task_id) || null : null
  );

  useEffect(() => {
    if (appointment) {
      setTitle(appointment.title);
      setDescription(appointment.description || '');
      setDate(parseISO(appointment.date));
      setStartTime(parseISO(`2000-01-01T${appointment.start_time}`));
      setEndTime(parseISO(`2000-01-01T${appointment.end_time}`));
      setColor(appointment.color);
      setSelectedTask(tasks.find(t => t.id === appointment.task_id) || null);
    } else {
      setTitle('');
      setDescription('');
      setDate(currentDate);
      setStartTime(setMinutes(setHours(new Date(), 9), 0));
      setEndTime(setMinutes(setHours(new Date(), 10), 0));
      setColor('#3b82f6');
      setSelectedTask(null);
    }
  }, [appointment, tasks, currentDate]);

  const handleSave = async () => {
    if (!title.trim() || !date || !startTime || !endTime || !color) {
      showError('Title, Date, Start Time, End Time, and Color are required.');
      return;
    }
    if (!isValid(startTime) || !isValid(endTime)) {
      showError('Invalid start or end time.');
      return;
    }
    if (startTime >= endTime) {
      showError('Start time must be before end time.');
      return;
    }

    const appointmentData: Partial<Appointment> = {
      title: title.trim(),
      description: description.trim() || null,
      date: format(date, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      color,
      task_id: selectedTask?.id || null,
    };

    await onSave(appointmentData);
  };

  const handleDelete = async () => {
    if (appointment?.id && onDelete) {
      await onDelete(appointment.id);
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{appointment ? 'Edit Appointment' : 'Add New Appointment'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">Date</Label>
            <div className="col-span-3">
              <DatePicker date={date} setDate={setDate} />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start-time" className="text-right">Start Time</Label>
            <div className="col-span-3">
              <TimePicker date={startTime} setDate={setStartTime} />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end-time" className="text-right">End Time</Label>
            <div className="col-span-3">
              <TimePicker date={endTime} setDate={setEndTime} />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="color" className="text-right">Color</Label>
            <Input id="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="col-span-3 h-8" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="task" className="text-right">Link Task</Label>
            <Select
              value={selectedTask?.id || ''}
              onValueChange={(value) => setSelectedTask(tasks.find(t => t.id === value) || null)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a task (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {tasks.map(task => (
                  <SelectItem key={task.id} value={task.id}>{task.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          {appointment && onDelete && (
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {appointment ? 'Save Changes' : 'Add Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentForm;