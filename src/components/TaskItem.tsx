import React, { useState } from 'react';
import { Task, TaskCategory } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, Trash2, Edit, Flag, XCircle, Focus } from 'lucide-react'; // Removed Calendar
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TaskItemProps {
  task: Task;
  categories: TaskCategory[];
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string) => Promise<void>;
  onToggleFocusMode: (taskId: string, isFocused: boolean) => Promise<void>;
  onLogDoTodayOff: (taskId: string) => Promise<void>;
  isFocusedTask: boolean;
  subtasks: Task[];
  renderSubtasks: (parentTaskId: string) => React.ReactNode;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, task: Task) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  categories,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
  isFocusedTask,
  subtasks,
  renderSubtasks,
  isDragging,
  onDragStart,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(task.description || ''); // Handle null description
  const [showNewSubtaskInput, setShowNewSubtaskInput] = useState(false);
  const [newSubtaskDescription, setNewSubtaskDescription] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleUpdateDescription = async () => {
    if (editedDescription.trim() && editedDescription !== task.description) {
      await onUpdateTask(task.id, { description: editedDescription });
    }
    setIsEditing(false);
  };

  const handleAddSubtask = async () => {
    if (newSubtaskDescription.trim()) {
      await onAddSubtask(newSubtaskDescription, task.id);
      setNewSubtaskDescription('');
      setShowNewSubtaskInput(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => { // Made synchronous
    if (date) {
      onUpdateTask(task.id, { due_date: date.toISOString() });
    } else {
      onUpdateTask(task.id, { due_date: null });
    }
    setShowDatePicker(false);
  };

  const getPriorityColor = (priority: string | null) => { // Allow null priority
    switch (priority) {
      case 'urgent': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getCategoryColor = (categoryId: string | null) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? `bg-${category.color}-100 text-${category.color}-800` : 'bg-gray-100 text-gray-800';
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2 rounded-md p-3 transition-all duration-200",
        task.status === 'completed' ? 'bg-green-50/50' : 'bg-white hover:bg-gray-50',
        isDragging ? 'opacity-50 border-2 border-blue-500' : 'border border-gray-200'
      )}
      draggable
      onDragStart={(e) => onDragStart(e, task)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-grow">
          <Checkbox
            checked={task.status === 'completed'}
            onCheckedChange={(checked) =>
              onUpdateTask(task.id, { status: checked ? 'completed' : 'to-do' })
            }
            className="h-5 w-5"
          />
          {isEditing ? (
            <Input
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onBlur={handleUpdateDescription}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateDescription();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              autoFocus
              className="flex-grow"
            />
          ) : (
            <span
              className={cn(
                "text-sm font-medium flex-grow cursor-pointer",
                task.status === 'completed' && 'line-through text-gray-500'
              )}
              onClick={() => setIsEditing(true)}
            >
              {task.description}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {task.due_date && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              {format(new Date(task.due_date), 'MMM dd')}
            </span>
          )}
          {task.priority && task.priority !== 'none' && (
            <span className={cn("text-xs font-semibold", getPriorityColor(task.priority))}>
              <Flag className="h-3 w-3 inline-block mr-1" />
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
          )}
          {task.category && (
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getCategoryColor(task.category))}>
              {categories.find(cat => cat.id === task.category)?.name || 'Category'}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowNewSubtaskInput(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Subtask
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleFocusMode(task.id, !isFocusedTask)}>
                <Focus className="mr-2 h-4 w-4" /> {isFocusedTask ? 'Unfocus' : 'Focus'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLogDoTodayOff(task.id)}>
                <XCircle className="mr-2 h-4 w-4" /> Do Today Off
              </DropdownMenuItem>
              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <CalendarIcon className="mr-2 h-4 w-4" /> Set Due Date
                  </DropdownMenuItem>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={task.due_date ? new Date(task.due_date) : undefined}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                  {task.due_date && (
                    <div className="p-2">
                      <Button variant="outline" className="w-full" onClick={() => handleDateSelect(undefined)}>
                        Clear Due Date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <DropdownMenuItem>
                <Select
                  value={task.priority || 'none'}
                  onValueChange={(value) => onUpdateTask(task.id, { priority: value as Task['priority'] })}
                >
                  <SelectTrigger className="w-full h-8 border-none shadow-none focus:ring-0">
                    <Flag className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Set Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Select
                  value={task.category || ''}
                  onValueChange={(value) => onUpdateTask(task.id, { category: value || null })}
                >
                  <SelectTrigger className="w-full h-8 border-none shadow-none focus:ring-0">
                    <span className="mr-2 h-4 w-4 flex items-center justify-center">
                      <div className={cn("w-2 h-2 rounded-full", task.category ? getCategoryColor(task.category).split(' ')[0].replace('bg-', 'bg-') : 'bg-gray-400')} />
                    </span>
                    <SelectValue placeholder="Set Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center">
                          <div className={cn("w-2 h-2 rounded-full mr-2", `bg-${cat.color}-500`)} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDeleteTask(task.id)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showNewSubtaskInput && (
        <div className="flex gap-2 mt-2 pl-6">
          <Input
            placeholder="New subtask description"
            value={newSubtaskDescription}
            onChange={(e) => setNewSubtaskDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddSubtask();
              if (e.key === 'Escape') setShowNewSubtaskInput(false);
            }}
            autoFocus
          />
          <Button onClick={handleAddSubtask}>Add</Button>
          <Button variant="outline" onClick={() => setShowNewSubtaskInput(false)}>Cancel</Button>
        </div>
      )}

      {subtasks.length > 0 && (
        <div className="ml-6 mt-2 space-y-2">
          {renderSubtasks(task.id)}
        </div>
      )}
    </div>
  );
};

export default TaskItem;