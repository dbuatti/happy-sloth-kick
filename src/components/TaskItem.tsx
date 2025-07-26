import React, { useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Trash2, Calendar, Clock, StickyNote, MoreHorizontal, Archive, BellRing } from 'lucide-react';
import { format, parseISO, isToday, isAfter, setHours, setMinutes, isPast, addDays } from 'date-fns';
import { cn } from "@/lib/utils";
import CategorySelector from "./CategorySelector";
import PrioritySelector from "./PrioritySelector";
import SectionSelector from "./SectionSelector";

interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  created_at: string;
  user_id: string;
  category: string;
  priority: string;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
}

interface TaskItemProps {
  task: Task;
  userId: string | null;
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  isSelected: boolean;
  onToggleSelect: (taskId: string, checked: boolean) => void;
  sections: { id: string; name: string }[];
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  userId,
  onStatusChange,
  onDelete,
  onUpdate,
  isSelected,
  onToggleSelect,
  sections,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingDescription, setEditingDescription] = useState(task.description);
  const [editingNotes, setEditingNotes] = useState(task.notes || '');
  const [editingDueDate, setEditingDueDate] = useState<Date | undefined>(task.due_date ? parseISO(task.due_date) : undefined);
  const [editingCategory, setEditingCategory] = useState(task.category);
  const [editingPriority, setEditingPriority] = useState(task.priority);
  const [editingRemindAt, setEditingRemindAt] = useState<Date | undefined>(task.remind_at ? parseISO(task.remind_at) : undefined);
  const [reminderTime, setReminderTime] = useState<string>(task.remind_at ? format(parseISO(task.remind_at), 'HH:mm') : '');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(task.section_id);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-700 dark:text-red-400';
      case 'high': return 'text-red-500 dark:text-red-300';
      case 'medium': return 'text-yellow-500 dark:text-yellow-300';
      case 'low': return 'text-blue-500 dark:text-blue-300';
      default: return 'text-gray-500 dark:text-gray-400';
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

  const handleSaveEdit = async () => {
    let finalRemindAt = editingRemindAt;
    if (finalRemindAt && reminderTime) {
      const [hours, minutes] = reminderTime.split(':').map(Number);
      finalRemindAt = setMinutes(setHours(finalRemindAt, hours), minutes);
    } else if (finalRemindAt && !reminderTime) {
      finalRemindAt = undefined;
    }

    await onUpdate(task.id, {
      description: editingDescription,
      notes: editingNotes || null,
      due_date: editingDueDate ? editingDueDate.toISOString() : null,
      category: editingCategory,
      priority: editingPriority,
      remind_at: finalRemindAt ? finalRemindAt.toISOString() : null,
      section_id: editingSectionId,
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
    setEditingSectionId(task.section_id);
  };

  const isOverdue = task.due_date && task.status !== 'completed' && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
  const isUpcoming = task.due_date && task.status !== 'completed' && isToday(parseISO(task.due_date)); // Due today

  return (
    <div // Changed from li to div
      className={cn(
        "relative flex items-center space-x-3 w-full", // Added w-full to ensure it takes full width
        task.status === 'completed' ? "opacity-70 bg-green-50/20 dark:bg-green-900/20 animate-task-completed" : "", // Keep opacity for completed
        isOverdue && "border-l-4 border-red-500 dark:border-red-700 pl-2", // Overdue visual cue
        isUpcoming && "border-l-4 border-orange-400 dark:border-orange-600 pl-2" // Upcoming visual cue
      )}
    >
      {isEditing ? (
        <div className="space-y-4 w-full">
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
            <SectionSelector value={editingSectionId} onChange={setEditingSectionId} userId={userId} />
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
        <>
          {/* Checkbox */}
          <Checkbox
            checked={task.status === 'completed'}
            onCheckedChange={(checked) => {
              if (typeof checked === 'boolean') {
                onToggleSelect(task.id, checked);
                onStatusChange(task.id, checked ? 'completed' : 'to-do');
              }
            }}
            id={`task-${task.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0"
          />

          {/* Task Content */}
          <div className="flex-1 min-w-0">
            <Label
              htmlFor={`task-${task.id}`}
              className={cn(
                "text-base font-medium leading-tight",
                task.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-foreground',
                isOverdue && "text-red-600 dark:text-red-400", // Overdue text color
                isUpcoming && "text-orange-500 dark:text-orange-300", // Upcoming text color
                "block truncate"
              )}
            >
              {task.description}
            </Label>

            {/* Compact details row */}
            <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-3">
              {/* Priority */}
              <span className={cn(
                "font-semibold",
                getPriorityColor(task.priority)
              )}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </span>
              {/* Due Date */}
              {task.due_date && (
                <span className={cn(
                  "flex items-center gap-1",
                  isOverdue && "text-red-600 dark:text-red-400", // Overdue due date color
                  isUpcoming && "text-orange-500 dark:text-orange-300" // Upcoming due date color
                )}>
                  <Calendar className="h-3 w-3" />
                  {getDueDateDisplay(task.due_date)}
                </span>
              )}
              {/* Reminder */}
              {task.remind_at && (
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <BellRing className="h-3 w-3" />
                  {format(parseISO(task.remind_at), 'MMM d, HH:mm')}
                </span>
              )}
              {/* Notes (only show icon if notes exist) */}
              {task.notes && (
                <span className="flex items-center gap-1">
                  <StickyNote className="h-3 w-3" />
                </span>
              )}
            </div>
          </div>

          {/* Actions (Edit, More) - visible on hover */}
          <div className="flex-shrink-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
              <Edit className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-7 w-7 p-0" onClick={(e) => e.stopPropagation()}>
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'to-do'); }}>
                  Mark as To-Do
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'completed'); }}>
                  Mark as Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'skipped'); }}>
                  Mark as Skipped
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'archived'); }}>
                  <Archive className="mr-2 h-4 w-4" /> Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  );
};

export default TaskItem;