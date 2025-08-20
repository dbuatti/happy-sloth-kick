import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, BellRing, Lightbulb, UploadCloud, X } from 'lucide-react';
import { cn } from "@/lib/utils";
import CategorySelector from "./CategorySelector";
import PrioritySelector from "./PrioritySelector";
import SectionSelector from "./SectionSelector";
import { format, setHours, setMinutes, parseISO, isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, TaskSection, Category } from '@/hooks/tasks/types'; // Updated import path
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { suggestTaskDetails } from '@/integrations/supabase/api';
import { showError } from '@/utils/toast';
import { useAuth } from '@/context/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';

const taskFormSchema = z.object({
  description: z.string().min(1, { message: 'Task description is required.' }).max(255, { message: 'Description must be 255 characters or less.' }),
  category: z.string().min(1, { message: 'Category is required.' }),
  priority: z.string().min(1, { message: 'Priority is required.' }),
  dueDate: z.date().nullable().optional().transform(v => v ?? null),
  notes: z.string().max(500, { message: 'Notes must be 500 characters or less.' }).nullable().optional().transform(v => v ?? null),
  remindAtDate: z.date().nullable().optional().transform(v => v ?? null),
  remindAtTime: z.string().optional(),
  sectionId: z.string().nullable().optional().transform(v => v ?? null),
  recurringType: z.enum(['none', 'daily', 'weekly', 'monthly']),
  parentTaskId: z.string().nullable().optional().transform(v => v ?? null),
  link: z.string().optional().transform((val) => {
    if (!val || val.trim() === '') return null;
    const trimmedVal = val.trim();
    if (trimmedVal.startsWith('/') || trimmedVal.startsWith('~') || trimmedVal.startsWith('file:')) {
        return trimmedVal;
    }
    if (!/^https?:\/\//i.test(trimmedVal) && trimmedVal.includes('.')) {
        return `https://${trimmedVal}`;
    }
    return trimmedVal;
  }).nullable(),
  image_url: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.remindAtDate) {
    if (!data.remindAtTime || data.remindAtTime.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reminder time is required if a reminder date is set.',
        path: ['remindAtTime'],
      });
    } else {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(data.remindAtTime)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid time format (HH:MM).',
          path: ['remindAtTime'],
        });
      }
    }
  } else {
    if (data.remindAtTime && data.remindAtTime.trim() !== "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cannot set a reminder time without a reminder date.',
        path: ['remindAtTime'],
      });
    }
  }
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  initialData?: Task | null;
  onSave: (taskData: {
    description: string;
    category: string;
    priority: string;
    due_date: string | null;
    notes: string | null;
    remind_at: string | null;
    section_id: string | null;
    recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
    parent_task_id: string | null;
    link: string | null;
    image_url: string | null;
  }) => Promise<any>;
  onCancel: () => void;
  sections: TaskSection[];
  allCategories: Category[];
  autoFocus?: boolean;
  preselectedSectionId?: string | null;
  parentTaskId?: string | null;
  currentDate?: Date;
  createSection: (name: string) => Promise<void>;
  updateSection: (sectionId: string, newName: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
}

