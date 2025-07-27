import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, Palette } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format, parse, setHours, setMinutes, isValid, parseISO, addMinutes } from 'date-fns'; // Added addMinutes
import { Appointment, NewAppointmentData } from '@/hooks/useAppointments';

interface AppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewAppointmentData) => Promise<any>;
  initialData?: Appointment | null;
  selectedDate: Date;
  selectedTimeSlot?: { start: Date; end: Date } | null;
}

const presetColors = [
  { name: 'Blue', value: '#3b82f6', class: 'bg-blue-500' },
  { name: 'Green', value: '#22c55e', class: 'bg-green-500' },
  { name: 'Purple', value: '#a855f7', class: 'bg-purple-500' },
  { name: 'Yellow', value: '#eab308', class: 'bg-yellow-500' },
  { name: 'Red', value: '#ef4444', class: 'bg-red-500' },
  { name: 'Indigo', value: '#6366f1', class: 'bg-indigo-500' },
  { name: 'Pink', value: '#ec4899', class: 'bg-pink-500' },
  { name: 'Teal', value: '#14b8a6', class: 'bg-teal-500' },
];

const AppointmentForm: React.FC<AppointmentFormProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  selectedDate,
  selectedTimeSlot,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(selectedDate);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [color, setColor] = useState(presetColors[0].value);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || '');
        setDate(parseISO(initialData.date));
        setStartTime(initialData.start_time.substring(0, 5)); // HH:MM
        setEndTime(initialData.end_time.substring(0, 5));     // HH:MM
        setColor(initialData.color);
      } else {
        // For new appointments, pre-fill based on selected slot or current time
        setTitle('');
        setDescription('');
        setDate(selectedDate);
        if (selectedTimeSlot) {
          setStartTime(format(selectedTimeSlot.start, 'HH:mm'));
          setEndTime(format(selectedTimeSlot.end, 'HH:mm'));
        } else {
          const now = new Date();
          const defaultStartTime = format(setMinutes(setHours(now, now.getHours()), Math.floor(now.getMinutes() / 30) * 30), 'HH:mm');
          setStartTime(defaultStartTime);
          setEndTime(format(addMinutes(parse(defaultStartTime, 'HH:mm', now), 30), 'HH:mm'));
        }
        setColor(presetColors[0].value);
      }
    }
  }, [isOpen, initialData, selectedDate, selectedTimeSlot]);

  const handleSubmit = async () => {
    if (!title.trim() || !date || !startTime || !endTime) {
      alert('Title, date, start time, and end time are required.');
      return;
    }

    const parsedStartTime = parse(startTime, 'HH:mm', date);
    const parsedEndTime = parse(endTime, 'HH:mm', date);

    if (!isValid(parsedStartTime) || !isValid(parsedEndTime)) {
      alert('Invalid time format. Please use HH:MM.');
      return;
    }

    if (parsedStartTime >= parsedEndTime) {
      alert('End time must be after start time.');
      return;
    }

    setIsSaving(true);
    const success = await onSave({
      title: title.trim(),
      description: description.trim() || null,
      date: format(date, 'yyyy-MM-dd'),
      start_time: format(parsedStartTime, 'HH:mm:ss'),
      end_time: format(parsedEndTime, 'HH:mm:ss'),
      color: color,
    });
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] md:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Appointment' : 'Add New Appointment'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Appointment Title"
              required
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details about the appointment..."
              rows={3}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                    disabled={isSaving}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {presetColors.map((c) => (
                  <button
                    key={c.value}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 border-transparent transition-all duration-200",
                      c.class,
                      color === c.value && "ring-2 ring-offset-2 ring-primary"
                    )}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setColor(c.value)}
                    aria-label={c.name}
                    disabled={isSaving}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                disabled={isSaving}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentForm;