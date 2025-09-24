import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Calendar as CalendarUI } from "@/components/ui/calendar"; // Renamed import
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format, parse, setHours, setMinutes, parseISO, addMinutes, isValid } from 'date-fns';
import { Appointment, NewAppointmentData } from '@/hooks/useAppointments';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const appointmentFormSchema = z.object({
  title: z.string().min(1, { message: 'Title is required.' }).max(100, { message: 'Title must be 100 characters or less.' }),
  description: z.string().max(500, { message: 'Description must be 500 characters or less.' }).nullable(),
  date: z.date({ required_error: 'Date is required.' }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Invalid start time format (HH:MM).' }),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Invalid end time format (HH:MM).' }),
  color: z.string().min(1, { message: 'Color is required.' }),
}).refine((data) => {
  const parsedStartTime = parse(data.startTime, 'HH:mm', data.date);
  const parsedEndTime = parse(data.endTime, 'HH:mm', data.date);
  return parsedStartTime < parsedEndTime;
}, {
  message: 'End time must be after start time.',
  path: ['endTime'],
});

type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewAppointmentData) => Promise<any>;
  onDelete: (id: string) => Promise<boolean>; // New prop for delete
  initialData?: Appointment | null;
  selectedDate: Date;
  selectedTimeSlot?: { start: Date; end: Date } | null;
  prefilledData?: Partial<NewAppointmentData> | null;
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
  onDelete, // Destructure new prop
  initialData,
  selectedDate,
  selectedTimeSlot,
  prefilledData,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false); // State for delete confirmation

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      title: '',
      description: '',
      date: selectedDate,
      startTime: '',
      endTime: '',
      color: presetColors[0].value,
    },
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = form;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          title: initialData.title,
          description: initialData.description || '',
          date: parseISO(initialData.date),
          startTime: initialData.start_time.substring(0, 5), // HH:MM
          endTime: initialData.end_time.substring(0, 5),     // HH:MM
          color: initialData.color,
        });
      } else if (prefilledData) {
        const parsedDate = prefilledData.date && isValid(parseISO(prefilledData.date)) ? parseISO(prefilledData.date) : selectedDate;
        reset({
          title: prefilledData.title || '',
          description: prefilledData.description || '',
          date: parsedDate,
          startTime: prefilledData.start_time ? prefilledData.start_time.substring(0, 5) : '',
          endTime: prefilledData.end_time ? prefilledData.end_time.substring(0, 5) : '',
          color: prefilledData.color || presetColors[0].value,
        });
      } else {
        const now = new Date();
        const defaultStartTime = format(setMinutes(setHours(now, now.getHours()), Math.floor(now.getMinutes() / 30) * 30), 'HH:mm');
        const defaultEndTime = format(addMinutes(parse(defaultStartTime, 'HH:mm', now), 30), 'HH:mm');

        reset({
          title: '',
          description: '',
          date: selectedDate,
          startTime: selectedTimeSlot ? format(selectedTimeSlot.start, 'HH:mm') : defaultStartTime,
          endTime: selectedTimeSlot ? format(selectedTimeSlot.end, 'HH:mm') : defaultEndTime,
          color: presetColors[0].value,
        });
      }
    }
  }, [isOpen, initialData, prefilledData, selectedDate, selectedTimeSlot, reset]);

  const onSubmit = async (data: AppointmentFormData) => {
    setIsSaving(true);
    const success = await onSave({
      title: data.title.trim(),
      description: data.description?.trim() || null,
      date: format(data.date, 'yyyy-MM-dd'),
      start_time: format(parse(data.startTime, 'HH:mm', data.date), 'HH:mm:ss'),
      end_time: format(parse(data.endTime, 'HH:mm', data.date), 'HH:mm:ss'),
      color: data.color,
      task_id: initialData?.task_id || null,
    });
    setIsSaving(false);
    if (success) {
      onClose(); // Close form on successful save
    }
  };

  const handleDeleteClick = () => {
    setShowConfirmDeleteDialog(true);
  };

  const confirmDeleteAppointment = async () => {
    if (initialData) {
      const success = await onDelete(initialData.id);
      if (success) {
        setShowConfirmDeleteDialog(false);
        onClose();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] md:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Appointment' : 'Add New Appointment'}</DialogTitle>
          <DialogDescription className="sr-only">
            {initialData ? 'Edit the details of your appointment.' : 'Fill in the details to add a new appointment.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Appointment Title"
              disabled={isSaving}
              autoFocus
              className="h-9 text-base"
            />
            {errors.title && <p className="text-destructive text-sm mt-1">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Details about the appointment..."
              rows={2}
              disabled={isSaving}
              className="text-base"
            />
            {errors.description && <p className="text-destructive text-sm mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-9 text-base",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isSaving}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarUI // Corrected component usage
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.date && <p className="text-destructive text-sm mt-1">{errors.date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {presetColors.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        className={cn(
                          "w-8 h-8 rounded-full border-2 border-transparent transition-all duration-200",
                          c.class,
                          field.value === c.value && "ring-2 ring-offset-2 ring-primary"
                        )}
                        style={{ backgroundColor: c.value }}
                        onClick={() => field.onChange(c.value)}
                        aria-label={c.name}
                        disabled={isSaving}
                      />
                    ))}
                  </div>
                )}
              />
              {errors.color && <p className="text-destructive text-sm mt-1">{errors.color.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                {...register('startTime')}
                disabled={isSaving}
                className="h-9 text-base"
              />
              {errors.startTime && <p className="text-destructive text-sm mt-1">{errors.startTime.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
            <Input
                id="end-time"
                type="time"
                {...register('endTime')}
                disabled={isSaving}
                className="h-9 text-base"
              />
              {errors.endTime && <p className="text-destructive text-sm mt-1">{errors.endTime.message}</p>}
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 pt-4">
            {initialData && ( // Only show delete button if editing an existing appointment
              <Button type="button" variant="destructive" onClick={handleDeleteClick} disabled={isSaving} className="w-full sm:w-auto mt-2 sm:mt-0 h-9 text-base">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Appointment
              </Button>
            )}
            <div className="flex space-x-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="flex-1 h-9 text-base">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="flex-1 h-9 text-base">
                {isSaving ? 'Saving...' : 'Save Appointment'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Delete Appointment Confirmation Dialog */}
      <AlertDialog open={showConfirmDeleteDialog} onOpenChange={setShowConfirmDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this appointment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAppointment}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default AppointmentForm;