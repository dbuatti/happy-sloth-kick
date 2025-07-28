import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Trash2, Calendar, Clock, StickyNote, MoreHorizontal, Archive, BellRing, FolderOpen } from 'lucide-react';
import { format, parseISO, isToday, isAfter, isPast } from 'date-fns';
import { cn } from "@/lib/utils";
import { Task } from '@/hooks/useTasks';
import { useSound } from '@/context/SoundContext'; // Import useSound

interface TaskItemProps {
  task: Task;
  userId: string | null;
  onStatusChange: (taskId: string, newStatus: Task['status']) => Promise<void>;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  isSelected: boolean;
  onToggleSelect: (taskId: string, checked: boolean) => void;
  sections: { id: string; name: string }[];
  onEditTask: (task: Task) => void;
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
  onEditTask,
}) => {
  // Add this console log to inspect the task prop
  console.log(`TaskItem: Rendering task - ID: ${task.id}, Description: "${task.description}", Status: "${task.status}", Created At: "${task.created_at}"`);

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

  const isOverdue = task.due_date && task.status !== 'completed' && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
  const isUpcoming = task.due_date && task.status !== 'completed' && isToday(parseISO(task.due_date));

  const { playSound } = useSound(); // Get the playSound function

  return (
    <div
      className={cn(
        "relative flex items-center space-x-4 w-full",
        task.status === 'completed' ? "opacity-70 bg-green-50/20 dark:bg-green-900/20" : "",
      )}
    >
      {/* Checkbox */}
      <Checkbox
        checked={task.status === 'completed'}
        onCheckedChange={(checked) => {
          if (typeof checked === 'boolean') {
            onToggleSelect(task.id, checked);
            onStatusChange(task.id, checked ? 'completed' : 'to-do');
            playSound(); // Play sound on status change
          }
        }}
        id={`task-${task.id}`}
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0"
        data-no-dnd="true" // Add this attribute to prevent drag on checkbox
      />

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <label
          htmlFor={`task-${task.id}`}
          className={cn(
            "text-base font-medium leading-tight",
            task.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-foreground',
            isOverdue && "text-red-600 dark:text-red-400",
            isUpcoming && "text-orange-500 dark:text-orange-300",
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
              isOverdue && "text-red-600 dark:text-red-400",
              isUpcoming && "text-orange-500 dark:text-orange-300"
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
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8" 
          onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
          data-no-dnd="true" // Add this attribute
        >
          <Edit className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-8 w-8 p-0" 
              onClick={(e) => e.stopPropagation()}
              data-no-dnd="true" // Add this attribute
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'to-do'); playSound(); }}>
              Mark as To-Do
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'completed'); playSound(); }}>
              Mark as Completed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'skipped'); playSound(); }}>
              Mark as Skipped
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'archived'); playSound(); }}>
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
                        playSound();
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
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(task.id); playSound(); }} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TaskItem;