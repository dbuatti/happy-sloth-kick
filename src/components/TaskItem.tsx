import React, { useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Trash2, MoreHorizontal, Archive, FolderOpen, ArrowUp, ArrowDown, Undo2, Repeat, Link as LinkIcon, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO, isSameDay, isPast, isValid } from 'date-fns';
import { cn } from "@/lib/utils";
import { Task } from '@/hooks/useTasks';
import { useSound } from '@/context/SoundContext';
import { getCategoryColorProps } from '@/lib/categoryColors';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2 } from 'lucide-react'; // Ensure CheckCircle2 is imported for the animation

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
  isOverlay?: boolean;
  dragListeners?: any;
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
  isOverlay = false,
  dragListeners,
}) => {
  const { playSound } = useSound();
  const [showCompletionEffect, setShowCompletionEffect] = useState(false);

  const getPriorityDotColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-priority-urgent';
      case 'high': return 'bg-priority-high';
      case 'medium': return 'bg-priority-medium';
      case 'low': return 'bg-priority-low';
      default: return 'bg-gray-500';
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (isOverlay) return;
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
    if (isOverlay) return;
    onMoveUp(task.id);
    playSound('success');
  };

  const handleMoveDownClick = () => {
    if (isOverlay) return;
    onMoveDown(task.id);
    playSound('success');
  };

  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    if (!isValid(date)) return null;

    if (isSameDay(date, currentDate)) {
      return 'Today';
    } else if (isPast(date) && !isSameDay(date, currentDate)) {
      return format(date, 'MMM d');
    } else {
      return format(date, 'MMM d');
    }
  };

  const isOverdue = task.due_date && task.status !== 'completed' && isPast(parseISO(task.due_date)) && !isSameDay(parseISO(task.due_date), currentDate);
  const isDueToday = task.due_date && task.status !== 'completed' && isSameDay(parseISO(task.due_date), currentDate);

  return (
    <div
      className={cn(
        "relative flex items-center space-x-2 w-full py-1.5 pr-2 pl-2", // Default padding-left
        task.status === 'completed' ? "text-muted-foreground bg-task-completed-bg" : "text-foreground",
        "group",
        isOverlay ? "cursor-grabbing" : "hover:shadow-sm",
        isOverdue && "border-l-4 border-status-overdue", // Only border, no extra padding
        isDueToday && "border-l-4 border-status-due-today", // Only border, no extra padding
      )}
      onClick={() => !isOverlay && onOpenOverview(task)}
      style={{ cursor: isOverlay ? 'grabbing' : 'pointer' }}
      {...(dragListeners || {})}
    >
      <Checkbox
        key={`${task.id}-${task.status}`}
        checked={task.status === 'completed'}
        onCheckedChange={handleCheckboxChange}
        id={`task-${task.id}`}
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0 h-4 w-4"
        data-no-dnd="true"
        aria-label={`Mark task "${task.description}" as ${task.status === 'completed' ? 'to-do' : 'completed'}`}
        disabled={isOverlay}
      />

      {/* Priority Dot */}
      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", getPriorityDotColor(task.priority))} />
      
      <span
        className={cn(
          "text-base leading-tight line-clamp-2 flex-grow",
          task.status === 'completed' ? 'line-through' : 'font-medium',
          "block"
        )}
      >
        {task.description}
      </span>

      {/* Icons on the right */}
      <div className="flex-shrink-0 flex items-center space-x-2">
        {task.recurring_type !== 'none' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center flex-shrink-0" data-no-dnd="true">
                <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Recurring: {task.recurring_type.charAt(0).toUpperCase() + task.recurring_type.slice(1)}</p>
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
                className="inline-flex items-center flex-shrink-0 text-muted-foreground hover:text-primary"
                onClick={(e) => e.stopPropagation()}
                data-no-dnd="true"
              >
                <LinkIcon className="h-3.5 w-3.5" />
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>{task.link}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {task.due_date && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn(
                "inline-flex items-center flex-shrink-0 text-xs font-medium px-1 py-0.5 rounded-sm",
                "text-muted-foreground",
                isOverdue && "text-status-overdue",
                isDueToday && "text-status-due-today"
              )} data-no-dnd="true">
                <CalendarIcon className="h-3 w-3 mr-1" /> {getDueDateDisplay(task.due_date)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Due: {format(parseISO(task.due_date), 'MMM d, yyyy')}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {showCompletionEffect && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <CheckCircle2 className="h-14 w-14 text-primary animate-fade-in-out-check" />
        </div>
      )}

      <div className="flex-shrink-0 flex items-center space-x-1" data-no-dnd="true">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={(e) => e.stopPropagation()}
              aria-label="More options"
              data-no-dnd="true"
              disabled={isOverlay}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" data-no-dnd="true">
            <DropdownMenuItem onSelect={(e) => {
              e.preventDefault();
              onOpenOverview(task);
            }}>
              <Edit className="mr-2 h-3.5 w-3.5" /> View Details
            </DropdownMenuItem>
            {task.status === 'archived' && (
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onStatusChange(task.id, 'to-do'); playSound('success'); }}>
                <Undo2 className="mr-2 h-3.5 w-3.5" /> Restore
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
                  <Archive className="mr-2 h-3.5 w-3.5" /> Archive
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger onSelect={(e) => e.preventDefault()} data-no-dnd="true">
                <FolderOpen className="mr-2 h-3.5 w-3.5" /> Move to Section
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
              <ArrowUp className="mr-2 h-3.5 w-3.5" /> Move Up
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleMoveDownClick(); }}>
              <ArrowDown className="mr-2 h-3.5 w-3.5" /> Move Down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onDelete(task.id); playSound('alert'); }} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TaskItem;