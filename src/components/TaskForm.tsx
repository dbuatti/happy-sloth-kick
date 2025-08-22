"use client";

import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, TaskSection, TaskCategory } from '@/types'; // Import types from @/types
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Define the schema for task form validation
const taskFormSchema = z.object({
  description: z.string().min(1, "Description is required").nullable(),
  notes: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).nullable().optional(),
  category: z.string().nullable().optional(),
  section_id: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(), // Date string in YYYY-MM-DD format
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  task: Task | null;
  sections: TaskSection[];
  categories: TaskCategory[];
  onSave: (taskData: Partial<Task>) => Promise<void>;
  onCancel: () => void;
  initialSectionId?: string | null;
}

const TaskForm: React.FC<TaskFormProps> = ({ task, sections, categories, onSave, onCancel, initialSectionId }) => {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      description: '',
      notes: '',
      priority: 'medium',
      category: '',
      section_id: initialSectionId || '',
      due_date: '',
    }
  });

  useEffect(() => {
    if (task) {
      reset({
        description: task.description,
        notes: task.notes,
        priority: task.priority || 'medium',
        category: task.category || '',
        section_id: task.section_id || '',
        due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
      });
    } else {
      reset({
        description: '',
        notes: '',
        priority: 'medium',
        category: '',
        section_id: initialSectionId || '',
        due_date: '',
      });
    }
  }, [task, initialSectionId, reset]);

  const onSubmit = async (data: TaskFormValues) => {
    const taskData: Partial<Task> = {
      description: data.description,
      notes: data.notes,
      priority: data.priority,
      category: data.category,
      section_id: data.section_id,
      due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
    };
    await onSave(taskData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-lg bg-background mb-4">
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          {...register("description")}
          placeholder="Task description"
          className={errors.description ? "border-destructive" : ""}
        />
        {errors.description && <p className="text-destructive text-sm mt-1">{errors.description.message}</p>}
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register("notes")}
          placeholder="Additional notes"
        />
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
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
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
                {sections.map((sec) => (
                  <SelectItem key={sec.id} value={sec.id}>
                    {sec.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div>
        <Label htmlFor="due_date">Due Date</Label>
        <Input
          id="due_date"
          type="date"
          {...register("due_date")}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Task</Button>
      </div>
    </form>
  );
};

export default TaskForm;