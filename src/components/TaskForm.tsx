"use client";

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, TaskSection, TaskCategory, TaskPriority, RecurringType } from '@/types/task'; // Corrected import
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import CategorySelector from './CategorySelector';

interface TaskFormProps {
  task?: Task;
  sections: TaskSection[];
  categories: TaskCategory[];
  onSubmit: (data: Partial<Task>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const TaskForm: React.FC<TaskFormProps> = ({
  task,
  sections,
  categories,
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  const { register, handleSubmit, control, reset, setValue, watch } = useForm<Partial<Task>>({
    defaultValues: {
      description: task?.description || '',
      notes: task?.notes || '',
      due_date: task?.due_date || undefined,
      priority: task?.priority || 'medium',
      section_id: task?.section_id || undefined,
      category: task?.category || undefined,
      recurring_type: task?.recurring_type || 'none',
      link: task?.link || '',
      image_url: task?.image_url || '',
    },
  });

  useEffect(() => {
    reset({
      description: task?.description || '',
      notes: task?.notes || '',
      due_date: task?.due_date || undefined,
      priority: task?.priority || 'medium',
      section_id: task?.section_id || undefined,
      category: task?.category || undefined,
      recurring_type: task?.recurring_type || 'none',
      link: task?.link || '',
      image_url: task?.image_url || '',
    });
  }, [task, reset]);

  // Removed unused selectedDueDate

  const handleDateSelect = (date: Date | undefined) => {
    setValue('due_date', date ? format(date, 'yyyy-MM-dd') : undefined, { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          {...register('description', { required: 'Description is required' })}
          placeholder="Task description"
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Add any additional notes"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="due_date">Due Date</Label>
          <Controller
            control={control}
            name="due_date"
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value ? parseISO(field.value) : undefined}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
        </div>

        <div>
          <Label htmlFor="priority">Priority</Label>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value as string}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {['urgent', 'high', 'medium', 'low', 'none'].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="section_id">Section</Label>
          <Controller
            control={control}
            name="section_id"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">No Section</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <CategorySelector
                categories={categories}
                selectedCategory={field.value || null}
                onSelectCategory={(value) => field.onChange(value)}
                placeholder="Select category"
                className="w-full"
              />
            )}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="recurring_type">Recurring</Label>
        <Controller
          control={control}
          name="recurring_type"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value as string}>
              <SelectTrigger>
                <SelectValue placeholder="Select recurrence" />
              </SelectTrigger>
              <SelectContent>
                {['none', 'daily', 'weekly', 'monthly', 'yearly'].map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div>
        <Label htmlFor="link">Link</Label>
        <Input
          id="link"
          {...register('link')}
          placeholder="Add a relevant link"
        />
      </div>

      <div>
        <Label htmlFor="image_url">Image URL</Label>
        <Input
          id="image_url"
          {...register('image_url')}
          placeholder="Add an image URL"
        />
      </div>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : (task ? 'Save Changes' : 'Create Task')}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;