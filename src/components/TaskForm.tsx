import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import CategorySelector from './CategorySelector';
import { Task, TaskSection, TaskCategory, NewTaskData, UpdateTaskData, TaskStatus } from '@/types'; // Corrected imports

interface TaskFormProps {
  initialData?: Task | null;
  onSubmit: (data: NewTaskData | UpdateTaskData) => void;
  onCancel: () => void;
  categories: TaskCategory[];
  sections: TaskSection[];
}

const TaskForm: React.FC<TaskFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  categories,
  sections,
}) => {
  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<NewTaskData | UpdateTaskData>({
    defaultValues: {
      description: '',
      status: 'to-do',
      priority: 'medium',
      due_date: null,
      notes: null,
      remind_at: null,
      section_id: null,
      parent_task_id: null,
      recurring_type: 'none',
      category: null,
      link: null,
      image_url: null,
    }
  });

  const selectedDueDate = watch('due_date');
  const selectedCategory = watch('category');
  const selectedSection = watch('section_id');
  const selectedStatus = watch('status');
  const selectedPriority = watch('priority');
  const selectedRecurringType = watch('recurring_type');

  useEffect(() => {
    if (initialData) {
      reset({
        description: initialData.description,
        status: initialData.status,
        priority: initialData.priority,
        due_date: initialData.due_date ? format(new Date(initialData.due_date), 'yyyy-MM-dd') : null,
        notes: initialData.notes || null,
        remind_at: initialData.remind_at || null,
        section_id: initialData.section_id || null,
        parent_task_id: initialData.parent_task_id || null,
        recurring_type: initialData.recurring_type || 'none',
        category: initialData.category || null,
        link: initialData.link || null,
        image_url: initialData.image_url || null,
      });
    } else {
      reset();
    }
  }, [initialData, reset]);

  const handleDateSelect = (date: Date | undefined) => {
    setValue('due_date', date ? format(date, 'yyyy-MM-dd') : null, { shouldDirty: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...register('description', { required: 'Description is required' })} />
        {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="to-do">To Do</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div>
        <Label htmlFor="priority">Priority</Label>
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <CategorySelector
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={(id) => setValue('category', id, { shouldDirty: true })}
      />

      <div>
        <Label htmlFor="section">Section</Label>
        <Controller
          name="section_id"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Section</SelectItem>
                {sections.map(section => (
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
        <Label htmlFor="due_date">Due Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !selectedDueDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDueDate ? format(new Date(selectedDueDate), "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDueDate ? new Date(selectedDueDate) : undefined}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label htmlFor="recurring_type">Recurring Type</Label>
        <Controller
          name="recurring_type"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
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
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register('notes')} />
      </div>

      <div>
        <Label htmlFor="link">Link</Label>
        <Input id="link" {...register('link')} />
      </div>

      <div>
        <Label htmlFor="image_url">Image URL</Label>
        <Input id="image_url" {...register('image_url')} />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initialData ? 'Save Changes' : 'Create Task'}</Button>
      </div>
    </form>
  );
};

export default TaskForm;