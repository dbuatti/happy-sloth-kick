import React, { useState, useEffect } from 'react';
import { format, parse, setHours, setMinutes, parseISO, addMinutes, isValid } from 'date-fns';
import { Appointment, NewAppointmentData, UpdateAppointmentData, Task } from '@/types'; // Corrected imports
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';

interface AppointmentFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: NewAppointmentData | UpdateAppointmentData) => void;
  initialData?: Appointment | null;
  date: Date;
  availableTasks: Task[];
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({
  isOpen,
  onOpenChange,
  onSubmit,
  initialData,
  date,
  availableTasks,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [color, setColor] = useState('#3b82f6'); // Default blue
  const [taskId, setTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setStartTime(initialData.start_time.substring(0, 5));
      setEndTime(initialData.end_time.substring(0, 5));
      setColor(initialData.color);
      setTaskId(initialData.task_id || null);
    } else {
      setTitle('');
      setDescription('');
      setStartTime('09:00');
      setEndTime('10:00');
      setColor('#3b82f6');
      setTaskId(null);
    }
  }, [initialData]);

  const handleSubmit = () => {
    if (!title.trim() || !startTime || !endTime) {
      toast.error('Title, start time, and end time are required.');
      return;
    }

    const startDateTime = parse(startTime, 'HH:mm', date);
    const endDateTime = parse(endTime, 'HH:mm', date);

    if (!isValid(startDateTime) || !isValid(endDateTime)) {
      toast.error('Invalid time format.');
      return;
    }

    if (endDateTime.getTime() <= startDateTime.getTime()) {
      toast.error('End time must be after start time.');
      return;
    }

    const data: NewAppointmentData | UpdateAppointmentData = {
      title: title.trim(),
      description: description.trim() || null,
      date: format(date, 'yyyy-MM-dd'),
      start_time: startTime + ':00',
      end_time: endTime + ':00',
      color: color,
      task_id: taskId,
    };

    onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Appointment' : 'Add New Appointment'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startTime" className="text-right">
              Start Time
            </Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endTime" className="text-right">
              End Time
            </Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="color" className="text-right">
              Color
            </Label>
            <Input
              id="color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="task" className="text-right">
              Link Task
            </Label>
            <Select value={taskId || ''} onValueChange={(value) => setTaskId(value || null)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {availableTasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>
            {initialData ? 'Save Changes' : 'Add Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentForm;