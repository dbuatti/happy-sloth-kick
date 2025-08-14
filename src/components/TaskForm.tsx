import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, ImagePlus, XCircle } from "lucide-react";
import { format, parseISO, isValid, setHours, setMinutes } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import CategorySelector from './CategorySelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, Section, Category } from '@/hooks/useTasks'; // Changed TaskSection to Section
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { showError, showLoading, dismissToast } from '@/utils/toast';
import { getPriorityColor } from '@/utils/taskUtils';

// Define form schema with Zod
const formSchema = z.object({
  description: z.string().min(1, { message: "Description is required." }),
  category_id: z.string().nullable().optional(), // Changed to category_id
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.date().nullable().optional(),
  notes: z.string().nullable().optional(),
  remindAtDate: z.date().nullable().optional(),
  remindAtTime: z.string().nullable().optional(),
  section_id: z.string().nullable().optional(), // Changed to section_id
  recurringType: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
  parent_task_id: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
});

type TaskFormValues = z.infer<typeof formSchema>;

interface TaskFormProps {
  initialData?: Task | null;
  sections: Section[]; // Changed TaskSection to Section
  allCategories: Category[];
  onSave: (data: Omit<Task, 'id' | 'user_id' | 'created_at' | 'order' | 'status'>) => Promise<Task | null | boolean>; // Adjusted return type
  onCancel?: () => void;
  isSaving?: boolean;
  isSuggesting?: boolean;
  currentDate?: Date; // For setting default due date
}

