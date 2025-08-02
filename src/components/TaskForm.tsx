import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, BellRing, Lightbulb, Link } from 'lucide-react';
import { cn } from "@/lib/utils";
import CategorySelector from "./CategorySelector";
import PrioritySelector from "./PrioritySelector";
import SectionSelector from "./SectionSelector";
import { format, setHours, setMinutes, parse, addDays, addWeeks, addMonths, startOfDay, parseISO, isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { suggestTaskDetails } from '@/integrations/supabase/api'; // Updated import path
import { showError } from '@/utils/toast'; // Import showError

const taskFormSchema = z.object({
  description: z.string().min(1, { message: 'Task description is required.' }).max(255, { message: 'Description must be 255 characters or less.' }),
  category: z.string().min(1, { message: 'Category is required.' }),
  priority: z.string().min(1, { message: 'Priority is required.' }),
  dueDate: z.date().nullable().optional(),
  notes: z.string().max(500, { message: 'Notes must be 500 characters or less.' }).nullable().optional(),
  remindAtDate: z.date().nullable().optional(),
  remindAtTime: z.string().optional(), // Changed to optional string
  sectionId: z.string().nullable().optional(),
  recurringType: z.enum(['none', 'daily', 'weekly', 'monthly']),
  parentTaskId: z.string().nullable().optional(),
  link: z.string().nullable().optional().transform((val) => {
    if (!val) return null;
    let processedVal = val.trim();
    if (processedVal === '') return null;

    // If it doesn't start with http:// or https://, prepend https://
    if (!/^https?:\/\//i.test(processedVal)) {
      processedVal = `https://${processedVal}`;
    }
    return processedVal;
  }).refine((val) => {
    // Only validate if not null
    if (val === null) return true;
    try {
      new URL(val); // Attempt to create a URL object
      return true;
    } catch (e) {
      return false;
    }
  }, { message: 'Please enter a valid URL (e.g., example.com or https://example.com).' }), // Improved error message
}).superRefine((data, ctx) => { // Using superRefine for more robust conditional validation
  if (data.remindAtDate) {
    // If remindAtDate is set, remindAtTime is required and must be valid
    if (!data.remindAtTime || data.remindAtTime.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reminder time is required if a reminder date is set.',
        path: ['remindAtTime'],
      });
    } else {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-5]$/;
      if (!timeRegex.test(data.remindAtTime)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid time format (HH:MM).',
          path: ['remindAtTime'],
        });
      }
    }
  } else {
    // If remindAtDate is NOT set, remindAtTime must be empty or undefined
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
  }) => Promise<any>;
  onCancel: () => void;
  userId: string | null;
  sections: TaskSection[];
  allCategories: Category[];
  autoFocus?: boolean;
  preselectedSectionId?: string | null;
  parentTaskId?: string | null;
  currentDate?: Date; // Added currentDate prop
}

