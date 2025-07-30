import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, BellRing, Trash2, Plus, CheckCircle2, Target, XCircle } from 'lucide-react'; // Added Target and XCircle icons
import { format, parseISO, setHours, setMinutes } from 'date-fns';
import { cn } from "@/lib/utils";
import CategorySelector from "./CategorySelector";
import PrioritySelector from "./PrioritySelector";
import SectionSelector from "./SectionSelector";
import { Task } from '@/hooks/useTasks';
import { useTasks } from '@/hooks/useTasks';
import AddTaskForm from './AddTaskForm';
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TaskDetailDialogProps {
  task: Task | null;
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => void;
  currentDate: Date; // New prop
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>; // New prop
  onSetAsFocusTask: (taskId: string) => void; // New prop
  onClearManualFocus: () => void; // New prop
  onOpenFocusOverlay: () => void; // New prop
}

const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  task,
  userId,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  currentDate,
  setCurrentDate,
  onSetAsFocusTask, // Destructure new prop
  onClearManualFocus, // Destructure new prop
  onOpenFocusOverlay, // Destructure new prop
}) => {
  const { sections, tasks: allTasks, handleAddTask, updateTask, allCategories } = useTasks({ currentDate, setCurrentDate });
  const [editingDescription, setEditingDescription] = useState('');
  const [editingNotes, setEditingNotes] = useState('');
  const [editingDueDate, setEditingDueDate] = useState<Date | undefined>(undefined);
  const [editingCategory, setEditingCategory] = useState(''); // This is the category ID
  const [editingPriority, setEditingPriority] = useState('');
  const [editingRemindAt, setEditingRemindAt] = useState<Date | undefined>(undefined);
  const [reminderTime, setReminderTime] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddSubtaskOpen, setIsAddSubtaskOpen] = useState(false);

  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);


  useEffect(() => {
    if (task) {
      setEditingDescription(task.description);
      setEditingNotes(task.notes || '');
      setEditingDueDate(task.due_date ? parseISO(task.due_date) : undefined);
      setEditingCategory(task.category); // Set category ID
      setEditingPriority(task.priority);
      setEditingRemindAt(task.remind_at ? parseISO(task.remind_at) : undefined);
      setReminderTime(task.remind_at ? format(parseISO(task.remind_at), 'HH:mm') : '');
      setEditingSectionId(task.section_id);
    }
  }, [task]);

  const subtasks = allTasks.filter(t => t.parent_task_id === task?.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

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
      category: editingCategory, // Pass the category ID
      priority: editingPriority,
      remind_at: finalRemindAt ? finalRemindAt.toISOString() : null,
      section_id: editingSectionId,
    });
    setIsSaving(false);
    onClose();
  };

  const handleDeleteClick = () => {
    setShowConfirmDeleteDialog(true);
  };

  const confirmDeleteTask = () => {
    if (task) {
      onDelete(task.id);
      setShowConfirmDeleteDialog(false);
      onClose();
    }
  };

  const handleAddSubtask = async (subtaskData: any) => {
    if (!task || !userId) return false;
    const success = await handleAddTask({
      ...subtaskData,
      parent_task_id: task.id,
      section_id: task.section_id,
    });
    if (success) {
      setIsAddSubtaskOpen(false);
    }
    return success;
  };

  const handleSubtaskStatusChange = async (subtaskId: string, newStatus: Task['status']) => {
    await updateTask(subtaskId, { status: newStatus });
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-3">
          <div className="space-y-2">
            <Label htmlFor="description">Task Description</Label>
            <Input
              id="description"
              value={editingDescription}
              onChange={(e) => setEditingDescription(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CategorySelector value={editingCategory} onChange={setEditingCategory} userId={userId} categories={allCategories} />
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
              rows={2}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2 mt-4 border-t pt-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Sub-tasks ({subtasks.length})</h3>
              <Dialog open={isAddSubtaskOpen} onOpenChange={setIsAddSubtaskOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Add Sub-task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Sub-task for "{task.description}"</DialogTitle>
                  </DialogHeader>
                  <AddTaskForm
                    onAddTask={handleAddSubtask}
                    userId={userId}
                    onTaskAdded={() => setIsAddSubtaskOpen(false)}
                    sections={sections} // Pass sections prop
                    allCategories={allCategories} // Pass allCategories prop
                    autoFocus={true} // Auto-focus for subtask form
                  />
                </DialogContent>
              </Dialog>
            </div>
            {subtasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sub-tasks yet. Break down this task into smaller steps!</p>
            ) : (
              <ul className="space-y-2">
                {subtasks.map(subtask => (
                  <li key={subtask.id} className="flex items-center space-x-2 p-2 border rounded-md bg-background">
                    <Checkbox
                      checked={subtask.status === 'completed'}
                      onCheckedChange={(checked) => {
                        if (typeof checked === 'boolean') {
                          handleSubtaskStatusChange(subtask.id, checked ? 'completed' : 'to-do');
                        }
                      }}
                      id={`subtask-${subtask.id}`}
                      className="flex-shrink-0 h-3.5 w-3.5"
                    />
                    <label
                      htmlFor={`subtask-${subtask.id}`}
                      className={cn(
                        "flex-1 text-sm font-medium leading-tight",
                        subtask.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-foreground',
                        "block truncate"
                      )}
                    >
                      {subtask.description}
                    </label>
                    {subtask.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 pt-3">
          <Button variant="destructive" onClick={handleDeleteClick} disabled={isSaving} className="w-full sm:w-auto mt-2 sm:mt-0">
            <Trash2 className="mr-2 h-4 w-4" /> Delete Task
          </Button>
          <div className="flex space-x-2 w-full sm:w-auto">
            {task.id === localStorage.getItem('manualFocusTaskId') ? (
              <Button variant="outline" onClick={() => { onClearManualFocus(); onClose(); }} disabled={isSaving} className="flex-1">
                <XCircle className="mr-2 h-4 w-4" /> Unset Focus
              </Button>
            ) : (
              <Button variant="outline" onClick={() => { onSetAsFocusTask(task.id); onOpenFocusOverlay(); onClose(); }} disabled={isSaving} className="flex-1">
                <Target className="mr-2 h-4 w-4" /> Set as Focus
              </Button>
            )}
            <Button variant="outline" onClick={onClose} disabled={isSaving} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={showConfirmDeleteDialog} onOpenChange={setShowConfirmDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this task and all its sub-tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} disabled={isSaving}>
              {isSaving ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default TaskDetailDialog;