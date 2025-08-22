import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { Task, TaskSection, TaskCategory, RecurringType, TaskPriority } from '@/types/task';
import { format, parseISO } from 'date-fns';
import DatePicker from '@/components/ui/date-picker';
import SelectDialog from '@/components/SelectDialog';
import { getCategoryColorProps } from '@/utils/categoryColors';
import { TaskDetailDialogProps } from '@/types/props';

export const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  isOpen,
  onClose,
  task,
  allTasks,
  sections,
  categories,
  onUpdate,
  onDelete,
  // Removed unused: onAddTask, onReorderTasks,
  createSection,
  updateSection,
  deleteSection,
  // Removed unused: updateSectionIncludeInFocusMode,
  createCategory,
  updateCategory,
  deleteCategory,
}) => {
  const [editedDescription, setEditedDescription] = useState(task?.description || '');
  const [editedNotes, setEditedNotes] = useState(task?.notes || '');
  const [editedDueDate, setEditedDueDate] = useState<Date | undefined>(
    task?.due_date ? parseISO(task.due_date) : undefined
  );
  const [editedPriority, setEditedPriority] = useState<TaskPriority>(task?.priority || null);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(
    task?.category ? categories.find((cat) => cat.id === task.category) || null : null
  );
  const [selectedSection, setSelectedSection] = useState<TaskSection | null>(
    task?.section_id ? sections.find((sec) => sec.id === task.section_id) || null : null
  );
  const [editedRecurringType, setEditedRecurringType] = useState<RecurringType>(task?.recurring_type || 'none');
  const [editedLink, setEditedLink] = useState(task?.link || '');
  const [editedImageUrl, setEditedImageUrl] = useState(task?.image_url || '');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setEditedDescription(task.description || '');
      setEditedNotes(task.notes || '');
      setEditedDueDate(task.due_date ? parseISO(task.due_date) : undefined);
      setEditedPriority(task.priority);
      setSelectedCategory(categories.find((cat) => cat.id === task.category) || null);
      setSelectedSection(sections.find((sec) => sec.id === task.section_id) || null);
      setEditedRecurringType(task.recurring_type || 'none');
      setEditedLink(task.link || '');
      setEditedImageUrl(task.image_url || '');
    }
  }, [task, categories, sections]);

  const handleSave = async () => {
    if (!task || !editedDescription.trim()) return;

    const updates: Partial<Task> = {
      description: editedDescription.trim(),
      notes: editedNotes,
      due_date: editedDueDate ? format(editedDueDate, 'yyyy-MM-dd') : null,
      priority: editedPriority,
      category: selectedCategory?.id || null,
      section_id: selectedSection?.id || null,
      recurring_type: editedRecurringType,
      link: editedLink,
      image_url: editedImageUrl,
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

  // const subtasks = allTasks.filter((subtask) => subtask.parent_task_id === task?.id); // Unused

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
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="notes" className="text-right">
              Notes
            </label>
            <Textarea
              id="notes"
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)} // Fixed setNotes to setEditedNotes
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="due-date" className="text-right">
              Due Date
            </label>
            <div className="col-span-3">
              <DatePicker
                date={editedDueDate}
                setDate={setEditedDueDate}
                placeholder="Select due date"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="priority" className="text-right">
              Priority
            </label>
            <Select
              value={editedPriority || ''}
              onValueChange={(value: string) => setEditedPriority(value === 'null' ? null : value as TaskPriority)} // Fixed type
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
              items={categories.map(cat => ({
                id: cat.id,
                name: cat.name,
                color: cat.color,
              }))}
              selectedItem={selectedCategory ? { id: selectedCategory.id, name: selectedCategory.name, color: selectedCategory.color } : null}
              onSelectItem={(item) => setSelectedCategory(categories.find(cat => cat.id === item?.id) || null)} // Fixed type
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
              onSelectItem={(item) => setSelectedSection(sections.find(sec => sec.id === item?.id) || null)} // Fixed type
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
              value={editedRecurringType}
              onValueChange={(value: RecurringType) => setEditedRecurringType(value)}
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
            <Input id="link" value={editedLink} onChange={(e) => setEditedLink(e.target.value)} className="col-span-3" placeholder="Optional link" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="image-url" className="text-right">
              Image URL
            </label>
            <Input id="image-url" value={editedImageUrl} onChange={(e) => setEditedImageUrl(e.target.value)} className="col-span-3" placeholder="Optional image URL" />
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