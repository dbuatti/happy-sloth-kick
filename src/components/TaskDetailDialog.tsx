import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, BellRing, Trash2 } from 'lucide-react';
import { format, parseISO, setHours, setMinutes } from 'date-fns';
import { cn } from "@/lib/utils";
import CategorySelector from "./CategorySelector";
import PrioritySelector from "./PrioritySelector";
import SectionSelector from "./SectionSelector";
import { Task } from '@/hooks/useTasks'; // Import Task interface
import { useTasks } from '@/hooks/useTasks'; // Import useTasks to get sections

interface TaskDetailDialogProps {
  task: Task | null;
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => void;
}

const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  task,
  userId,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const { sections } = useTasks(); // Get sections from useTasks
  const [editingDescription, setEditingDescription] = useState('');
  const [editingNotes, setEditingNotes] = useState('');
  const [editingDueDate, setEditingDueDate] = useState<Date | undefined>(undefined);
  const [editingCategory, setEditingCategory] = useState('');
  const [editingPriority, setEditingPriority] = useState('');
  const [editingRemindAt, setEditingRemindAt] = useState<Date | undefined>(undefined);
  const [reminderTime, setReminderTime] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setEditingDescription(task.description);
      setEditingNotes(task.notes || '');
      setEditingDueDate(task.due_date ? parseISO(task.due_date) : undefined);
      setEditingCategory(task.category);
      setEditingPriority(task.priority);
      setEditingRemindAt(task.remind_at ? parseISO(task.remind_at) : undefined);
      setReminderTime(task.remind_at ? format(parseISO(task.remind_at), 'HH:mm') : '');
      setEditingSectionId(task.section_id);
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;

    let finalRemindAt = editingRemindAt;
    if (finalRemindAt && reminderTime) {
      const [hours, minutes] = reminderTime.split(':').map(Number);
      finalRemindAt = setMinutes(setHours(finalRemindAt, hours), minutes);
    } else if (finalRemindAt && !reminderTime) {
      finalRemindAt = undefined;
    }

    setIsSaving(true);
    await onUpdate(task.id, {
      description: editingDescription,
      notes: editingNotes || null,
      due_date: editingDueDate ? editingDueDate.toISOString() : null,
      category: editingCategory,
      priority: editingPriority,
      remind_at: finalRemindAt ? finalRemindAt.toISOString() : null,
      section_id: editingSectionId,
    });
    setIsSaving(false);
    onClose();
  };

  const handleDelete = () => {
    if (task && window.confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
      onClose();
    }
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Task Description</Label>
            <Input
              id="description"
              value={editingDescription}
              onChange={(e) => setEditingDescription(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CategorySelector value={editingCategory} onChange={setEditingCategory} userId={userId} />
            <PrioritySelector value={editingPriority} onChange={setEditingPriority} />
          </div>

          <div className="space-y-2">
            <SectionSelector value={editingSectionId} onChange={setEditingSectionId} userId={userId} sections={sections} />
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !editingDueDate && "text-muted-foreground"
                  )}
                  disabled={isSaving}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {editingDueDate ? format(editingDueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={editingDueDate}
                  onSelect={setEditingDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Reminder</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !editingRemindAt && "text-muted-foreground"
                    )}
                    disabled={isSaving}
                  >
                    <BellRing className="mr-2 h-4 w-4" />
                    {editingRemindAt ? format(editingRemindAt, "PPP") : <span>Set reminder date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={editingRemindAt}
                    onSelect={setEditingRemindAt}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-24"
                disabled={isSaving || !editingRemindAt}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={editingNotes}
              onChange={(e) => setEditingNotes(e.target.value)}
              rows={3}
              disabled={isSaving}
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 pt-4">
          <Button variant="destructive" onClick={handleDelete} disabled={isSaving} className="w-full sm:w-auto mt-2 sm:mt-0">
            <Trash2 className="mr-2 h-4 w-4" /> Delete Task
          </Button>
          <div className="flex space-x-2 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} disabled={isSaving} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;