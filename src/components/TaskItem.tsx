import React, { useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Trash2, Calendar, Clock, StickyNote, MoreHorizontal, Archive, BellRing, FolderOpen, Repeat, ListTodo, CheckCircle2, ArrowUp, ArrowDown, Link as LinkIcon, Undo2 } from 'lucide-react';
import * as dateFns from 'date-fns';
import { cn } from "@/lib/utils";
import { Task } from '@/hooks/useTasks';
import { useSound } from '@/context/SoundContext';
import { getCategoryColorProps } from '@/lib/categoryColors';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
// import { Badge } from "@/components/ui/badge"; // Removed Badge import

interface TaskItemProps {
  task: Task;
  userId: string | null;
  onStatusChange: (taskId: string, newStatus: Task['status']) => Promise<void>;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  isSelected: boolean;
  onToggleSelect: (taskId: string, checked: boolean) => void;
  sections: { id: string; name: string }[];
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  onMoveUp: (taskId: string) => Promise<void>;
  onMoveDown: (taskId: string) => Promise<void>;
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
  onOpenOverview,
  currentDate,
  onMoveUp,
  onMoveDown,
}) => {
  const { playSound } = useSound();
  const [showCompletionEffect, setShowCompletionEffect] = useState(false);

  const getPriorityColorClass = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-[#F44336]'; // Red
      case 'high': return 'bg-[#F44336]'; // Red
      case 'medium': return 'bg-[#FFCA28]'; // Yellow
      case 'low': return 'bg-[#4CAF50]'; // Green
      default: return 'bg-gray-500'; // Default gray
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
  const isDueToday = task.due_date && task.status !== 'completed' && dateFns.isSameDay(dateFns.parseISO(task.due_date) as Date, currentRefDate as Date);

  const categoryColorProps = getCategoryColorProps(task.category_color);

  const handleCheckboxChange = (checked: boolean) => {
    onToggleSelect(task.id, checked);
    onStatusChange(task.id, checked ? 'completed' : 'to-do');
    if (checked) {
      playSound('success');
      setShowCompletionEffect(true);
      setTimeout(() => {
        setShowCompletionEffect(false);
      }, 600);
    }
  };

  const handleMoveUpClick = () => {
    onMoveUp(task.id);
    playSound('success');
  };

  const handleMoveDownClick = () => {
    onMoveDown(task.id);
    playSound('success');
  };

  return (
    <div
      className={cn(
        "relative flex items-center w-full py-[10px] px-0 border-b border-[#E0E0E0] group", // 10px padding, 1px border-bottom
        task.status === 'completed' ? "opacity-70 bg-green-50/20 dark:bg-green-900/20" : "",
        isOverdue ? "border-l-4 border-border-status-overdue bg-red-50/10 dark:bg-red-900/10" : // Thicker border
        isDueToday ? "border-l-4 border-border-status-due-today bg-yellow-50/10 dark:bg-yellow-900/10" : // Thicker border
        "border-l-4 border-transparent",
        "hover:shadow-sm transition-shadow duration-200" // Added subtle shadow on hover
      )}
      onContextMenu={(e) => e.preventDefault()} // Disable long press
    >
      <Checkbox
        key={`${task.id}-${task.status}`}
        checked={task.status === 'completed'}
        onCheckedChange={handleCheckboxChange}
        id={`task-${task.id}`}
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0 h-[20px] w-[20px] mr-[5px] ml-[5px]" // 20px checkbox, 5px right margin, 5px left margin
        data-no-dnd="true"
        aria-checked={task.status === 'completed'} // Add aria-checked
      />

      <div 
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onOpenOverview(task)}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "text-[12px] font-normal leading-[1.2] line-clamp-2", // 12px font, 1.2 line-height
                task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground',
                "block"
              )}
            >
              {task.description}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {task.description}
          </TooltipContent>
        </Tooltip>

        <div className="flex flex-wrap items-center text-[10px] text-muted-foreground mt-1 gap-x-2 gap-y-0.5"> {/* 10px font, increased spacing */}
          <div className={cn("w-[4px] h-[4px] rounded-full", getPriorityColorClass(task.priority))} /> {/* 4px priority dot */}
          {task.recurring_type !== 'none' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center">
                  <Repeat className="h-[20px] w-[20px] text-primary dark:text-primary" /> {/* 20px icon */}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Recurring: {task.recurring_type.charAt(0).toUpperCase() + task.recurring_type.slice(1)}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {task.due_date && (
            <span className={cn(
              "flex items-center gap-1 text-[10px]", // 10px font
              isOverdue && "text-status-overdue font-semibold",
              isDueToday && "text-status-due-today font-semibold"
            )}>
              <Calendar className="h-[20px] w-[20px]" /> {/* 20px icon */}
              {getDueDateDisplay(task.due_date)}
            </span>
          )}
          {task.remind_at && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center text-primary dark:text-primary">
                  <BellRing className="h-[20px] w-[20px]" /> {/* 20px icon */}
                  <span className="sr-only">Reminder</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {dateFns.isValid(dateFns.parseISO(task.remind_at)) ? dateFns.format(dateFns.parseISO(task.remind_at), 'MMM d, yyyy HH:mm') : 'Invalid Date'}
              </TooltipContent>
            </Tooltip>
          )}
          {task.notes && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center">
                  <StickyNote className="h-[20px] w-[20px]" /> {/* 20px icon */}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Notes:</p>
                <p className="text-[10px]">{task.notes}</p> {/* 10px font */}
              </TooltipContent>
            </Tooltip>
          )}
          {task.link && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a 
                  href={task.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-1 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500"
                  onClick={(e) => e.stopPropagation()}
                  data-no-dnd="true"
                >
                  <LinkIcon className="h-[20px] w-[20px]" /> {/* 20px icon */}
                </a>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Link:</p>
                <p className="text-[10px] truncate">{task.link}</p> {/* 10px font */}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {showCompletionEffect && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <CheckCircle2 className="h-14 w-14 text-primary animate-fade-in-out-check" /> {/* Larger icon */}
        </div>
      )}

      <div className="flex-shrink-0 flex items-center space-x-[5px]" data-no-dnd="true"> {/* 5px spacing */}
        {/* Removed Badge for status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-[20px] w-[20px] p-0" // 20px button
              onClick={(e) => e.stopPropagation()}
              aria-label="More options"
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-[20px] w-[20px]" /> {/* 20px icon */}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" data-no-dnd="true">
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onOpenOverview(task); }}>
              <Edit className="mr-2 h-[20px] w-[20px]" /> View Details {/* 20px icon */}
            </DropdownMenuItem>
            {task.status === 'archived' && (
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onStatusChange(task.id, 'to-do'); playSound('success'); }}>
                <Undo2 className="mr-2 h-[20px] w-[20px]" /> Restore {/* 20px icon */}
              </DropdownMenuItem>
            )}
            {task.status !== 'archived' && (
              <>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onStatusChange(task.id, 'to-do'); playSound('success'); }}>
                  Mark as To-Do
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onStatusChange(task.id, 'completed'); playSound('success'); }}>
                  Mark as Completed
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onStatusChange(task.id, 'skipped'); playSound('success'); }}>
                  Mark as Skipped
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onStatusChange(task.id, 'archived'); playSound('success'); }}>
                  <Archive className="mr-2 h-[20px] w-[20px]" /> Archive {/* 20px icon */}
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger onSelect={(e) => e.preventDefault()} data-no-dnd="true">
                <FolderOpen className="mr-2 h-[20px] w-[20px]" /> Move to Section {/* 20px icon */}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent data-no-dnd="true">
                {sections.length === 0 ? (
                  <DropdownMenuItem disabled>No sections available</DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem 
                      onSelect={(e) => { 
                        e.preventDefault(); 
                        onUpdate(task.id, { section_id: null }); 
                        playSound('success');
                      }}
                      disabled={task.section_id === null}
                    >
                      No Section
                    </DropdownMenuItem>
                    {sections.map(section => (
                      <DropdownMenuItem 
                        key={section.id} 
                        onSelect={(e) => { 
                          e.preventDefault(); 
                          onUpdate(task.id, { section_id: section.id }); 
                          playSound('success');
                        }}
                        disabled={task.section_id === section.id}
                      >
                        {section.name}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleMoveUpClick(); }}>
              <ArrowUp className="mr-2 h-[20px] w-[20px]" /> Move Up {/* 20px icon */}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleMoveDownClick(); }}>
              <ArrowDown className="mr-2 h-[20px] w-[20px]" /> Move Down {/* 20px icon */}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onDelete(task.id); playSound('alert'); }} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-[20px] w-[20px]" /> Delete {/* 20px icon */}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TaskItem;