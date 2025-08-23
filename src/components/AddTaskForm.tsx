import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import TaskForm from './TaskForm';
import { Task, TaskSection, TaskCategory, NewTaskData, UpdateTaskData, NewTaskSectionData, UpdateTaskSectionData, AddTaskFormProps } from '@/types';
import { toast } from 'react-hot-toast';

const AddTaskForm: React.FC<AddTaskFormProps> = ({
  onAddTask,
  onTaskAdded,
  categories,
  sections,
  currentDate,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode,
  showCompleted,
}) => {
  const [description, setDescription] = useState('');
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [dueDate, setDueDate] = useState<Date | null>(null);

  const handleAddTask = async () => {
    if (!description.trim()) {
      toast.error('Task description cannot be empty.');
      return;
    }

    const newTaskData: NewTaskData = {
      description: description.trim(),
      section_id: sectionId,
      category: categoryId,
      priority: priority,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      status: 'to-do',
      user_id: '', // Will be filled by the hook
    };

    try {
      await onAddTask(newTaskData);
      setDescription('');
      setSectionId(null);
      setCategoryId(null);
      setPriority('medium');
      setDueDate(null);
      onTaskAdded();
    } catch (error) {
      console.error('Failed to add task:', error);
      toast.error('Failed to add task.');
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Buy groceries"
          autoFocus
        />
      </div>

      <div>
        <Label htmlFor="section">Section</Label>
        <Select onValueChange={setSectionId} value={sectionId || ''}>
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
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select onValueChange={setCategoryId} value={categoryId || ''}>
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
      </div>

      <div>
        <Label htmlFor="priority">Priority</Label>
        <Select onValueChange={(value: Task['priority']) => setPriority(value)} value={priority || 'medium'}>
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
      </div>

      <div>
        <Label htmlFor="dueDate">Due Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !dueDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dueDate || undefined}
              onSelect={setDueDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onTaskAdded}>
          Cancel
        </Button>
        <Button type="submit" onClick={handleAddTask}>
          Add Task
        </Button>
      </DialogFooter>
    </div>
  );
};

export default AddTaskForm;