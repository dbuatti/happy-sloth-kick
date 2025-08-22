import React, { useState, useRef, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  ListTodo, // Import ListTodo
  Calendar,
  Tag,
  Edit,
  Trash2,
  Repeat,
  ArrowRight,
  XCircle,
  EyeOff,
  Clock,
  Link,
  Image,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Task,
  TaskSection,
  TaskCategory,
  TaskStatus,
  RecurringType,
  TaskPriority,
} from '@/types/task'; // Corrected import
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { getCategoryColorProps } from '@/utils/categoryColors';
import { useAuth } from '@/context/AuthContext';
import { Draggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Calendar as CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface TaskItemProps {
  task: Task;
  allTasks: Task[];
  sections: TaskSection[];
  categories: TaskCategory[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<Task | null>;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  onDelete: (taskId: string) => Promise<void>;
  onOpenOverview: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
  onAddTask: (taskData: Partial<Task>) => Promise<Task | null>;
  onReorderTasks: (
    updates: {
      id: string;
      order: number | null;
      section_id: string | null;
      parent_task_id: string | null;
    }[]
  ) => Promise<void>;
  showDoTodayToggle?: boolean;
  toggleDoToday?: (taskId: string, isOff: boolean) => Promise<void>;
  isDoTodayOff?: boolean;
  level?: number; // For subtasks indentation
  isDemo?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  allTasks,
  sections,
  categories,
  onStatusChange,
  onUpdate,
  onDelete,
  onOpenOverview,
  onOpenDetail,
  onAddTask,
  onReorderTasks,
  showDoTodayToggle = false,
  toggleDoToday,
  isDoTodayOff = false,
  level = 0,
  isDemo,
}) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(task.description || '');
  const [editedNotes, setEditedNotes] = useState(task.notes || '');
  const [editedDueDate, setEditedDueDate] = useState<Date | undefined>(
    task.due_date ? parseISO(task.due_date) : undefined
  );
  const [editedPriority, setEditedPriority] = useState<TaskPriority>(task.priority);
  const [editedCategory, setEditedCategory] = useState<TaskCategory | null>(
    categories.find((cat) => cat.id === task.category) || null
  );
  const [editedSection, setEditedSection] = useState<TaskSection | null>(
    sections.find((sec) => sec.id === task.section_id) || null
  );
  const [editedRecurringType, setEditedRecurringType] = useState<RecurringType>(task.recurring_type || 'none');
  const [editedLink, setEditedLink] = useState(task.link || '');
  const [editedImageUrl, setEditedImageUrl] = useState(task.image_url || '');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isAddSubtaskOpen, setIsAddSubtaskOpen] = useState(false);

  const subtasks = allTasks.filter((subtask) => subtask.parent_task_id === task.id);

  const categoryColorProps = editedCategory
    ? getCategoryColorProps(editedCategory.color)
    : null;

  const handleSaveEdit = async () => {
    if (!editedDescription.trim()) return;
    await onUpdate(task.id, {
      description: editedDescription.trim(),
      notes: editedNotes,
      due_date: editedDueDate ? format(editedDueDate, 'yyyy-MM-dd') : null,
      priority: editedPriority,
      category: editedCategory?.id || null,
      section_id: editedSection?.id || null,
      recurring_type: editedRecurringType,
      link: editedLink,
      image_url: editedImageUrl,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedDescription(task.description || '');
    setEditedNotes(task.notes || '');
    setEditedDueDate(task.due_date ? parseISO(task.due_date) : undefined);
    setEditedPriority(task.priority);
    setEditedCategory(categories.find((cat) => cat.id === task.category) || null);
    setEditedSection(sections.find((sec) => sec.id === task.section_id) || null);
    setEditedRecurringType(task.recurring_type || 'none');
    setEditedLink(task.link || '');
    setEditedImageUrl(task.image_url || '');
  };

  const getDueDateText = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date) && !isToday(date)) return 'Overdue';
    return format(date, 'MMM d');
  };

  const getPriorityClasses = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 border-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 border-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 border-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 border-green-600 bg-green-50';
      default:
        return 'text-gray-500 border-gray-500 bg-gray-50';
    }
  };

  const handleAddSubtask = async (subtaskData: Partial<Task>) => {
    if (!userId) return null;
    const newSubtask = await onAddTask({
      ...subtaskData,
      parent_task_id: task.id,
      section_id: task.section_id, // Inherit section from parent
    });
    if (newSubtask) {
      setIsAddSubtaskOpen(false);
    }
    return newSubtask;
  };

  const handleToggleDoToday = async () => {
    if (toggleDoToday) {
      await toggleDoToday(task.id, !isDoTodayOff);
    }
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({
    id: task.id,
    data: { type: 'Task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'relative flex items-start p-2 rounded-md transition-all duration-200 ease-in-out group',
          isDragging ? 'ring-2 ring-blue-500' : '',
          level > 0 ? `ml-${level * 4}` : '' // Indent subtasks
        )}
      >
        <div className="flex items-center flex-grow">
          <Checkbox
            id={`task-${task.id}`}
            checked={task.status === 'completed'}
            onCheckedChange={(checked) =>
              onStatusChange(task.id, checked ? 'completed' : 'to-do')
            }
            className="mr-2 mt-1"
          />
          {isEditing ? (
            <Input
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveEdit();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  handleCancelEdit();
                }
              }}
              className="flex-grow text-base"
            />
          ) : (
            <label
              htmlFor={`task-${task.id}`}
              className={cn(
                'flex-grow text-base font-medium leading-none peer-disabled:cursor-not-allowed',
                task.status === 'completed' ? 'line-through text-gray-500' : ''
              )}
              onDoubleClick={() => setIsEditing(true)}
            >
              {task.description}
            </label>
          )}
        </div>

        <div className="flex items-center space-x-2 ml-auto">
          {task.priority && (
            <Badge
              variant="outline"
              className={cn(
                'px-2 py-0.5 rounded-full text-xs border',
                getPriorityClasses(task.priority)
              )}
            >
              {task.priority}
            </Badge>
          )}
          {task.due_date && (
            <Badge
              variant="outline"
              className={cn(
                'px-2 py-0.5 rounded-full text-xs border',
                isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))
                  ? 'border-red-500 text-red-500 bg-red-50'
                  : 'border-gray-300 text-gray-600'
              )}
            >
              <span className="mr-1">🗓️</span> {getDueDateText(task.due_date)}
            </Badge>
          )}
          {categoryColorProps && (
            <Badge
              variant="outline"
              className={cn(
                'px-2 py-0.5 rounded-full text-xs border',
                categoryColorProps.dotBorder,
                categoryColorProps.dotColor,
                categoryColorProps.backgroundClass
              )}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full mr-1',
                  categoryColorProps.dotColor
                )}
                style={{ backgroundColor: categoryColorProps.bg }}
              />
              {editedCategory?.name}
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                {...listeners}
                {...attributes}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onOpenOverview(task)}>
                <ListTodo className="mr-2 h-4 w-4" /> Overview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenDetail(task)}>
                <Edit className="mr-2 h-4 w-4" /> Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsAddSubtaskOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Subtask
              </DropdownMenuItem>
              {showDoTodayToggle && toggleDoToday && (
                <DropdownMenuItem onClick={handleToggleDoToday}>
                  {isDoTodayOff ? (
                    <XCircle className="mr-2 h-4 w-4" />
                  ) : (
                    <EyeOff className="mr-2 h-4 w-4" />
                  )}{' '}
                  {isDoTodayOff ? 'Add to "Do Today"' : 'Remove from "Do Today"'}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsConfirmDeleteOpen(true)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {subtasks.length > 0 && (
        <div className="space-y-1 mt-1">
          {subtasks.map((subtask) => (
            <TaskItem
              key={subtask.id}
              task={subtask}
              allTasks={allTasks}
              sections={sections}
              categories={categories}
              onStatusChange={onStatusChange}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onOpenOverview={onOpenOverview}
              onOpenDetail={onOpenDetail}
              onAddTask={onAddTask}
              onReorderTasks={onReorderTasks}
              level={level + 1}
              isDemo={isDemo}
            />
          ))}
        </div>
      )}

      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this task?</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => {
              onDelete(task.id);
              setIsConfirmDeleteOpen(false);
            }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddSubtaskOpen} onOpenChange={setIsAddSubtaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subtask to "{task.description}"</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subtask-description" className="text-right">
                Description
              </Label>
              <Input
                id="subtask-description"
                value={editedDescription} // Reusing state for simplicity, but ideally separate for subtask form
                onChange={(e) => setEditedDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            {/* Add more fields for subtask if needed, e.g., due date, priority */}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddSubtaskOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleAddSubtask({ description: editedDescription })}>
              Add Subtask
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskItem;