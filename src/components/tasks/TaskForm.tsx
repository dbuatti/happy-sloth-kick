import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Task, TaskCategory, TaskSection, TaskPriority, RecurringType } from '@/types/task-management';

interface TaskFormProps {
  initialTask?: Task | null;
  sectionId?: string | null;
  parentTaskId?: string | null;
  onSave: (task: Partial<Task>) => void;
  onClose: () => void;
  categories: TaskCategory[];
  sections: TaskSection[];
}

const TaskForm: React.FC<TaskFormProps> = ({
  initialTask,
  sectionId,
  parentTaskId,
  onSave,
  onClose,
  categories,
  sections,
}) => {
  const [description, setDescription] = useState(initialTask?.description || '');
  const [priority, setPriority] = useState<TaskPriority>(initialTask?.priority || 'medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(initialTask?.due_date ? parseISO(initialTask.due_date) : undefined);
  const [notes, setNotes] = useState(initialTask?.notes || '');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(sectionId || initialTask?.section_id || null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialTask?.category || null);
  const [recurringType, setRecurringType] = useState<RecurringType>(initialTask?.recurring_type || 'none');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Task description cannot be empty.');
      return;
    }
    onSave({
      ...initialTask,
      description,
      priority,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      notes,
      section_id: selectedSectionId,
      parent_task_id: parentTaskId,
      category: selectedCategory,
      recurring_type: recurringType,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Task description"
          className="mt-1"
        />
      </div>

      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
          Priority
        </label>
        <Select value={priority} onValueChange={(value: TaskPriority) => setPriority(value)}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <Select value={selectedCategory || ''} onValueChange={setSelectedCategory}>
          <SelectTrigger className="mt-1">
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
      </div>

      <div>
        <label htmlFor="section" className="block text-sm font-medium text-gray-700">
          Section
        </label>
        <Select value={selectedSectionId || ''} onValueChange={setSelectedSectionId}>
          <SelectTrigger className="mt-1">
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
      </div>

      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
          Due Date
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={'outline'}
              className={cn(
                'w-full justify-start text-left font-normal mt-1',
                !dueDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? format(dueDate, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <label htmlFor="recurringType" className="block text-sm font-medium text-gray-700">
          Recurring
        </label>
        <Select value={recurringType} onValueChange={(value: RecurringType) => setRecurringType(value)}>
          <SelectTrigger className="mt-1">
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
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any additional notes"
          className="mt-1"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save Task</Button>
      </DialogFooter>
    </form>
  );
};

export default TaskForm;