import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link as LinkIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Task, TaskSection, Category } from '@/hooks/useTasks';
import { SectionSelector } from '@/components/SectionSelector';

interface TaskDetailDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => Promise<void>;
  sections: TaskSection[];
  allCategories: Category[];
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
  recurringType: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
}

const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  sections,
  allCategories,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
}) => {
  const [formState, setFormState] = useState<FormState>({
    description: task.description,
    category: task.category,
    priority: task.priority,
    dueDate: task.due_date ? parseISO(task.due_date) : null,
    dueTime: task.due_date ? format(parseISO(task.due_date), 'HH:mm') : null,
    notes: task.notes,
    link: task.link,
    sectionId: task.section_id,
    recurringType: task.recurring_type,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: keyof FormState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
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

      // Create taskData with correct types
      const taskData = {
        description: formState.description,
        category: formState.category,
        priority: formState.priority,
        due_date: due_date,
        notes: formState.notes,
        remind_at: task.remind_at,
        section_id: formState.sectionId,
        recurring_type: formState.recurringType,
        parent_task_id: task.parent_task_id,
        link: formState.link,
        image_url: task.image_url,
      };

      await onUpdate(task.id, taskData);
      onClose();
    } finally {
      setIsSaving(false);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
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
              value={formState.recurringType}
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !formState.description.trim()}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;