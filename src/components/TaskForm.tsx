import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DatePicker from '@/components/ui/date-picker';
import SelectDialog from '@/components/SelectDialog';
import { Task, TaskSection, TaskCategory, TaskPriority, RecurringType } from '@/types/task';
import { format, parseISO } from 'date-fns';
import { showError } from '@/utils/toast';

interface TaskFormProps {
  initialData?: Partial<Task> | null;
  onSave: (data: Partial<Task>) => Promise<void>;
  onCancel: () => void;
  sections: TaskSection[];
  categories: TaskCategory[];
  createSection: (name: string) => Promise<TaskSection | null>;
  updateSection: (sectionId: string, newName: string) => Promise<TaskSection | null>;
  deleteSection: (sectionId: string) => Promise<void>;
  createCategory: (name: string, color: string) => Promise<TaskCategory | null>;
  updateCategory: (categoryId: string, newName: string, newColor: string) => Promise<TaskCategory | null>;
  deleteCategory: (categoryId: string) => Promise<void>;
}

const TaskForm: React.FC<TaskFormProps> = ({
  initialData,
  onSave,
  onCancel,
  sections,
  categories,
  createSection,
  updateSection,
  deleteSection,
  createCategory,
  updateCategory,
  deleteCategory,
}) => {
  const [description, setDescription] = useState(initialData?.description || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [dueDate, setDueDate] = useState<Date | undefined>(initialData?.due_date ? parseISO(initialData.due_date) : undefined);
  const [priority, setPriority] = useState<TaskPriority>(initialData?.priority || null);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(
    initialData?.category ? categories.find(cat => cat.id === initialData.category) || null : null
  );
  const [selectedSection, setSelectedSection] = useState<TaskSection | null>(
    initialData?.section_id ? sections.find(sec => sec.id === initialData.section_id) || null : null
  );
  const [recurringType, setRecurringType] = useState<RecurringType>(initialData?.recurring_type || 'none');
  const [link, setLink] = useState(initialData?.link || '');
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description || '');
      setNotes(initialData.notes || '');
      setDueDate(initialData.due_date ? parseISO(initialData.due_date) : undefined);
      setPriority(initialData.priority || null);
      setSelectedCategory(categories.find(cat => cat.id === initialData.category) || null);
      setSelectedSection(sections.find(sec => sec.id === initialData.section_id) || null);
      setRecurringType(initialData.recurring_type || 'none');
      setLink(initialData.link || '');
      setImageUrl(initialData.image_url || '');
    }
  }, [initialData, sections, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showError('Description is required.');
      return;
    }

    const data: Partial<Task> = {
      description: description.trim(),
      notes: notes.trim() || null,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      priority: priority,
      category: selectedCategory?.id || null,
      section_id: selectedSection?.id || null,
      recurring_type: recurringType,
      link: link.trim() || null,
      image_url: imageUrl.trim() || null,
    };

    await onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="description" className="text-right">Description</Label>
        <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" required />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="notes" className="text-right">Notes</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="due-date" className="text-right">Due Date</Label>
        <div className="col-span-3">
          <DatePicker date={dueDate} setDate={setDueDate} />
        </div>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="priority" className="text-right">Priority</Label>
        <Select
          value={priority || ''}
          onValueChange={(value: string) => setPriority(value === 'null' ? null : value as TaskPriority)}
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
        <Label htmlFor="category" className="text-right">Category</Label>
        <SelectDialog
          items={categories.map(cat => ({ id: cat.id, name: cat.name, color: cat.color }))}
          selectedItem={selectedCategory}
          onSelectItem={setSelectedCategory}
          createItem={createCategory}
          updateItem={updateCategory}
          deleteItem={deleteCategory}
          placeholder="Select category"
          className="col-span-3"
          enableColorPicker
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="section" className="text-right">Section</Label>
        <SelectDialog
          items={sections.map(sec => ({ id: sec.id, name: sec.name }))}
          selectedItem={selectedSection}
          onSelectItem={setSelectedSection}
          createItem={createSection}
          updateItem={updateSection}
          deleteItem={deleteSection}
          placeholder="Select section"
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="recurring-type" className="text-right">Recurring</Label>
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
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="link" className="text-right">Link</Label>
        <Input id="link" value={link} onChange={(e) => setLink(e.target.value)} className="col-span-3" placeholder="Optional link" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="image-url" className="text-right">Image URL</Label>
        <Input id="image-url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="col-span-3" placeholder="Optional image URL" />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
};

export default TaskForm;