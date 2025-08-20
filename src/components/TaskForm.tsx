import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link as LinkIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { SectionSelector } from '@/components/SectionSelector';

interface TaskFormProps {
  initialData?: Partial<Task>;
  onSubmit: (data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<void>;
  onCancel: () => void;
  sections: TaskSection[];
  allCategories: Category[];
  currentDate?: Date;
  createSection: (sectionData: Omit<TaskSection, 'id' | 'user_id' | 'created_at'>) => Promise<TaskSection | null>;
  updateSection: (id: string, updates: Partial<TaskSection>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (id: string, includeInFocusMode: boolean) => Promise<void>;
}

interface FormState {
  description: string;
  category: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  dueDate: Date | null;
  dueTime: string | null;
  notes: string | null;
  link: string | null;
  sectionId: string | null;
  recurringType: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | undefined;
  parentTaskId: string | null;
}

const TaskForm: React.FC<TaskFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  sections,
  allCategories,
  currentDate,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
}) => {
  const [formState, setFormState] = useState<FormState>({
    description: initialData?.description || '',
    category: initialData?.category || null,
    priority: initialData?.priority || null,
    dueDate: initialData?.due_date ? parseISO(initialData.due_date) : currentDate || null,
    dueTime: initialData?.due_date ? format(parseISO(initialData.due_date), 'HH:mm') : null,
    notes: initialData?.notes || null,
    link: initialData?.link || null,
    sectionId: initialData?.section_id || null,
    recurringType: initialData?.recurring_type as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | undefined || 'none',
    parentTaskId: initialData?.parent_task_id || null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof FormState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Combine date and time for due_date
      let due_date = null;
      if (formState.dueDate) {
        if (formState.dueTime) {
          const [hours, minutes] = formState.dueTime.split(':').map(Number);
          const dateWithTime = new Date(formState.dueDate);
          dateWithTime.setHours(hours, minutes, 0, 0);
          due_date = dateWithTime.toISOString();
        } else {
          due_date = formState.dueDate.toISOString();
        }
      }

      await onSubmit({
        description: formState.description,
        category: formState.category,
        priority: formState.priority,
        due_date,
        notes: formState.notes,
        remind_at: null,
        section_id: formState.sectionId,
        order: 0,
        parent_task_id: formState.parentTaskId,
        recurring_type: formState.recurringType || 'none',
        original_task_id: null,
        link: formState.link,
        image_url: null,
        status: 'to-do', // Add missing status property
        user_id: '', // Will be set by the hook
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    handleChange('dueDate', date || null);
  };

  const handleTimeChange = (time: string | undefined) => {
    handleChange('dueTime', time || null);
  };

  // Simple CategorySelector component
  const CategorySelector = ({ 
    categories, 
    selectedCategoryId, 
    onSelectCategory 
  }: { 
    categories: Category[]; 
    selectedCategoryId: string | null; 
    onSelectCategory: (categoryId: string | null) => void;
  }) => (
    <Select value={selectedCategoryId || ''} onValueChange={(value) => onSelectCategory(value || null)}>
      <SelectTrigger>
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">No category</SelectItem>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  // Simple DatePicker component
  const DatePicker = ({ 
    selected, 
    onSelect 
  }: { 
    selected: Date | null; 
    onSelect: (date: Date | undefined) => void;
  }) => (
    <Input
      type="date"
      value={selected ? format(selected, 'yyyy-MM-dd') : ''}
      onChange={(e) => onSelect(e.target.value ? new Date(e.target.value) : undefined)}
    />
  );

  // Simple TimePicker component
  const TimePicker = ({ 
    selectedTime, 
    onSelectTime 
  }: { 
    selectedTime: string | null; 
    onSelectTime: (time: string | undefined) => void;
  }) => (
    <Input
      type="time"
      value={selectedTime || ''}
      onChange={(e) => onSelectTime(e.target.value || undefined)}
    />
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="description">Task Description *</Label>
        <Input
          id="description"
          value={formState.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="What needs to be done?"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <CategorySelector
            categories={allCategories}
            selectedCategoryId={formState.category}
            onSelectCategory={(categoryId) => handleChange('category', categoryId)}
          />
        </div>

        <div>
          <Label>Priority</Label>
          <Select
            value={formState.priority || ''}
            onValueChange={(value) => handleChange('priority', value === '' ? null : value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Section</Label>
        <SectionSelector
          sections={sections}
          selectedSectionId={formState.sectionId}
          onSelectSection={(sectionId) => handleChange('sectionId', sectionId)}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Due Date</Label>
          <DatePicker
            selected={formState.dueDate}
            onSelect={handleDateChange}
          />
        </div>

        <div>
          <Label>Due Time</Label>
          <TimePicker
            selectedTime={formState.dueTime}
            onSelectTime={handleTimeChange}
          />
        </div>
      </div>

      <div>
        <Label>Recurring</Label>
        <Select
          value={formState.recurringType || 'none'}
          onValueChange={(value) => handleChange('recurringType', value as any)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Does not repeat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Does not repeat</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formState.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Add additional details..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="link">Link</Label>
        <div className="flex gap-2">
          <LinkIcon className="h-5 w-5 text-muted-foreground mt-2.5" />
          <Input
            id="link"
            value={formState.link || ''}
            onChange={(e) => handleChange('link', e.target.value)}
            placeholder="https://example.com"
            type="url"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !formState.description.trim()}>
          {isSubmitting ? 'Saving...' : initialData ? 'Update Task' : 'Add Task'}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;