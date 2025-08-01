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
// Removed Badge import as it's no longer used for priority/status

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

  const getPriorityDotColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-priority-urgent';
      case 'high': return 'bg-priority-high';
      case 'medium': return 'bg-priority-medium';
      case 'low': return 'bg-priority-low';
      default: return 'bg-gray-500'; // Default to gray if unknown
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
        "relative flex items-start space-x-3 w-full py-2 px-2 group", // Removed rounded-lg, border-l-4, and bg-green-50/20
        task.status === 'completed' ? "opacity-70" : "",
        "hover:shadow-sm transition-shadow duration-200" // Added subtle shadow on hover
      )}
      style={{ paddingLeft: '4px', paddingRight: '4px' }} // Apply 4px gutter
    >
      <Checkbox
        key={`${task.id}-${task.status}`}
        checked={task.status === 'completed'}
        onCheckedChange={handleCheckboxChange}
        id={`task-${task.id}`}
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0 h-5 w-5 mt-0.5" // Larger checkbox
        data-no-dnd="true"
        aria-label={`Mark task "${task.description}" as ${task.status === 'completed' ? 'to-do' : 'completed'}`}
      />

      <div 
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onOpenOverview(task)}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "text-sm font-normal leading-tight line-clamp-2", // Changed to 12px font-size, 1.2 line-height
                task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground',
                "block"
              )}
              style={{ fontSize: '12px', lineHeight: '1.2' }}
            >
              {task.description}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {task.description}
          </TooltipContent>
        </Tooltip>

        <div className="flex flex-wrap items-center text-xs text-muted-foreground mt-1 gap-x-2 gap-y-0.5"> {/* Increased spacing */}
          {/* Priority Dot */}
          <div className={cn("w-1 h-1 rounded-full", getPriorityDotColor(task.priority))} />
          
          {task.recurring_type !== 'none' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center">
                  <Repeat className="h-4 w-4 text-primary dark:text-primary" /> {/* Larger icon */}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Recurring: {task.recurring_type.charAt(0).toUpperCase() + task.recurring_type.slice(1)}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {task.due_date && (
            <span className={cn(
              "flex items-center gap-1 text-sm", // Larger text
              isOverdue && "text-status-overdue font-semibold",
              isDueToday && "text-status-due-today font-semibold"
            )}>
              <Calendar className="h-4 w-4" /> {/* Larger icon */}
              {getDueDateDisplay(task.due_date)}
            </span>
          )}
          {task.remind_at && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center text-primary dark:text-primary">
                  <BellRing className="h-4 w-4" /> {/* Larger icon */}
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
                  <StickyNote className="h-4 w-4" /> {/* Larger icon */}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Notes:</p>
                <p className="text-sm">{task.notes}</p>
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
                  <LinkIcon className="h-4 w-4" /> {/* Larger icon */}
                </a>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Link:</p>
                <p className="text-sm truncate">{task.link}</p>
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

      <div className="flex-shrink-0 flex items-center space-x-1" data-no-dnd="true">
        {/* Removed Status Badge */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-8 w-8 p-0" // Larger button
              onClick={(e) => e.stopPropagation()}
              aria-label="More options"
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4.5 w-4.5" /> {/* Larger icon */}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" data-no-dnd="true">
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onOpenOverview(task); }}>
              <Edit className="mr-2 h-4 w-4" /> View Details
            </DropdownMenuItem>
            {task.status === 'archived' && (
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onStatusChange(task.id, 'to-do'); playSound('success'); }}>
                <Undo2 className="mr-2 h-4 w-4" /> Restore
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
                  <Archive className="mr-2 h-4 w-4" /> Archive
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger onSelect={(e) => e.preventDefault()} data-no-dnd="true">
                <FolderOpen className="mr-2 h-4 w-4" /> Move to Section
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
              <ArrowUp className="mr-2 h-4 w-4" /> Move Up
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleMoveDownClick(); }}>
              <ArrowDown className="mr-2 h-4 w-4" /> Move Down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onDelete(task.id); playSound('alert'); }} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TaskItem;