const TaskForm: React.FC<TaskFormProps> = ({
  initialData,
  onSave,
  onCancel,
  sections,
  allCategories,
  autoFocus = false,
  preselectedSectionId = null,
  parentTaskId = null,
  currentDate = new Date(),
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
}) => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      description: '',
      category: '',
      priority: 'medium',
      dueDate: null,
      notes: null,
      remindAtDate: null,
      remindAtTime: '',
      sectionId: preselectedSectionId,
      recurringType: 'none' as const,
      parentTaskId: parentTaskId ?? null,
      link: null,
      image_url: null,
    },
  });

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = form;

  const description = watch('description');
  const remindAtDate = watch('remindAtDate');

  useEffect(() => {
    const generalCategory = allCategories.find(cat => cat.name.toLowerCase() === 'general');
    const defaultValues = {
      description: '',
      category: generalCategory?.id || allCategories[0]?.id || '',
      priority: 'medium',
      dueDate: null,
      notes: null,
      remindAtDate: null,
      remindAtTime: '',
      sectionId: preselectedSectionId,
      recurringType: 'none' as const,
      parentTaskId: parentTaskId ?? null,
      link: null,
      image_url: null,
    };

    if (initialData) {
      reset({
        ...defaultValues,
        description: initialData.description || '',
        category: initialData.category || defaultValues.category,
        priority: initialData.priority || 'medium',
        dueDate: initialData.due_date ? parseISO(initialData.due_date) : null,
        notes: initialData.notes || null,
        remindAtDate: initialData.remind_at ? parseISO(initialData.remind_at) : null,
        remindAtTime: initialData.remind_at ? format(parseISO(initialData.remind_at), 'HH:mm') : '',
        sectionId: initialData.section_id,
        recurringType: initialData.recurring_type || 'none',
        parentTaskId: initialData.parent_task_id,
        link: initialData.link ?? null,
        image_url: initialData.image_url ?? null,
      });
      setImagePreview(initialData.image_url || null);
    } else {
      reset(defaultValues);
      setImagePreview(null);
    }
    setImageFile(null);
  }, [initialData, preselectedSectionId, parentTaskId, allCategories, reset]);

  const handleSuggest = useCallback(async () => {
    if (!description.trim()) {
      showError('Please enter a task description to get suggestions.');
      return;
    }
    setIsSuggesting(true);
    try {
      const categoriesForAI = allCategories.map((cat: Category) => ({ id: cat.id, name: cat.name }));
      const suggestions = await suggestTaskDetails(description, categoriesForAI, currentDate);

      if (suggestions) {
        setValue('description', suggestions.cleanedDescription);
        setValue('priority', suggestions.priority);
        setValue('category', suggestions.category);
        
        if (suggestions.dueDate) {
          setValue('dueDate', parseISO(suggestions.dueDate));
        } else {
          setValue('dueDate', null);
        }

        if (suggestions.remindAt) {
          const parsedRemindAt = parseISO(suggestions.remindAt);
          if (isValid(parsedRemindAt)) {
            setValue('remindAtDate', parsedRemindAt);
            setValue('remindAtTime', format(parsedRemindAt, 'HH:mm'));
          }
        }

        const suggestedSection = sections.find(s => s.name.toLowerCase() === suggestions.section?.toLowerCase());
        if (suggestedSection) {
          setValue('sectionId', suggestedSection.id);
        } else {
          setValue('sectionId', null);
        }
        setValue('link', suggestions.link || null);
        setValue('notes', suggestions.notes || null);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      showError('Failed to get AI suggestions. Please try again.');
    } finally {
      setIsSuggesting(false);
    }
  }, [description, allCategories, sections, setValue, currentDate]);

  const handleFile = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      showError('Please upload a valid image file.');
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLFormElement>) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        handleFile(file);
        break;
      }
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFile(event.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const onSubmit = async (data: TaskFormData) => {
    let finalRemindAt: Date | null = null;
    if (data.remindAtDate && data.remindAtTime && data.remindAtTime.trim() !== "") {
      const [hours, minutes] = data.remindAtTime.split(':').map(Number);
      finalRemindAt = setMinutes(setHours(data.remindAtDate, hours), minutes);
    }

    setIsSaving(true);

    let imageUrlToSave = initialData?.image_url || null;

    if (imagePreview === null && initialData?.image_url) {
      imageUrlToSave = null;
      try {
        const imagePath = initialData.image_url.split('/taskimages/')[1];
        if (imagePath) {
          await supabase.storage.from('taskimages').remove([imagePath]);
        }
      } catch (imgErr) {
        console.error("Failed to delete old image:", imgErr);
      }
    }

    if (imageFile) {
      if (!user) {
        showError("You must be logged in to upload images.");
        setIsSaving(false);
        return;
      }
      const filePath = `${user.id}/${uuidv4()}`;
      const { error: uploadError } = await supabase.storage
        .from('taskimages')
        .upload(filePath, imageFile);

      if (uploadError) {
        showError(`Image upload failed: ${uploadError.message}`);
        setIsSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('taskimages')
        .getPublicUrl(filePath);
      
      imageUrlToSave = urlData.publicUrl;
    }

    const success = await onSave({
      description: data.description.trim(),
      category: data.category,
      priority: data.priority,
      due_date: data.dueDate ? format(data.dueDate, 'yyyy-MM-dd') : null,
      notes: data.notes,
      remind_at: finalRemindAt ? finalRemindAt.toISOString() : null,
      section_id: data.sectionId,
      recurring_type: data.recurringType,
      parent_task_id: data.parentTaskId,
      link: data.link,
      image_url: imageUrlToSave,
    });
    setIsSaving(false);
    if (success) {
      onCancel();
    }
    return success;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && description.trim()) {
      event.preventDefault();
      if (form.formState.isValid) {
        handleSubmit(onSubmit)();
      } else {
        form.trigger();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} onPaste={handlePaste} className="space-y-3 py-3">
      <div>
        <Label htmlFor="task-description">Task Description</Label>
        <div className="flex gap-1.5">
          <Input
            id="task-description"
            placeholder="Task description (e.g., 'Buy groceries by tomorrow high priority at 6pm personal')"
            {...register('description')}
            onKeyDown={handleKeyDown}
            disabled={isSaving || isSuggesting}
            autoFocus={autoFocus}
            className="flex-1 h-9 text-base"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSuggest}
            disabled={isSaving || isSuggesting || !description.trim()}
            title="Suggest details from description"
            aria-label="Suggest task details"
            className="h-9 w-9"
          >
            {isSuggesting ? (
              <span className="animate-spin h-3.5 w-3.5 border-b-2 border-primary rounded-full" />
            ) : (
              <Lightbulb className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        {errors.description && <p className="text-destructive text-sm mt-1">{errors.description.message}</p>}
      </div>

      <div 
        className={cn(
          "relative border-2 border-dashed rounded-lg p-4 text-center transition-colors",
          isDragging ? "border-primary bg-primary/10" : "border-border"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        {imagePreview ? (
          <>
            <img src={imagePreview} alt="Preview" className="rounded-md max-h-40 mx-auto" />
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 bg-background/50 hover:bg-background/80" onClick={handleRemoveImage}>
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
            <UploadCloud className="h-8 w-8" />
            <p>Drag & drop, paste, or click to upload an image.</p>
            <Input type="file" accept="image/*" className="sr-only" id="file-upload" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
            <Label htmlFor="file-upload" className="text-primary underline cursor-pointer">
              click to upload
            </Label>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <CategorySelector value={field.value} onChange={field.onChange} categories={allCategories} />
          )}
        />
        {errors.category && <p className="text-destructive text-sm mt-1">{errors.category.message}</p>}

        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <PrioritySelector value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.priority && <p className="text-destructive text-sm mt-1">{errors.priority.message}</p>}
      </div>

      <div>
        <Controller
          control={control}
          name="sectionId"
          render={({ field }) => (
            <SectionSelector
              value={field.value}
              onChange={field.onChange}
              sections={sections}
              createSection={createSection}
              updateSection={updateSection}
              deleteSection={deleteSection}
              updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            />
          )}
        />
        {errors.sectionId && <p className="text-destructive text-sm mt-1">{errors.sectionId.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <Label>Due Date</Label>
          <Controller
            control={control}
            name="dueDate"
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-9 text-base",
                      !field.value && "text-muted-foreground"
                    )}
                    disabled={isSaving || isSuggesting}
                    aria-label="Select due date"
                  >
                    <Calendar className="mr-2 h-3.5 w-3.5" />
                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          {errors.dueDate && <p className="text-destructive text-sm mt-1">{errors.dueDate.message}</p>}
        </div>

        <div>
          <Label>Recurring</Label>
          <Controller
            control={control}
            name="recurringType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={!!initialData?.parent_task_id || isSaving || isSuggesting}>
                <SelectTrigger aria-label="Select recurrence type" className="h-9 text-base">
                  <SelectValue placeholder="Select recurrence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.recurringType && <p className="text-destructive text-sm mt-1">{errors.recurringType.message}</p>}
        </div>
      </div>

      <div>
        <Label>Reminder</Label>
        <div className="flex gap-2">
          <Controller
            control={control}
            name="remindAtDate"
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal h-9 text-base",
                      !field.value && "text-muted-foreground"
                    )}
                    disabled={isSaving || isSuggesting}
                    aria-label="Set reminder date"
                  >
                    <BellRing className="mr-2 h-3.5 w-3.5" />
                    {field.value ? format(field.value, "PPP") : <span>Set reminder date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          <Input
            type="time"
            {...register('remindAtTime')}
            className="w-24 h-9 text-base"
            disabled={isSaving || isSuggesting || !remindAtDate}
            aria-label="Set reminder time"
          />
        </div>
        {errors.remindAtDate && <p className="text-destructive text-sm mt-1">{errors.remindAtDate.message}</p>}
        {errors.remindAtTime && <p className="text-destructive text-sm mt-1">{errors.remindAtTime.message}</p>}
      </div>

      <div>
        <Label htmlFor="task-link">Link / File Path (Optional)</Label>
        <Input
          id="task-link"
          placeholder="URL or local file path (e.g., /Users/...)"
          {...register('link')}
          disabled={isSaving || isSuggesting}
          className="h-9 text-base"
        />
        {errors.link && <p className="text-destructive text-sm mt-1">{errors.link.message}</p>}
      </div>

      <div>
        <Label htmlFor="task-notes">Notes</Label>
        <Textarea
          id="task-notes"
          placeholder="Add notes about this task..."
          {...register('notes')}
          rows={2}
          disabled={isSaving || isSuggesting}
          className="min-h-[60px] text-base"
        />
        {errors.notes && <p className="text-destructive text-sm mt-1">{errors.notes.message}</p>}
      </div>

      <div className="flex justify-end space-x-1.5 mt-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving || isSuggesting} className="h-9 text-base">
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || isSuggesting || (!form.formState.isValid && form.formState.isSubmitted)} className="h-9 text-base">
          {isSaving ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Task')}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;