import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu"; // Added DropdownMenuSub imports
import { Edit, Trash2, Calendar, Clock, StickyNote, MoreHorizontal, Archive, BellRing, FolderOpen } from 'lucide-react'; // Added FolderOpen
import { format, parseISO, isToday, isAfter, isPast } from 'date-fns';
import { cn } from "@/lib/utils";
import { Task } from '@/hooks/useTasks'; // Import Task interface

interface TaskItemProps {
  task: Task;
  userId: string | null;
  onStatusChange: (taskId: string, newStatus: Task['status']) => Promise<void>;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  isSelected: boolean;
  onToggleSelect: (taskId: string, checked: boolean) => void;
  sections: { id: string; name: string }[]; // Still needed for context, but not directly used in this component's UI
  onEditTask: (task: Task) => void; // New prop to open edit dialog
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  userId,
  onStatusChange,
  onDelete,
  onUpdate,
  isSelected,
  onToggleSelect,
  sections, // Keep for type consistency, but not used in display
  onEditTask,
}) => {
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

  // isOverdue and isUpcoming calculations are now handled in SortableTaskItem
  const isOverdue = task.due_date && task.status !== 'completed' && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
  const isUpcoming = task.due_date && task.status !== 'completed' && isToday(parseISO(task.due_date));

  return (
    <div // Changed from li to div
      className={cn(
        "relative flex items-center space-x-3 w-full", // Added w-full to ensure it takes full width
        task.status === 'completed' ? "opacity-70 bg-green-50/20 dark:bg-green-900/20 animate-task-completed" : "", // Keep opacity for completed
        // isOverdue and isUpcoming border styling removed from here, now in SortableTaskItem
      )}
    >
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
        <label
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
        </label>

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
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEditTask(task); }}>
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
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderOpen className="mr-2 h-4 w-4" /> Move to Section
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {sections.length === 0 ? (
                  <DropdownMenuItem disabled>No sections available</DropdownMenuItem>
                ) : (
                  sections.map(section => (
                    <DropdownMenuItem 
                      key={section.id} 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onUpdate(task.id, { section_id: section.id }); 
                      }}
                      disabled={task.section_id === section.id}
                    >
                      {section.name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TaskItem;