import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from "@/lib/utils";
import { Label } from '@/components/ui/label';
import { Task, TaskSection, TaskCategory, NewTaskData, UpdateTaskData, TaskFormProps } from '@/types';
import { useForm, Controller } from 'react-hook-form';

const TaskForm: React.FC<TaskFormProps> = ({ initialData, onSave, onCancel, categories, sections, parentTaskId, isSubtask = false }) => {
  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<NewTaskData | UpdateTaskData>({
    defaultValues: {
      description: initialData?.description || '',
      notes: initialData?.notes || '',
      due_date: initialData?.due_date || null,
      category: initialData?.category || null,
      section_id: initialData?.section_id || null,
      priority: initialData?.priority || 'medium',
      link: initialData?.link || '',
      image_url: initialData?.image_url || '',
      parent_task_id: parentTaskId || initialData?.parent_task_id || null,
      status: initialData?.status || 'to-do',
      recurring_type: initialData?.recurring_type || 'none',
    }
  });

  useEffect(() => {
    reset({
      description: initialData?.description || '',
      notes: initialData?.notes || '',
      due_date: initialData?.due_date || null,
      category: initialData?.category || null,
      section_id: initialData?.section_id || null,
      priority: initialData?.priority || 'medium',
      link: initialData?.link || '',
      image_url: initialData?.image_url || '',
      parent_task_id: parentTaskId || initialData?.parent_task_id || null,
      status: initialData?.status || 'to-do',
      recurring_type: initialData?.recurring_type || 'none',
    });
  }, [initialData, parentTaskId, reset]);

  const onSubmit = async (data: NewTaskData | UpdateTaskData) => {
    await onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...register('description', { required: 'Description is required' })} />
        {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register('notes')} />
      </div>

      <div>
        <Label htmlFor="priority">Priority</Label>
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div>
        <Label htmlFor="dueDate">Due Date</Label>
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
                  {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={field.value ? parseISO(field.value) : undefined}
                  onSelect={(date) => field.onChange(date ? date.toISOString() : null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
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
                {categories.map((category: TaskCategory) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {!isSubtask && (
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
                  {sections.map((section: TaskSection) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      <div>
        <Label htmlFor="link">Link</Label>
        <Input id="link" {...register('link')} />
      </div>

      <div>
        <Label htmlFor="imageUrl">Image URL</Label>
        <Input id="imageUrl" {...register('image_url')} />
      </div>

      <div className="flex justify-end space-x-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button type="submit">{initialData ? 'Save Changes' : 'Add Task'}</Button>
      </div>
    </form>
  );
};

export default TaskForm;