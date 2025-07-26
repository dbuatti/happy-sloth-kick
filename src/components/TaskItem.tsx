import React, { useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Trash2, Calendar, Clock, StickyNote, MoreHorizontal, Archive, BellRing } from 'lucide-react'; // Added BellRing
import { format, parseISO, isToday, isAfter, isBefore, setHours, setMinutes } from 'date-fns'; // Added setHours, setMinutes
import { cn } from "@/lib/utils";
import CategorySelector from "./CategorySelector";
import PrioritySelector from "./PrioritySelector";

interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly'; // Updated type
  created_at: string;
  user_id: string;
  category: string;
  priority: string;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null; // New: for reminders
}

interface TaskItemProps {
  task: Task;
  userId: string | null;
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  isSelected: boolean;
  onToggleSelect: (taskId: string, checked: boolean) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  userId,
  onStatusChange,
  onDelete,
  onUpdate,
  isSelected,
  onToggleSelect,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingDescription, setEditingDescription] = useState(task.description);
  const [editingNotes, setEditingNotes] = useState(task.notes || '');
  const [editingDueDate, setEditingDueDate] = useState<Date | undefined>(task.due_date ? parseISO(task.due_date) : undefined);
  const [editingCategory, setEditingCategory] = useState(task.category);
  const [editingPriority, setEditingPriority] = useState(task.priority);
  const [editingRemindAt, setEditingRemindAt] = useState<Date | undefined>(task.remind_at ? parseISO(task.remind_at) : undefined); // New state for remind_at
  const [reminderTime, setReminderTime] = useState<string>(task.remind_at ? format(parseISO(task.remind_at), 'HH:mm') : '');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-700';
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null;
    
    const date = parseISO(dueDate);
    if (isToday(date)) {
      return 'Today';
    } else if (isAfter(date, new Date())) {
      return `Due ${format(date, 'MMM d')}`;
    } else {
      return `Overdue ${format(date, 'MMM d')}`;
    }
  };

  const getReminderDisplay = (remindAt: string | null) => {
    if (!remindAt) return null;
    const date = parseISO(remindAt);
    return `Reminder ${format(date, 'MMM d, HH:mm')}`;
  };

  const handleSaveEdit = async () => {
    let finalRemindAt = editingRemindAt;
    if (finalRemindAt && reminderTime) {
      const [hours, minutes] = reminderTime.split(':').map(Number);
      finalRemindAt = setMinutes(setHours(finalRemindAt, hours), minutes);
    } else if (finalRemindAt && !reminderTime) {
      // If date is selected but time is cleared, clear the reminder
      finalRemindAt = undefined;
    }

    await onUpdate(task.id, {
      description: editingDescription,
      notes: editingNotes || null,
      due_date: editingDueDate ? editingDueDate.toISOString() : null,
      category: editingCategory,
      priority: editingPriority,
      remind_at: finalRemindAt ? finalRemindAt.toISOString() : null, // Save remind_at
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingDescription(task.description);
    setEditingNotes(task.notes || '');
    setEditingDueDate(task.due_date ? parseISO(task.due_date) : undefined);
    setEditingCategory(task.category);
    setEditingPriority(task.priority);
    setEditingRemindAt(task.remind_at ? parseISO(task.remind_at) : undefined);
    setReminderTime(task.remind_at ? format(parseISO(task.remind_at), 'HH:mm') : '');
  };

  return (
    <li className="border rounded-md bg-white dark:bg-gray-800 p-4">
      {isEditing ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor={`edit-task-${task.id}`}>Task Description</Label>
            <Input
              id={`edit-task-${task.id}`}
              value={editingDescription}
              onChange={(e) => setEditingDescription(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CategorySelector value={editingCategory} onChange={setEditingCategory} userId={userId} />
            <PrioritySelector value={editingPriority} onChange={setEditingPriority} />
          </div>
          
          <div>
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !editingDueDate && "text-muted-foreground"
                  )}
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

          <div>
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
                disabled={!editingRemindAt}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor={`edit-notes-${task.id}`}>Notes</Label>
            <Textarea
              id={`edit-notes-${task.id}`}
              value={editingNotes}
              onChange={(e) => setEditingNotes(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <Checkbox
                checked={isSelected || task.status === 'completed'}
                onCheckedChange={(checked) => {
                  if (typeof checked === 'boolean') {
                    onToggleSelect(task.id, checked);
                    if (!checked) { // If unchecking, also revert status if it was completed
                      if (task.status === 'completed') {
                        onStatusChange(task.id, 'to-do');
                      }
                    }
                  }
                }}
                id={`task-${task.id}`}
              />
              <div className="flex-1">
                <Label
                  htmlFor={`task-${task.id}`}
                  className={`text-lg font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}
                >
                  {task.description}
                </Label>
                
                {task.notes && (
                  <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-300 flex items-center">
                    <StickyNote className="h-3 w-3 mr-1" />
                    {task.notes}
                  </div>
                )}
                
                {getDueDateDisplay(task.due_date) && (
                  <div className="mt-1 text-sm text-gray-500 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {getDueDateDisplay(task.due_date)}
                  </div>
                )}

                {getReminderDisplay(task.remind_at) && (
                  <div className="mt-1 text-sm text-blue-600 dark:text-blue-400 flex items-center">
                    <BellRing className="h-3 w-3 mr-1" />
                    {getReminderDisplay(task.remind_at)}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-medium px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(task.id, 'to-do')}>
                    Mark as To-Do
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(task.id, 'completed')}>
                    Mark as Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(task.id, 'skipped')}>
                    Mark as Skipped
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(task.id, 'archived')}>
                    <Archive className="mr-2 h-4 w-4" /> Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}
    </li>
  );
};

export default TaskItem;