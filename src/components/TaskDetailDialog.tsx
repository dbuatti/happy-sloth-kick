import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import DatePicker from '@/components/ui/date-picker';
import SelectDialog from '@/components/SelectDialog';
import { Task, TaskSection, TaskCategory, RecurringType, TaskPriority } from '@/types/task';
import { format, parseISO } from 'date-fns';
import { showError } from '@/utils/toast';
import { TaskDetailDialogProps } from '@/types/props';

export const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  isOpen,
  onClose,
  task,
  allTasks,
  sections,
  allCategories, // Renamed from categories to allCategories for consistency
  onUpdate,
  onDelete,
  onAddTask,
  onReorderTasks,
  onStatusChange,
  createSection,
  updateSection,
  deleteSection,
  updateSectionIncludeInFocusMode, // Added missing prop
  createCategory,
  updateCategory,
  deleteCategory,
}) => {
  const [description, setDescription] = useState(task?.description || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task?.due_date ? parseISO(task.due_date) : undefined
  );
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || null);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(
    task?.category ? allCategories.find((cat: TaskCategory) => cat.id === task.category) || null : null
  );
  const [selectedSection, setSelectedSection] = useState<TaskSection | null>(
    task?.section_id ? sections.find((sec: TaskSection) => sec.id === task.section_id) || null : null
  );
  const [recurringType, setRecurringType] = useState<RecurringType>(task?.recurring_type || 'none');
  const [link, setLink] = useState(task?.link || '');
  const [imageUrl, setImageUrl] = useState(task?.image_url || '');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setDescription(task.description || '');
      setNotes(task.notes || '');
      setDueDate(task.due_date ? parseISO(task.due_date) : undefined);
      setPriority(task.priority);
      setSelectedCategory(allCategories.find((cat: TaskCategory) => cat.id === task.category) || null);
      setSelectedSection(sections.find((sec: TaskSection) => sec.id === task.section_id) || null);
      setRecurringType(task.recurring_type || 'none');
      setLink(task.link || '');
      setImageUrl(task.image_url || '');
    }
  }, [task, allCategories, sections]);

  const handleSave = async () => {
    if (!task || !description.trim()) return;

    const updates: Partial<Task> = {
      description: description.trim(),
      notes: notes,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      priority: priority,
      category: selectedCategory?.id || null,
      section_id: selectedSection?.id || null,
      recurring_type: recurringType,
      link: link,
      image_url: imageUrl,
    };
    await onUpdate(task.id, updates);
    onClose();
  };

  const handleDelete = async () => {
    if (!task) return;
    await onDelete(task.id);
    setIsConfirmDeleteOpen(false);
    onClose();
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="description" className="text-right">
              Description
            </label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="notes" className="text-right">
              Notes
            </label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="due-date" className="text-right">
              Due Date
            </label>
            <div className="col-span-3">
              <DatePicker
                date={dueDate}
                setDate={setDueDate}
                placeholder="Select due date"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="priority" className="text-right">
              Priority
            </label>
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
            <label htmlFor="category" className="text-right">
              Category
            </label>
            <SelectDialog
              items={allCategories.map(cat => ({
                id: cat.id,
                name: cat.name,
                color: cat.color,
              }))}
              selectedItem={selectedCategory ? { id: selectedCategory.id, name: selectedCategory.name, color: selectedCategory.color } : null}
              onSelectItem={(item) => setSelectedCategory(allCategories.find((cat: TaskCategory) => cat.id === item?.id) || null)}
              createItem={async (name: string, color?: string) => {
                const newCat = await createCategory(name, color || '#cccccc');
                return newCat ? { id: newCat.id, name: newCat.name, color: newCat.color } : null;
              }}
              updateItem={async (id: string, name: string, color?: string) => {
                const updatedCat = await updateCategory(id, name, color || '#cccccc');
                return updatedCat ? { id: updatedCat.id, name: updatedCat.name, color: updatedCat.color } : null;
              }}
              deleteItem={deleteCategory}
              placeholder="Select category"
              className="col-span-3"
              enableColorPicker
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="section" className="text-right">
              Section
            </label>
            <SelectDialog
              items={sections.map(sec => ({ id: sec.id, name: sec.name }))}
              selectedItem={selectedSection ? { id: selectedSection.id, name: selectedSection.name } : null}
              onSelectItem={(item) => setSelectedSection(sections.find((sec: TaskSection) => sec.id === item?.id) || null)}
              createItem={async (name: string) => {
                const newSec = await createSection(name);
                return newSec ? { id: newSec.id, name: newSec.name } : null;
              }}
              updateItem={async (id: string, name: string) => {
                const updatedSec = await updateSection(id, name);
                return updatedSec ? { id: updatedSec.id, name: updatedSec.name } : null;
              }}
              deleteItem={deleteSection}
              placeholder="Select section"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="recurring-type" className="text-right">
              Recurring
            </label>
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
            <label htmlFor="link" className="text-right">
              Link
            </label>
            <Input id="link" value={link} onChange={(e) => setLink(e.target.value)} className="col-span-3" placeholder="Optional link" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="image-url" className="text-right">
              Image URL
            </label>
            <Input id="image-url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="col-span-3" placeholder="Optional image URL" />
          </div>
        </div>
        <DialogFooter>
          {task && onDelete && (
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {task ? 'Save Changes' : 'Add Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};