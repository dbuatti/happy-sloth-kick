import React, { useEffect } from 'react'; // Removed useState
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO, setHours, setMinutes } from 'date-fns'; // Removed isValid
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react'; // Removed ClockIcon
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Task, NewTaskData, UpdateTaskData, TaskSection, Category, NewTaskSectionData, UpdateTaskSectionData, NewCategoryData, UpdateCategoryData } from '@/hooks/useTasks';
import SectionSelector from './SectionSelector';
import CategorySelector from './CategorySelector';

const formSchema = z.object({
  description: z.string().min(1, { message: 'Description is required.' }),
  category: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).nullable().optional(),
  dueDate: z.date().nullable().optional(),
  dueTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  remindAtDate: z.date().nullable().optional(),
  remindAtTime: z.string().nullable().optional(),
  sectionId: z.string().nullable().optional(),
  recurringType: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).default('none'), // Added 'yearly'
  parentTaskId: z.string().nullable().optional(),
  link: z.string().url('Must be a valid URL').nullable().optional(),
  imageUrl: z.string().url('Must be a valid URL').nullable().optional(),
});

type TaskFormValues = z.infer<typeof formSchema>;

interface TaskFormProps {
  initialData?: Task | null;
  onSubmit: (data: NewTaskData | UpdateTaskData) => Promise<Task | null>;
  onTaskAdded?: () => void;
  sections: TaskSection[];
  allCategories: Category[];
  currentDate: Date;
  createSection: (newSection: NewTaskSectionData) => Promise<TaskSection | null>;
  updateSection: (sectionId: string, updates: UpdateTaskSectionData) => Promise<TaskSection | null>;
  deleteSection: (sectionId: string) => Promise<boolean>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<TaskSection | null>;
  createCategory: (newCategory: NewCategoryData) => Promise<Category | null>;
  updateCategory: (categoryId: string, updates: UpdateCategoryData) => Promise<Category | null>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
}

const TaskForm: React.FC<TaskFormProps> = ({
  initialData,
  onSubmit,
  onTaskAdded,
  sections,
  allCategories,
  currentDate,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  createCategory,
  updateCategory,
  deleteCategory,
}) => {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: initialData?.description || '',
      category: initialData?.category || null,
      priority: initialData?.priority || 'medium',
      dueDate: initialData?.due_date ? parseISO(initialData.due_date) : null,
      dueTime: initialData?.due_date ? format(parseISO(initialData.due_date), 'HH:mm') : null,
      notes: initialData?.notes || null,
      remindAtDate: initialData?.remind_at ? parseISO(initialData.remind_at) : null,
      remindAtTime: initialData?.remind_at ? format(parseISO(initialData.remind_at), 'HH:mm') : null,
      sectionId: initialData?.section_id || null,
      recurringType: initialData?.recurring_type || 'none',
      parentTaskId: initialData?.parent_task_id || null,
      link: initialData?.link || null,
      imageUrl: initialData?.image_url || null,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        description: initialData.description || '',
        category: initialData.category || null,
        priority: initialData.priority || 'medium',
        dueDate: initialData.due_date ? parseISO(initialData.due_date) : null,
        dueTime: initialData.due_date ? format(parseISO(initialData.due_date), 'HH:mm') : null,
        notes: initialData.notes || null,
        remindAtDate: initialData.remind_at ? parseISO(initialData.remind_at) : null,
        remindAtTime: initialData.remind_at ? format(parseISO(initialData.remind_at), 'HH:mm') : null,
        sectionId: initialData.section_id || null,
        recurringType: initialData.recurring_type || 'none',
        parentTaskId: initialData.parent_task_id || null,
        link: initialData.link || null,
        imageUrl: initialData.image_url || null,
      });
    } else {
      // For new tasks, set default due date to current date
      form.setValue('dueDate', currentDate);
      form.setValue('dueTime', format(currentDate, 'HH:mm'));
    }
  }, [initialData, form, currentDate]);

  const handleSubmit = async (values: TaskFormValues) => {
    let fullDueDate: string | null = null;
    if (values.dueDate) {
      let date = values.dueDate;
      if (values.dueTime) {
        const [hours, minutes] = values.dueTime.split(':').map(Number);
        date = setHours(setMinutes(date, minutes), hours);
      }
      fullDueDate = date.toISOString();
    }

    let fullRemindAt: string | null = null;
    if (values.remindAtDate) {
      let date = values.remindAtDate;
      if (values.remindAtTime) {
        const [hours, minutes] = values.remindAtTime.split(':').map(Number);
        date = setHours(setMinutes(date, minutes), hours);
      }
      fullRemindAt = date.toISOString();
    }

    const taskData: NewTaskData | UpdateTaskData = {
      description: values.description,
      category: values.category,
      priority: values.priority,
      due_date: fullDueDate ? format(parseISO(fullDueDate), 'yyyy-MM-dd HH:mm:ss') : null,
      notes: values.notes,
      remind_at: fullRemindAt,
      section_id: values.sectionId,
      recurring_type: values.recurringType,
      parent_task_id: values.parentTaskId,
      link: values.link,
      image_url: values.imageUrl,
      status: initialData?.status || 'to-do', // Preserve status if editing, default to 'to-do' for new
    };

    const result = await onSubmit(taskData);
    if (result && !initialData) {
      form.reset();
      onTaskAdded?.();
    } else if (result && initialData) {
      onTaskAdded?.(); // Close dialog on successful update
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Task description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <CategorySelector
          categories={allCategories}
          selectedCategoryId={form.watch('category') || null} // Ensure it's string or null
          onSelectCategory={(id: string | null) => form.setValue('category', id)} // Explicitly type id
          createCategory={createCategory}
          updateCategory={updateCategory}
          deleteCategory={deleteCategory}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || 'medium'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="mb-1">Due Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueTime"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="mb-1">Due Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="remindAtDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="mb-1">Remind At Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="remindAtTime"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="mb-1">Remind At Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Any additional notes for this task" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <SectionSelector
          sections={sections}
          selectedSectionId={form.watch('sectionId')}
          onSelectSection={(id) => form.setValue('sectionId', id)}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          createCategory={createCategory} // Pass through
          updateCategory={updateCategory} // Pass through
          deleteCategory={deleteCategory} // Pass through
        />

        <FormField
          control={form.control}
          name="recurringType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recurring</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recurrence" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="link"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link</FormLabel>
              <FormControl>
                <Input placeholder="e.g., https://example.com" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <FormControl>
                <Input placeholder="e.g., https://example.com/image.jpg" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {initialData ? 'Save Changes' : 'Create Task'}
        </Button>
      </form>
    </Form>
  );
};

export default TaskForm;