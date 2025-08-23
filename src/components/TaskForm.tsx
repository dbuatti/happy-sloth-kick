import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from "@/lib/utils";
import { Task, TaskSection, TaskCategory, NewTaskData, UpdateTaskData, TaskFormProps } from '@/types';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-hot-toast';

const TaskForm: React.FC<TaskFormProps> = ({
  initialData,
  onSave,
  onCancel,
  sections,
  categories,
  autoFocus = false,
}) => {
  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<NewTaskData | UpdateTaskData>({
    defaultValues: {
      description: initialData?.description || '',
      notes: initialData?.notes || '',
      due_date: initialData?.due_date || null,
      priority: initialData?.priority || 'medium',
      section_id: initialData?.section_id || null,
      category: initialData?.category?.id || null,
      link: initialData?.link || '',
      image_url: initialData?.image_url || '',
      status: initialData?.status || 'to-do',
      recurring_type: initialData?.recurring_type || 'none',
    },
  });

  const dueDate = watch('due_date');

  useEffect(() => {
    reset({
      description: initialData?.description || '',
      notes: initialData?.notes || '',
      due_date: initialData?.due_date || null,
      priority: initialData?.priority || 'medium',
      section_id: initialData?.section_id || null,
      category: initialData?.category?.id || null,
      link: initialData?.link || '',
      image_url: initialData?.image_url || '',
      status: initialData?.status || 'to-do',
      recurring_type: initialData?.recurring_type || 'none',
    });
  }, [initialData, reset]);

  const onSubmit = async (data: NewTaskData | UpdateTaskData) => {
    try {
      await onSave(data);
      toast.success('Task saved successfully!');
    } catch (error) {
      console.error('Failed to save task:', error);
      toast.error('Failed to save task.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          {...register('description', { required: 'Description is required' })}
          autoFocus={autoFocus}
        />
        {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register('notes')} rows={3} />
      </div>

      <div>
        <Label htmlFor="priority">Priority</Label>
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value || 'medium'}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Category</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div>
        <Label htmlFor="section_id">Section</Label>
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
        <Label htmlFor="due_date">Due Date</Label>
        <Controller
          name="due_date"
          control={control}
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
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        />
      </div>

      <div>
        <Label htmlFor="link">Link</Label>
        <Input id="link" {...register('link')} placeholder="e.g. https://example.com" />
      </div>

      <div>
        <Label htmlFor="image_url">Image URL</Label>
        <Input id="image_url" {...register('image_url')} placeholder="e.g. https://example.com/image.jpg" />
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
        <Label htmlFor="recurring_type">Recurring</Label>
        <Controller
          name="recurring_type"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value || 'none'}>
              <SelectTrigger>
                <SelectValue placeholder="Select recurrence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Task</Button>
      </div>
    </form>
  );
};

export default TaskForm;