const TaskForm: React.FC<TaskFormProps> = ({
  initialData,
  onSave,
  onCancel,
  userId,
  sections,
  allCategories,
  autoFocus = false,
  preselectedSectionId = null,
  parentTaskId = null,
  currentDate = new Date(), // Default to new Date() if not provided
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  console.log('TaskForm: Rendered. initialData:', initialData?.id, initialData?.description);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      description: '',
      category: '',
      priority: 'medium',
      dueDate: null,
      notes: '',
      remindAtDate: null,
      remindAtTime: '',
      sectionId: preselectedSectionId,
      recurringType: 'none',
      parentTaskId: parentTaskId,
      link: '',
    },
  });

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = form;

  const description = watch('description');
  const remindAtDate = watch('remindAtDate');
  const recurringType = watch('recurringType');

  useEffect(() => {
    console.log('TaskForm useEffect: initialData changed. initialData:', initialData?.id, initialData?.description);
    if (initialData) {
      console.log('TaskForm useEffect: Setting form values from initialData.');
      reset({
        description: initialData.description,
        category: initialData.category,
        priority: initialData.priority,
        dueDate: initialData.due_date ? parseISO(initialData.due_date) : null,
        notes: initialData.notes || '',
        remindAtDate: initialData.remind_at ? parseISO(initialData.remind_at) : null,
        remindAtTime: initialData.remind_at ? format(parseISO(initialData.remind_at), 'HH:mm') : '',
        sectionId: initialData.section_id,
        recurringType: initialData.recurring_type,
        parentTaskId: initialData.parent_task_id,
        link: initialData.link || '',
      });
      console.log('TaskForm useEffect: Form description after reset:', form.getValues('description'));
    } else {
      console.log('TaskForm useEffect: Setting default values for new task.');
      const generalCategory = allCategories.find(cat => cat.name.toLowerCase() === 'general');
      reset({
        description: '',
        category: generalCategory?.id || allCategories[0]?.id || '',
        priority: 'medium',
        dueDate: null,
        notes: '',
        remindAtDate: null,
        remindAtTime: '',
        sectionId: preselectedSectionId,
        recurringType: 'none',
        parentTaskId: parentTaskId,
        link: '',
      });
    }
  }, [initialData, preselectedSectionId, parentTaskId, allCategories, reset, form]);

  const handleSuggest = useCallback(async () => {
    if (!description.trim()) {
      showError('Please enter a task description to get suggestions.');
      return;
    }
    setIsSuggesting(true);
    try {
      const categoriesForAI = allCategories.map(cat => ({ id: cat.id, name: cat.name }));
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

        // For section, we need to find the actual section ID if it exists
        const suggestedSection = sections.find(s => s.name.toLowerCase() === suggestions.section?.toLowerCase());
        if (suggestedSection) {
          setValue('sectionId', suggestedSection.id);
        } else {
          setValue('sectionId', null); // Default to no section if not found
        }
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      showError('Failed to get AI suggestions. Please try again.');
    } finally {
      setIsSuggesting(false);
    }
  }, [description, allCategories, sections, setValue, currentDate]);

  const onSubmit = async (data: TaskFormData) => {
    let finalRemindAt: Date | null = null;
    if (data.remindAtDate && data.remindAtTime && data.remindAtTime.trim() !== "") {
      const [hours, minutes] = data.remindAtTime.split(':').map(Number);
      finalRemindAt = setMinutes(setHours(data.remindAtDate, hours), minutes);
    }

    setIsSaving(true);
    const success = await onSave({
      description: data.description.trim(),
      category: data.category,
      priority: data.priority,
      due_date: data.dueDate instanceof Date ? data.dueDate.toISOString() : null,
      notes: data.notes || null,
      remind_at: finalRemindAt instanceof Date ? finalRemindAt.toISOString() : null,
      section_id: data.sectionId,
      recurring_type: data.recurringType,
      parent_task_id: data.parentTaskId,
      link: data.link || null, // Include link
    });
    setIsSaving(false);
    if (success) {
      onCancel();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && description.trim()) {
      event.preventDefault();
      // Only attempt submission if the form is currently valid
      if (form.formState.isValid) {
        handleSubmit(onSubmit)();
      } else {
        // Trigger validation to show errors if not valid
        form.trigger();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-3">
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
            className="flex-1 h-9"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <CategorySelector value={field.value} onChange={field.onChange} userId={userId} categories={allCategories} />
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
            <SectionSelector value={field.value} onChange={field.onChange} userId={userId} sections={sections} />
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
                      "w-full justify-start text-left font-normal h-9",
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
                <SelectTrigger aria-label="Select recurrence type" className="h-9">
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
                      "flex-1 justify-start text-left font-normal h-9",
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
            className="w-24 h-9"
            disabled={isSaving || isSuggesting || !remindAtDate}
            aria-label="Set reminder time"
          />
        </div>
        {errors.remindAtDate && <p className="text-destructive text-sm mt-1">{errors.remindAtDate.message}</p>}
        {errors.remindAtTime && <p className="text-destructive text-sm mt-1">{errors.remindAtTime.message}</p>}
      </div>

      <div>
        <Label htmlFor="task-link">Link (Optional)</Label>
        <Input
          id="task-link"
          placeholder="e.g., https://example.com/task-details"
          {...register('link')}
          disabled={isSaving || isSuggesting}
          className="h-9"
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
          className="min-h-[60px]"
        />
        {errors.notes && <p className="text-destructive text-sm mt-1">{errors.notes.message}</p>}
      </div>

      <div className="flex justify-end space-x-1.5 mt-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving || isSuggesting} className="h-9">
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || isSuggesting || !form.formState.isValid && form.formState.isSubmitted} className="h-9">
          {isSaving ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Task')}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;