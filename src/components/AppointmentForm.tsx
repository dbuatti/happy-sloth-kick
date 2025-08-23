import React, { useState, useEffect } from 'react';
import { format, parse, isValid } from 'date-fns';
import { Appointment, NewAppointmentData, UpdateAppointmentData, Task, AppointmentFormProps } from '@/types';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

const AppointmentForm: React.FC<AppointmentFormProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  selectedDate,
  selectedTimeSlot,
  prefilledData,
  tasks,
}) => {
  const [title, setTitle] = useState(initialData?.title || prefilledData?.title || '');
  const [description, setDescription] = useState(initialData?.description || prefilledData?.description || '');
  const [date, setDate] = useState<Date | undefined>(initialData?.date ? new Date(initialData.date) : selectedDate);
  const [startTime, setStartTime] = useState(initialData?.start_time || (selectedTimeSlot ? format(selectedTimeSlot.start, 'HH:mm') : ''));
  const [endTime, setEndTime] = useState(initialData?.end_time || (selectedTimeSlot ? format(selectedTimeSlot.end, 'HH:mm') : ''));
  const [color, setColor] = useState(initialData?.color || '#3b82f6'); // Default to blue
  const [taskId, setTaskId] = useState<string | null>(initialData?.task_id || prefilledData?.task_id || null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setDate(new Date(initialData.date));
      setStartTime(initialData.start_time);
      setEndTime(initialData.end_time);
      setColor(initialData.color);
      setTaskId(initialData.task_id || null);
    } else if (prefilledData) {
      setTitle(prefilledData.title || '');
      setDescription(prefilledData.description || '');
      setDate(prefilledData.date ? new Date(prefilledData.date) : selectedDate);
      setStartTime(prefilledData.start_time || (selectedTimeSlot ? format(selectedTimeSlot.start, 'HH:mm') : ''));
      setEndTime(prefilledData.end_time || (selectedTimeSlot ? format(selectedTimeSlot.end, 'HH:mm') : ''));
      setColor(prefilledData.color || '#3b82f6');
      setTaskId(prefilledData.task_id || null);
    } else {
      setTitle('');
      setDescription('');
      setDate(selectedDate);
      setStartTime(selectedTimeSlot ? format(selectedTimeSlot.start, 'HH:mm') : '');
      setEndTime(selectedTimeSlot ? format(selectedTimeSlot.end, 'HH:mm') : '');
      setColor('#3b82f6');
      setTaskId(null);
    }
  }, [initialData, prefilledData, selectedDate, selectedTimeSlot, isOpen]);

  const handleSubmit = async () => {
    if (!title.trim() || !date || !startTime || !endTime) {
      toast.error('Title, date, start time, and end time are required.');
      return;
    }

    const parsedStartTime = parse(startTime, 'HH:mm', new Date());
    const parsedEndTime = parse(endTime, 'HH:mm', new Date());

    if (!isValid(parsedStartTime) || !isValid(parsedEndTime)) {
      toast.error('Invalid time format. Please use HH:mm.');
      return;
    }

    const appointmentData: NewAppointmentData | UpdateAppointmentData = {
      title: title.trim(),
      description: description.trim() || null,
      date: format(date, 'yyyy-MM-dd'),
      start_time: startTime,
      end_time: endTime,
      color,
      task_id: taskId,
    };

    try {
      if (initialData) {
        await onSave({ ...appointmentData, id: initialData.id } as UpdateAppointmentData);
      } else {
        await onSave(appointmentData as NewAppointmentData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save appointment:', error);
      toast.error('Failed to save appointment.');
    }
  };

  const handleDelete = async () => {
    if (initialData && window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        await onDelete(initialData.id);
        onClose();
      } catch (error) {
        console.error('Failed to delete appointment:', error);
        toast.error('Failed to delete appointment.');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Appointment' : 'Add New Appointment'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
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
                    "w-full justify-start text-left font-normal col-span-3",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startTime" className="text-right">
              Start Time
            </Label>
            <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endTime" className="text-right">
              End Time
            </Label>
            <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="color" className="text-right">
              Color
            </Label>
            <Input id="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="task" className="text-right">
              Link Task
            </Label>
            <Select onValueChange={setTaskId} value={taskId || ''}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Link to a task (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Task</SelectItem>
                {tasks.filter(t => t.status !== 'completed' && t.status !== 'archived').map(task => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          {initialData && (
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {initialData ? 'Save Changes' : 'Add Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentForm;