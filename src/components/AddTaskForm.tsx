import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  TaskSection,
  TaskCategory,
  Task,
  RecurringType,
  TaskPriority,
} from '@/types/task';
import { format } from 'date-fns';
import DatePicker from '@/components/ui/date-picker';
import SelectDialog from '@/components/SelectDialog';
import { AddTaskFormProps } from '@/types/props';
import { DialogFooter } from '@/components/ui/dialog';

const AddTaskForm: React.FC<AddTaskFormProps> = ({
  onAddTask,
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
  initialData,
}) => {
  const [description, setDescription] = useState(initialData?.description || '');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    initialData?.due_date ? new Date(initialData.due_date) : undefined
  );
  const [priority, setPriority] = useState<TaskPriority>(initialData?.priority || null);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(
    initialData?.category
      ? allCategories.find((cat) => cat.id === initialData.category) || null
      : null
  );
  const [selectedSection, setSelectedSection] = useState<TaskSection | null>(
    initialData?.section_id
      ? sections.find((sec) => sec.id === initialData.section_id) || null
      : null
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [recurringType, setRecurringType] = useState<RecurringType>(initialData?.recurring_type || 'none');

  const handleSave = async () => {
    if (!description.trim()) return;

    const taskData: Partial<Task> = {
      description: description.trim(),
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      priority: priority,
      category: selectedCategory?.id || null,
      section_id: selectedSection?.id || null,
      notes,
      recurring_type: recurringType,
    };

    await onAddTask(taskData);
    setDescription('');
    setDueDate(undefined);
    setPriority(null);
    setSelectedCategory(null);
    setSelectedSection(null);
    setNotes('');
    setRecurringType('none');
    onTaskAdded?.();
  };

  return (
    <form className="grid gap-4 py-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="description" className="text-right">
          Description
        </Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="col-span-3"
          required
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="due-date" className="text-right">
          Due Date
        </Label>
        <div className="col-span-3">
          <DatePicker
            date={dueDate}
            setDate={setDueDate}
            placeholder="Select due date"
          />
        </div>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="priority" className="text-right">
          Priority
        </Label>
        <Select
          value={priority || ''}
          onValueChange={(value: TaskPriority | 'null') => setPriority(value === 'null' ? null : value)}
        >
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="null">None</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="category" className="text-right">
          Category
        </Label>
        <SelectDialog
          items={allCategories.map(cat => ({
            id: cat.id,
            name: cat.name,
            color: cat.color,
          }))}
          selectedItem={selectedCategory ? { id: selectedCategory.id, name: selectedCategory.name, color: selectedCategory.color } : null}
          onSelectItem={(item: { id: string; name: string; color?: string } | null) => setSelectedCategory(allCategories.find(cat => cat.id === item?.id) || null)}
          createItem={createCategory}
          updateItem={updateCategory}
          deleteItem={deleteCategory}
          placeholder="Select category"
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="section" className="text-right">
          Section
        </Label>
        <SelectDialog
          items={sections.map(sec => ({ id: sec.id, name: sec.name }))}
          selectedItem={selectedSection ? { id: selectedSection.id, name: selectedSection.name } : null}
          onSelectItem={(item: { id: string; name: string; color?: string } | null) => setSelectedSection(sections.find(sec => sec.id === item?.id) || null)}
          createItem={createSection}
          updateItem={updateSection}
          deleteItem={deleteSection}
          placeholder="Select section"
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="notes" className="text-right">
          Notes
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="recurring-type" className="text-right">
          Recurring
        </Label>
        <Select
          value={recurringType}
          onValueChange={(value: RecurringType) => setRecurringType(value)}
        >
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select recurrence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button type="submit">Add Task</Button>
      </DialogFooter>
    </form>
  );
};

export default AddTaskForm;