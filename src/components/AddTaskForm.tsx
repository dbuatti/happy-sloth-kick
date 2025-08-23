import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import TaskForm from './TaskForm';
import { Task, TaskSection, TaskCategory, NewTaskData, UpdateTaskData } from '@/types'; // Corrected imports
import { toast } from 'react-hot-toast';

interface AddTaskFormProps {
  onAddTask: (
    description: string,
    sectionId: string | null,
    parentTaskId: string | null,
    dueDate: Date | null,
    categoryId: string | null,
    priority: string
  ) => Promise<Task>;
  onTaskAdded: () => void;
  categories: TaskCategory[];
  sections: TaskSection[];
  currentDate: Date;
  createSection: (data: NewTaskSectionData) => Promise<TaskSection>;
  updateSection: (data: { id: string; updates: UpdateTaskSectionData }) => Promise<TaskSection>;
  deleteSection: (id: string) => Promise<void>;
  updateSectionIncludeInFocusMode: (sectionId: string, include: boolean) => Promise<void>;
  showCompleted: boolean;
}

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
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState<Date | null>(null);

  const handleSubmit = async (taskData: NewTaskData | UpdateTaskData) => {
    try {
      // Assuming taskData is of type NewTaskData for adding
      const newTaskData = taskData as NewTaskData;
      await onAddTask(
        newTaskData.description,
        newTaskData.section_id || null,
        newTaskData.parent_task_id || null,
        newTaskData.due_date ? new Date(newTaskData.due_date) : null,
        newTaskData.category || null,
        newTaskData.priority || 'medium'
      );
      onTaskAdded();
      toast.success('Task added successfully!');
    } catch (error) {
      toast.error(`Failed to add task: ${(error as Error).message}`);
      console.error('Error adding task:', error);
    }
  };

  return (
    <TaskForm
      onSubmit={handleSubmit}
      onCancel={onTaskAdded}
      categories={categories}
      sections={sections}
    />
  );
};

export default AddTaskForm;