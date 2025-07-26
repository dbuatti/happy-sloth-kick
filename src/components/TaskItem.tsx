import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; // Import AlertDialog components
import { Edit, Trash2, Calendar, Clock, StickyNote, MoreHorizontal, Archive, BellRing, FolderOpen } from 'lucide-react';
import { format, parseISO, isToday, isAfter, isPast } from 'date-fns';
import { cn } from "@/lib/utils";
import { Task } from '@/hooks/useTasks';

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

  return (
    <div
      className={cn(
        "relative flex items-center space-x-3 w-full",
        task.status === 'completed' ? "opacity-70 bg-green-50/20 dark:bg-green-900/20 animate-task-completed" : "",
      )}
    >
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

        <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-3">
          <span className={cn(
            "font-semibold",
            getPriorityColor(task.priority)
          )}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
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
          {task.remind_at && (
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <BellRing className="h-3 w-3" />
              {format(parseISO(task.remind_at), 'MMM d, HH:mm')}
            </span>
          )}
          {task.notes && (
            <span className="flex items-center gap-1">
              <StickyNote className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>

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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your task: "{task.description}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(task.id)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TaskItem;