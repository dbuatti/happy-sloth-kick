import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Goal, GoalType, Category, NewGoalData } from '@/hooks/useResonanceGoals';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getCategoryColorProps } from '@/lib/categoryColors';

const goalFormSchema = z.object({
  title: z.string().min(1, { message: 'Goal title is required.' }).max(255, { message: 'Title must be 255 characters or less.' }),
  description: z.string().max(500, { message: 'Description must be 500 characters or less.' }).nullable().optional().transform(v => v ?? null),
  categoryId: z.string().nullable().optional().transform(v => v ?? null),
  type: z.enum(['daily', 'weekly', 'monthly', '3-month', '6-month', '9-month', 'yearly', '3-year', '5-year', '7-year', '10-year']),
  dueDate: z.date().nullable().optional().transform(v => v ?? null),
  parentGoalId: z.string().nullable().optional().transform(v => v ?? null),
});

export type GoalFormData = z.infer<typeof goalFormSchema>;

interface GoalFormProps {
  initialData?: Partial<Goal> | null;
  onSave: (goalData: NewGoalData) => Promise<any>;
  onCancel: () => void;
  allCategories: Category[];
  autoFocus?: boolean;
  preselectedType?: GoalType;
  parentGoalId?: string | null;
  className?: string;
}

const GoalForm: React.FC<GoalFormProps> = ({
  initialData,
  onSave,
  onCancel,
  allCategories,
  autoFocus = false,
  preselectedType = 'monthly',
  parentGoalId = null,
  className,
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: '',
      description: null,
      categoryId: null,
      type: preselectedType,
      dueDate: null,
      parentGoalId: parentGoalId,
    },
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = form;

  useEffect(() => {
    const defaultCategoryId = allCategories[0]?.id || null;

    const defaultValues = {
      title: '',
      description: null,
      categoryId: defaultCategoryId,
      type: preselectedType,
      dueDate: null,
      parentGoalId: parentGoalId,
    };

    if (initialData) {
      reset({
        ...defaultValues,
        title: initialData.title || '',
        description: initialData.description || null,
        categoryId: initialData.category_id || defaultCategoryId,
        type: initialData.type || preselectedType,
        dueDate: initialData.due_date ? parseISO(initialData.due_date) : null,
        parentGoalId: initialData.parent_goal_id || parentGoalId,
      });
    } else {
      reset(defaultValues);
    }
  }, [initialData, preselectedType, parentGoalId, allCategories, reset]);

  const onSubmit = async (data: GoalFormData) => {
    setIsSaving(true);
    const goalDataToSend: NewGoalData = {
      title: data.title,
      description: data.description,
      category_id: data.categoryId,
      type: data.type,
      due_date: data.dueDate ? format(data.dueDate, 'yyyy-MM-dd') : null,
      parent_goal_id: data.parentGoalId,
      completed: initialData?.completed ?? false, // Default to false for new, use initial for edit
      order: initialData?.order ?? null, // Default to null for new, use initial for edit
    };
    const success = await onSave(goalDataToSend);
    setIsSaving(false);
    if (success) {
      onCancel();
    }
    return success;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && form.getValues('title').trim()) {
      event.preventDefault();
      if (form.formState.isValid) {
        handleSubmit(onSubmit)();
      } else {
        form.trigger();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-3 py-3", className)}>
      <div>
        <Label htmlFor="goal-title">Goal Title</Label>
        <Input
          id="goal-title"
          placeholder="e.g., Learn a new language"
          {...register('title')}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          autoFocus={autoFocus}
          className="h-9 text-base"
        />
        {errors.title && <p className="text-destructive text-sm mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="goal-description">Description (Optional)</Label>
        <Textarea
          id="goal-description"
          placeholder="Add notes about this goal..."
          {...register('description')}
          rows={2}
          disabled={isSaving}
          className="min-h-[60px] text-base"
        />
        {errors.description && <p className="text-destructive text-sm mt-1">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={field.value || ''} onValueChange={field.onChange} disabled={isSaving}>
                <SelectTrigger className="flex-1 min-w-0 h-9 text-base">
                  <SelectValue placeholder="Select category">
                    <div className="flex items-center gap-2 w-full">
                      {field.value && allCategories.find(cat => cat.id === field.value) ? (
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center border" style={{ backgroundColor: getCategoryColorProps(allCategories.find(cat => cat.id === field.value)!.color).dotColor }}></div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center border" style={{ backgroundColor: getCategoryColorProps('gray').dotColor }}></div>
                      )}
                      <span className="flex-1 min-w-0 truncate">
                        {field.value && allCategories.find(cat => cat.id === field.value)?.name || 'Select category'}
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {allCategories.map(category => {
                    const colorProps = getCategoryColorProps(category.color);
                    return (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center border" style={{ backgroundColor: colorProps.dotColor }}></div>
                          {category.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        />
        {errors.categoryId && <p className="text-destructive text-sm mt-1">{errors.categoryId.message}</p>}

        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <div className="space-y-2">
              <Label>Goal Type</Label>
              <Select value={field.value} onValueChange={field.onChange} disabled={isSaving || !!parentGoalId}>
                <SelectTrigger className="h-9 text-base">
                  <SelectValue placeholder="Select goal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="3-month">3-Month</SelectItem>
                  <SelectItem value="6-month">6-Month</SelectItem>
                  <SelectItem value="9-month">9-Month</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="3-year">3-Year</SelectItem>
                  <SelectItem value="5-year">5-Year</SelectItem>
                  <SelectItem value="7-year">7-Year</SelectItem>
                  <SelectItem value="10-year">10-Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />
        {errors.type && <p className="text-destructive text-sm mt-1">{errors.type.message}</p>}
      </div>

      <div>
        <Label>Due Date (Optional)</Label>
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
                  disabled={isSaving}
                  aria-label="Select due date"
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarUI
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

      <div className="flex justify-end space-x-1.5 mt-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving} className="h-9 text-base">
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || (!form.formState.isValid && form.formState.isSubmitted)} className="h-9 text-base">
          {isSaving ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Goal')}
        </Button>
      </div>
    </form>
  );
};

export default GoalForm;