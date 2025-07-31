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
import { format, setHours, setMinutes, parse, addDays, addWeeks, addMonths, startOfDay, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const taskFormSchema = z.object({
  description: z.string().min(1, { message: 'Task description is required.' }).max(255, { message: 'Description must be 255 characters or less.' }),
  category: z.string().min(1, { message: 'Category is required.' }),
  priority: z.string().min(1, { message: 'Priority is required.' }),
  dueDate: z.date().nullable().optional(),
  notes: z.string().max(500, { message: 'Notes must be 500 characters or less.' }).nullable().optional(),
  remindAtDate: z.date().nullable().optional(),
  remindAtTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Invalid time format (HH:MM).' }).nullable().optional(),
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
  }, { message: 'Must be a valid URL format (e.g., example.com or https://example.com).' }),
}).refine((data) => {
  if (data.remindAtDate && !data.remindAtTime) {
    return false; // If date is set, time must also be set
  }
  return true;
}, {
  message: 'Reminder time is required if a reminder date is set.',
  path: ['remindAtTime'],
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
}

const parseNaturalLanguage = (text: string, categories: Category[]) => {
  let dueDate: Date | undefined = undefined;
  let remindAt: Date | undefined = undefined;
  let priority: string | undefined = undefined;
  let categoryId: string | undefined = undefined;
  let tempDescription = text;

  const priorityKeywords = {
    'urgent': 'urgent', 'critical': 'urgent',
    'high': 'high', 'important': 'high',
    'medium': 'medium', 'normal': 'medium',
    'low': 'low', 'minor': 'low',
  };
  for (const [keyword, pValue] of Object.entries(priorityKeywords)) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(tempDescription)) {
      priority = pValue;
      tempDescription = tempDescription.replace(regex, '').trim();
      break;
    }
  }

  for (const category of categories) {
    const regex = new RegExp(`\\b${category.name.toLowerCase()}\\b`, 'i');
    if (regex.test(tempDescription)) {
      categoryId = category.id;
      tempDescription = tempDescription.replace(regex, '').trim();
      break;
    }
  }

  const today = startOfDay(new Date());
  if (/\btoday\b/i.test(tempDescription)) {
    dueDate = today;
    tempDescription = tempDescription.replace(/\btoday\b/i, '').trim();
  } else if (/\btomorrow\b/i.test(tempDescription)) {
    dueDate = addDays(today, 1);
    tempDescription = tempDescription.replace(/\btomorrow\b/i, '').trim();
  } else if (/\bnext week\b/i.test(tempDescription)) {
    dueDate = addWeeks(today, 1);
    tempDescription = tempDescription.replace(/\bnext week\b/i, '').trim();
  } else if (/\bnext month\b/i.test(tempDescription)) {
    dueDate = addMonths(today, 1);
    tempDescription = tempDescription.replace(/\bnext month\b/i, '').trim();
  } else {
    const dateRegex = /(on|by)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}(,\s*\d{4})?|\d{1,2}\/\d{1,2}(?:[/]\d{2,4})?/i;
    const match = tempDescription.match(dateRegex);
    if (match) {
      try {
        const parsedDate = parse(match[0], 'MMM d, yyyy', new Date());
        if (isNaN(parsedDate.getTime())) {
          const currentYear = new Date().getFullYear();
          const parsedDateNoYear = parse(`${match[0]} ${currentYear}`, 'MMM d yyyy', new Date());
          if (!isNaN(parsedDateNoYear.getTime())) {
            dueDate = parsedDateNoYear;
          }
        } else {
          dueDate = parsedDate;
        }
        tempDescription = tempDescription.replace(match[0], '').trim();
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }

  const timeRegex = /(at|by)\s*(\d{1,2}(:\d{2})?\s*(am|pm)?)/i;
  const timeMatch = tempDescription.match(timeRegex);
  let reminderTimeStr: string | undefined = undefined;
  if (timeMatch) {
    reminderTimeStr = timeMatch[2];
    tempDescription = tempDescription.replace(timeMatch[0], '').trim();
  }

  if (reminderTimeStr) {
    try {
      const baseDate = dueDate || new Date();
      let parsedTime = parse(reminderTimeStr, 'h:mm a', baseDate);
      if (isNaN(parsedTime.getTime())) {
        parsedTime = parse(reminderTimeStr, 'H:mm', baseDate);
      }
      if (!isNaN(parsedTime.getTime())) {
        remindAt = parsedTime;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  return {
    description: text,
    dueDate,
    remindAt,
    reminderTimeStr,
    priority,
    categoryId,
  };
};

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
}) => {
  const [isSaving, setIsSaving] = useState(false);

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
    if (initialData) {
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
    } else {
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
  }, [initialData, preselectedSectionId, parentTaskId, allCategories, reset]);

  const handleSuggest = useCallback(() => {
    const {
      dueDate: suggestedDueDate,
      remindAt: suggestedRemindAt,
      reminderTimeStr: suggestedReminderTimeStr,
      priority: suggestedPriority,
      categoryId: suggestedCategoryId,
    } = parseNaturalLanguage(description, allCategories);

    if (suggestedPriority) {
      setValue('priority', suggestedPriority);
    }
    if (suggestedCategoryId) {
      setValue('category', suggestedCategoryId);
    }
    if (suggestedDueDate) {
      setValue('dueDate', suggestedDueDate);
    }
    if (suggestedRemindAt) {
      setValue('remindAtDate', suggestedRemindAt);
      if (suggestedReminderTimeStr) {
        setValue('remindAtTime', format(suggestedRemindAt, 'HH:mm'));
      }
    }
  }, [description, allCategories, setValue]);

  const onSubmit = async (data: TaskFormData) => {
    let finalRemindAt: Date | null = null;
    if (data.remindAtDate && data.remindAtTime) {
      const [hours, minutes] = data.remindAtTime.split(':').map(Number);
      finalRemindAt = setMinutes(setHours(data.remindAtDate, hours), minutes);
    }

    setIsSaving(true);
    const success = await onSave({
      description: data.description.trim(),
      category: data.category,
      priority: data.priority,
      due_date: data.dueDate ? data.dueDate.toISOString() : null,
      notes: data.notes || null,
      remind_at: finalRemindAt ? finalRemindAt.toISOString() : null,
      section_id: data.sectionId,
      recurring_type: data.recurringType,
      parent_task_id: data.parentTaskId,
      link: data.link || null,
    });
    setIsSaving(false);
    if (success) {
      onCancel();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && description.trim()) {
      event.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
      <div>
        <Label htmlFor="task-description">Task Description</Label>
        <div className="flex gap-2">
          <Input
            id="task-description"
            placeholder="Task description (e.g., 'Buy groceries by tomorrow high priority')"
            {...register('description')}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            autoFocus={autoFocus}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSuggest}
            disabled={isSaving || !description.trim()}
            title="Suggest details from description"
            aria-label="Suggest task details"
          >
            <Lightbulb className="h-4 w-4" />
          </Button>
        </div>
        {errors.description && <p className="text-destructive text-sm mt-1">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                    disabled={isSaving}
                    aria-label="Select due date"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
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
              <Select value={field.value} onValueChange={field.onChange} disabled={!!initialData?.parent_task_id || isSaving}>
                <SelectTrigger aria-label="Select recurrence type">
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
                      "flex-1 justify-start text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                    disabled={isSaving}
                    aria-label="Set reminder date"
                  >
                    <BellRing className="mr-2 h-4 w-4" />
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
            className="w-24"
            disabled={isSaving || !remindAtDate}
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
          disabled={isSaving}
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
          disabled={isSaving}
        />
        {errors.notes && <p className="text-destructive text-sm mt-1">{errors.notes.message}</p>}
      </div>

      <div className="flex justify-end space-x-2 mt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || !form.formState.isValid && form.formState.isSubmitted}>
          {isSaving ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Task')}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;