const TaskForm: React.FC<TaskFormProps> = ({
  initialData,
  sections,
  allCategories,
  onSave,
  onCancel,
  isSaving = false,
  isSuggesting = false,
  currentDate = new Date(),
}) => {
  const { user } = useAuth();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const defaultValues: Partial<TaskFormValues> = {
    description: '',
    category_id: undefined, // Changed to category_id
    priority: 'medium',
    dueDate: null,
    notes: null,
    remindAtDate: null,
    remindAtTime: '',
    section_id: null, // Changed to section_id
    recurringType: 'none',
    parent_task_id: null,
    link: null,
    image_url: null,
  };

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        description: initialData.description || '',
        category_id: initialData.category_id, // Changed to category_id
        priority: initialData.priority || 'medium',
        dueDate: initialData.due_date ? parseISO(initialData.due_date) : null,
        notes: initialData.notes || null,
        remindAtDate: initialData.remind_at ? parseISO(initialData.remind_at) : null,
        remindAtTime: initialData.remind_at ? format(parseISO(initialData.remind_at), 'HH:mm') : '',
        section_id: initialData.section_id, // Changed to section_id
        recurringType: initialData.recurring_type || 'none',
        parent_task_id: initialData.parent_task_id,
        link: initialData.link ?? null,
        image_url: initialData.image_url ?? null,
      });
      setImagePreview(initialData.image_url || null);
    } else {
      form.reset({
        ...defaultValues,
        dueDate: currentDate, // Set default due date to current date for new tasks
      });
      setImagePreview(null);
      setImageFile(null);
    }
  }, [initialData, form, currentDate]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user?.id) {
      showError('User not authenticated for image upload.');
      return;
    }

    setUploadingImage(true);
    const toastId = showLoading('Uploading image...');

    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${user.id}/taskimages/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        setImagePreview(publicUrlData.publicUrl);
        setImageFile(file);
        form.setValue('image_url', publicUrlData.publicUrl);
        dismissToast(toastId);
      } else {
        throw new Error('Failed to get public URL.');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error.message);
      showError(`Image upload failed: ${error.message}`);
      setImagePreview(null);
      setImageFile(null);
      form.setValue('image_url', null);
    } finally {
      setUploadingImage(false);
      dismissToast(toastId);
    }
  };

  const handleRemoveImage = async () => {
    if (!user?.id) return;

    // If there was an initial image and we're removing it, delete from storage
    if (initialData?.image_url && imagePreview === initialData.image_url) { // Only delete if it's the original image
      try {
        const imagePath = initialData.image_url.split('/taskimages/')[1];
        if (imagePath) {
          const { error } = await supabase.storage
            .from('task-attachments')
            .remove([`${user.id}/taskimages/${imagePath}`]);
          if (error) console.error('Error deleting old image:', error);
        }
      } catch (e) {
        console.error('Error parsing image URL for deletion:', e);
      }
    }

    setImagePreview(null);
    setImageFile(null);
    form.setValue('image_url', null);
  };

  const onSubmit = async (values: TaskFormValues) => {
    let remindAtISO: string | null = null;
    if (values.remindAtDate && values.remindAtTime) {
      const [hours, minutes] = values.remindAtTime.split(':').map(Number);
      let combinedDateTime = setHours(values.remindAtDate, hours);
      combinedDateTime = setMinutes(combinedDateTime, minutes);
      remindAtISO = combinedDateTime.toISOString();
    }

    const taskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'order' | 'status'> = {
      description: values.description,
      priority: values.priority,
      due_date: values.dueDate ? values.dueDate.toISOString() : undefined, // Changed to undefined for optional
      notes: values.notes,
      remind_at: remindAtISO,
      category_id: values.category_id, // Changed to category_id
      section_id: values.section_id, // Changed to section_id
      recurring_type: values.recurringType,
      parent_task_id: values.parent_task_id,
      link: values.link,
      image_url: values.image_url,
    };

    await onSave(taskData);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="description"
        control={form.control}
        render={({ field, fieldState }) => (
          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...field} disabled={isSaving || isSuggesting} />
            {fieldState.error && <p className="text-red-500 text-sm mt-1">{fieldState.error.message}</p>}
          </div>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
          name="priority"
          control={form.control}
          render={({ field }) => (
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={field.value} onValueChange={field.onChange} disabled={isSaving || isSuggesting}>
                <SelectTrigger aria-label="Select priority" className="h-9 text-base">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", getPriorityColor(field.value))} />
                    <SelectValue placeholder="Select priority" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", getPriorityColor('low'))} />
                      Low
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", getPriorityColor('medium'))} />
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", getPriorityColor('high'))} />
                      High
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          name="category_id"
          control={form.control}
          render={({ field }) => (
            <div>
              <Label htmlFor="category">Category</Label>
              <CategorySelector
                categories={allCategories}
                value={field.value} // Can be string | null | undefined
                onChange={(val) => field.onChange(val)} // onChange now directly accepts string | null
                disabled={isSaving || isSuggesting}
              />
            </div>
          )}
        />
      </div>

      <Controller
        name="dueDate"
        control={form.control}
        render={({ field }) => (
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal h-9",
                    !field.value && "text-muted-foreground"
                  )}
                  disabled={isSaving || isSuggesting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={field.value || undefined}
                  onSelect={field.onChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
          name="remindAtDate"
          control={form.control}
          render={({ field }) => (
            <div>
              <Label htmlFor="remindAtDate">Reminder Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
                      !field.value && "text-muted-foreground"
                    )}
                    disabled={isSaving || isSuggesting}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        />
        <Controller
          name="remindAtTime"
          control={form.control}
          render={({ field }) => (
            <div>
              <Label htmlFor="remindAtTime">Reminder Time</Label>
              <div className="relative">
                <Input
                  id="remindAtTime"
                  type="time"
                  value={field.value || ''}
                  onChange={field.onChange}
                  className="pr-8 h-9"
                  disabled={isSaving || isSuggesting}
                />
                <Clock className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          )}
        />
      </div>

      <Controller
        name="section_id"
        control={form.control}
        render={({ field }) => (
          <div>
            <Label htmlFor="section">Section</Label>
            <Select value={field.value || 'no-section'} onValueChange={(val) => field.onChange(val === 'no-section' ? null : val)} disabled={isSaving || isSuggesting}>
              <SelectTrigger aria-label="Select section" className="h-9 text-base">
                <SelectValue placeholder="Select section">
                  {field.value ? sections.find(s => s.id === field.value)?.name : "No Section"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-section">No Section</SelectItem>
                {sections.map(section => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      />

      <Controller
        name="recurringType"
        control={form.control}
        render={({ field }) => (
          <div>
            <Label htmlFor="recurringType">Recurrence</Label>
            <Select value={field.value} onValueChange={field.onChange} disabled={!!initialData?.parent_task_id || isSaving || isSuggesting}>
              <SelectTrigger aria-label="Select recurrence type" className="h-9 text-base">
                <SelectValue placeholder="Select recurrence type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      />

      <Controller
        name="link"
        control={form.control}
        render={({ field }) => (
          <div>
            <Label htmlFor="link">Link / Path</Label>
            <Input id="link" {...field} disabled={isSaving || isSuggesting} />
          </div>
        )}
      />

      <div>
        <Label htmlFor="image-upload">Image Attachment</Label>
        {imagePreview ? (
          <div className="relative w-full h-48 border rounded-md flex items-center justify-center overflow-hidden">
            <img src={imagePreview} alt="Preview" className="max-h-full max-w-full object-contain" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 rounded-full bg-background/80 hover:bg-background"
              onClick={handleRemoveImage}
              disabled={isSaving || isSuggesting || uploadingImage}
            >
              <XCircle className="h-5 w-5 text-red-500" />
            </Button>
          </div>
        ) : (
          <div className="relative w-full h-24 border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleImageUpload}
              disabled={isSaving || isSuggesting || uploadingImage}
            />
            {uploadingImage ? (
              <span className="text-muted-foreground">Uploading...</span>
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <ImagePlus className="h-6 w-6" />
                <span>Add Image</span>
              </div>
            )}
          </div>
        )}
      </div>

      <Controller
        name="notes"
        control={form.control}
        render={({ field }) => (
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...field} disabled={isSaving || isSuggesting} />
          </div>
        )}
      />

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving || isSuggesting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSaving || isSuggesting || uploadingImage}>
          {isSaving ? 'Saving...' : initialData ? 'Save Changes' : 'Add Task'}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;