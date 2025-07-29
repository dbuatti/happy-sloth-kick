import React, { useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Trash2, Calendar, Clock, StickyNote, MoreHorizontal, Archive, BellRing, FolderOpen, Repeat, ListTodo, CheckCircle2, ArrowUp, ArrowDown } from 'lucide-react'; // Added ArrowUp, ArrowDown
import * as dateFns from 'date-fns';
import { cn } from "@/lib/utils";
import { Task } from '@/hooks/useTasks';
import { useSound } from '@/context/SoundContext';
import { getCategoryColorProps } from '@/lib/categoryColors';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  currentDate: Date;
  onMoveUp: (taskId: string) => Promise<void>; // New prop
  onMoveDown: (taskId: string) => Promise<void>; // New prop
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
  currentDate,
  onMoveUp, // Destructure new prop
  onMoveDown, // Destructure new prop
}) => {
  console.log(`TaskItem: Rendering task - ID: ${task.id}, Description: "${task.description}", Status: "${task.status}", Created At: "${task.created_at}"`);
  console.log(`TaskItem: Task ID: ${task.id}, Category ID: "${task.category}", Category Color Key: "${task.category_color}", Section ID: ${task.section_id}, Parent Task ID: ${task.parent_task_id}, Order: ${task.order}`); // Added more logs

  const { playSound } = useSound();
  const [showCompletionEffect, setShowCompletionEffect] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-700 dark:text-red-400';
      case 'high': return 'text-red-500 dark:text-red-300';
      case 'medium': return 'text-yellow-500 dark:text-yellow-300';
      case 'low': return 'text-blue-500 dark:text-blue-300';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  const currentRefDate = new Date(currentDate);

  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null;
    
    const date = dateFns.parseISO(dueDate);
    if (dateFns.isSameDay(date as Date, currentRefDate as Date)) {
      return 'Today';
    } else if (dateFns.isAfter(date as Date, currentRefDate as Date)) {
      return `Due ${dateFns.format(date, 'MMM d')}`;
    } else {
      return `Overdue ${dateFns.format(date, 'MMM d')}`;
    }
  };

  const isOverdue = task.due_date && task.status !== 'completed' && dateFns.isBefore(dateFns.parseISO(task.due_date) as Date, currentRefDate as Date) && !dateFns.isSameDay(dateFns.parseISO(task.due_date) as Date, currentRefDate as Date);
  const isUpcoming = task.due_date && task.status !== 'completed' && dateFns.isSameDay(dateFns.parseISO(task.due_date) as Date, currentRefDate as Date);

  const categoryColorProps = getCategoryColorProps(task.category_color);

  const handleCheckboxChange = (checked: boolean) => {
    onToggleSelect(task.id, checked);
    onStatusChange(task.id, checked ? 'completed' : 'to-do');
    if (checked) {
      playSound();
      setShowCompletionEffect(true);
      setTimeout(() => {
        setShowCompletionEffect(false);
      }, 600);
    }
  };

  const handleMoveUpClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`TaskItem: Attempting to move UP task ${task.id} (Order: ${task.order}, Section: ${task.section_id})`); // Added log
    onMoveUp(task.id);
    playSound();
  };

  const handleMoveDownClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`TaskItem: Attempting to move DOWN task ${task.id} (Order: ${task.order}, Section: ${task.section_id})`); // Added log
    onMoveDown(task.id);
    playSound();
  };

  return (
    <div
      className={cn(
        "relative flex items-center space-x-3 w-full",
        task.status === 'completed' ? "opacity-70 bg-green-50/20 dark:bg-green-900/20" : "",
      )}
    >
      <Checkbox
        key={`${task.id}-${task.status}`}
        checked={task.status === 'completed'}
        onCheckedChange={handleCheckboxChange}
        id={`task-${task.id}`}
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0 h-3.5 w-3.5" // Reduced size from h-4 w-4 to h-3.5 w-3.5
        data-no-dnd="true" // Add this attribute
      />

      <div className="flex-1 min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <label
              htmlFor={`task-${task.id}`}
              className={cn(
                "text-base font-medium leading-tight line-clamp-2",
                task.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-foreground',
                isOverdue && "text-red-600 dark:text-red-400",
                isUpcoming && "text-orange-500 dark:text-orange-300",
                "block"
              )}
            >
              {task.description}
            </label>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {task.description}
          </TooltipContent>
        </Tooltip>

        <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-1">
          <div className={cn("w-3 h-3 rounded-full flex items-center justify-center border", categoryColorProps.backgroundClass, categoryColorProps.dotBorder)}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categoryColorProps.dotColor }}></div>
          </div>
          <span className={cn(
            "font-semibold",
            getPriorityColor(task.priority)
          )}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
          {task.recurring_type !== 'none' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Repeat className="h-3 w-3 text-blue-500 dark:text-blue-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Recurring: {task.recurring_type.charAt(0).toUpperCase() + task.recurring_type.slice(1)}</p>
              </TooltipContent>
            </Tooltip>
          )}
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
              {dateFns.format(dateFns.parseISO(task.remind_at), 'MMM d, HH:mm')}
            </span>
          )}
          {task.notes && (
            <span className="flex items-center gap-1">
              <StickyNote className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>

      {showCompletionEffect && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <CheckCircle2 className="h-12 w-12 text-green-500 animate-fade-in-out-check" />
        </div>
      )}

      <div className="flex-shrink-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {task.status === 'completed' && (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-2 text-xs"
            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'to-do'); playSound(); }}
            data-no-dnd="true" // Add this attribute
          >
            <ListTodo className="h-3 w-3 mr-1" /> To-Do
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
          data-no-dnd="true" // Add this attribute
        >
          <Edit className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-7 w-7 p-0"
              onClick={(e) => e.stopPropagation()}
              data-no-dnd="true" // Add this attribute
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" data-no-dnd="true"> {/* Add this attribute to content as well */}
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
              <DropdownMenuSubTrigger data-no-dnd="true"> {/* Add this attribute */}
                <FolderOpen className="mr-2 h-4 w-4" /> Move to Section
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent data-no-dnd="true"> {/* Add this attribute */}
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
            <DropdownMenuItem onClick={handleMoveUpClick}>
              <ArrowUp className="mr-2 h-4 w-4" /> Move Up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleMoveDownClick}>
              <ArrowDown className="mr-2 h-4 w-4" /> Move Down
            </DropdownMenuItem>
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