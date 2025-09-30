"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, Trash2, MoreHorizontal, Archive, FolderOpen, Undo2, Repeat, Link as LinkIcon, Calendar as CalendarIcon, Target, ClipboardCopy, CalendarClock, ChevronRight, GripVertical, FileText, Image, PlusCircle } from 'lucide-react'; // Added PlusCircle
import { format, parseISO, isSameDay, isPast, isValid } from 'date-fns';
import { cn } from "@/lib/utils";
import { Task } from '@/hooks/useTasks';
import { useSound } from '@/context/SoundContext';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import DoTodaySwitch from '@/components/DoTodaySwitch';
import { showSuccess, showError } from '@/utils/toast';
import { Appointment } from '@/hooks/useAppointments';


export interface TaskItemProps {
  task: Task;
  allTasks: Task[];
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  sections: { id: string; name: string }[];
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  level: number;
  isOverlay?: boolean;
  hasSubtasks?: boolean;
  isExpanded?: boolean;
  toggleExpand?: (taskId: string) => void;
  setFocusTask: (taskId: string | null) => Promise<void>;
  isDoToday: boolean;
  toggleDoToday: (task: Task) => void;
  scheduledAppointment?: Appointment;
  isDemo?: boolean;
  showDragHandle?: boolean;
  attributes?: React.HTMLAttributes<HTMLButtonElement>;
  listeners?: React.HTMLAttributes<HTMLButtonElement>;
  isSelected: boolean;
  onSelectTask: (taskId: string, isSelected: boolean) => void;
  onAddSubtask: (parentTaskId: string | null, sectionId: string | null) => void; // New prop
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  allTasks,
  onDelete,
  onUpdate,
  sections,
  onOpenOverview,
  currentDate,
  isOverlay = false,
  hasSubtasks = false,
  isExpanded = true,
  toggleExpand,
  setFocusTask,
  isDoToday,
  toggleDoToday,
  scheduledAppointment,
  isDemo = false,
  showDragHandle = false,
  attributes,
  listeners,
  isSelected,
  onSelectTask,
  onAddSubtask, // Destructure new prop
}) => {
  const { playSound } = useSound();
  const [showCompletionEffect, setShowCompletionEffect] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.description || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const originalTask = useMemo(() => {
    if (!task.original_task_id) return null;
    return allTasks.find(t => t.id === task.original_task_id);
  }, [allTasks, task.original_task_id]);

  const recurringType = originalTask ? originalTask.recurring_type : task?.recurring_type;

  const directSubtasksCount = useMemo(() => {
    return allTasks.filter(t => t.parent_task_id === task.id).length;
  }, [allTasks, task.id]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditText(task.description || '');
  }, [task.description]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOverlay || isDemo) return;
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (editText.trim() && editText.trim() !== (task.description || '')) {
      await onUpdate(task.id, { description: editText.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(task.description || '');
    setIsEditing(false);
  };

  const handleInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      await handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const getPriorityDotColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-priority-urgent';
      case 'high': return 'bg-priority-high';
      case 'medium': return 'bg-priority-medium';
      case 'low': return 'bg-priority-low';
      default: return 'bg-gray-500';
    }
  };

  const handleCheckboxChange = async (checked: boolean) => {
    if (isOverlay || isDemo) return;
    await onUpdate(task.id, { status: checked ? 'completed' : 'to-do' });
    if (checked) {
      playSound('success');
      setShowCompletionEffect(true);
      setTimeout(() => {
        setShowCompletionEffect(false);
      }, 600);
    }
  };

  const handleSelectionChange = (checked: boolean) => {
    if (isOverlay || isDemo) return;
    onSelectTask(task.id, checked);
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

  const isUrl = (path: string) => path.startsWith('http://') || path.startsWith('https://');

  const handleCopyPath = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(path);
      showSuccess('Path copied to clipboard!');
    } catch (err) {
      showError('Could not copy path.');
    }
  };

  const handleToggleDoTodaySwitch = () => {
    toggleDoToday(task);
  };

  const isOverdue = task.due_date && task.status === 'to-do' && isPast(parseISO(task.due_date)) && !isSameDay(parseISO(task.due_date), currentDate);
  const isDueToday = task.due_date && task.status === 'to-do' && isSameDay(parseISO(task.due_date), currentDate);

  return (
    <div
      className={cn(
        "relative flex items-center w-full rounded-xl transition-all duration-300 py-1.5 pl-4 pr-3 shadow-sm border", // Reduced py from 2 to 1.5
        task.status === 'completed'
          ? "text-task-completed-text bg-task-completed-bg border-task-completed-text/20"
          : "bg-card text-foreground border-border",
        isOverdue && "bg-red-500/10 border-red-500/30", // Stronger overdue styling
        isDueToday && !isOverdue && "bg-yellow-500/10 border-yellow-500/30", // Distinct due today styling
        !isDoToday && "opacity-60",
        isSelected && "ring-2 ring-primary ring-offset-2",
        "group",
        !isOverlay && "hover:shadow-md hover:scale-[1.005] cursor-pointer"
      )}
    >
      {/* Priority Pill */}
      <div className={cn(
        "absolute left-0 top-0 h-full w-1.5 rounded-l-xl",
        getPriorityDotColor(task.priority)
      )} />

      {showDragHandle && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground cursor-grab -ml-1 mr-1"
          onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
          {...listeners}
          {...attributes}
          aria-label="Drag to reorder task"
        >
          <GripVertical className="h-4 w-4" />
        </Button>
      )}

      <div className="flex-shrink-0 pr-2 flex items-center" onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}>
        {hasSubtasks && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              toggleExpand?.(task.id);
            }}
            aria-label={isExpanded ? 'Collapse sub-tasks' : 'Expand sub-tasks'}
          >
            <ChevronRight className={cn(
              "h-4 w-4 transition-transform duration-200",
              isExpanded ? "rotate-90" : "rotate-0"
            )} />
            {directSubtasksCount > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">{directSubtasksCount}</span>
            )}
          </Button>
        )}
      </div>

      {/* Selection Checkbox */}
      <div className="flex-shrink-0 mr-3" onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleSelectionChange}
          id={`select-task-${task.id}`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="flex-shrink-0 h-4 w-4 checkbox-root border-2"
          aria-label={`Select task "${task.description}"`}
          disabled={isOverlay || isDemo}
        />
      </div>

      {/* Completion Checkbox Area */}
      <div className="flex-shrink-0 mr-3" onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}>
        <Checkbox
          key={`${task.id}-${task.status}`}
          checked={task.status === 'completed'}
          onCheckedChange={handleCheckboxChange}
          id={`task-${task.id}`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="flex-shrink-0 h-4 w-4 checkbox-root rounded-full border-2"
          aria-label={`Mark task "${task.description}" as ${task.status === 'completed' ? 'to-do' : 'completed'}`}
          disabled={isOverlay || isDemo}
        />
      </div>

      {/* Clickable Content Area */}
      <div
        className="flex-grow flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 min-w-0 py-1"
        onClick={() => !isOverlay && !isEditing && onOpenOverview(task)}
      >
        <div className="flex-grow min-w-0 w-full">
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editText || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditText(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleInputKeyDown}
              className="h-auto text-base leading-tight p-0 border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full font-medium"
              onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
            />
          ) : (
            <>
              <span
                className={cn(
                  "block text-base leading-tight font-medium",
                  task.status === 'completed' ? 'line-through opacity-75' : '',
                  "cursor-text"
                )}
                onClick={handleStartEdit}
              >
                {task.description}
              </span>
              {scheduledAppointment && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <CalendarClock className="h-3 w-3" />
                  <span>
                    Scheduled: {format(parseISO(scheduledAppointment.date), 'dd/MM')} {format(parseISO(`1970-01-01T${scheduledAppointment.start_time}`), 'h:mm a')}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center gap-2 mt-1 sm:mt-0" onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}>
          {task.link && (
            isUrl(task.link) ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={task.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center flex-shrink-0 text-muted-foreground hover:text-primary text-xs"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <LinkIcon className="h-3.5 w-3.5 mr-1" />
                    <span className="truncate max-w-[100px]">{task.link}</span>
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open link: {task.link}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-primary"
                    onClick={(e: React.MouseEvent) => handleCopyPath(e, task.link!)}
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy path: {task.link}</p>
                </TooltipContent>
              </Tooltip>
            )
          )}

          {task.notes && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center flex-shrink-0 text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Has notes</p>
              </TooltipContent>
            </Tooltip>
          )}

          {task.image_url && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center flex-shrink-0 text-muted-foreground">
                  <Image className="h-3.5 w-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Has image</p>
              </TooltipContent>
            </Tooltip>
          )}

          {task.due_date && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn(
                  "inline-flex items-center flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full",
                  "text-foreground bg-muted",
                  isOverdue && "text-red-700 bg-red-200 dark:text-red-200 dark:bg-red-700", // More prominent overdue
                  isDueToday && !isOverdue && "text-yellow-700 bg-yellow-200 dark:text-yellow-200 dark:bg-yellow-700" // More prominent due today
                )}>
                  <CalendarIcon className="h-3 w-3 mr-1" /> {getDueDateDisplay(task.due_date)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Due: {format(parseISO(task.due_date), 'MMM d, yyyy')}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Actions Area */}
      <div className="flex-shrink-0 flex items-center gap-1 ml-2" onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}>
        {recurringType !== 'none' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-7 w-7 flex items-center justify-center" aria-label="Recurring task">
                <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Recurring: {recurringType.charAt(0).toUpperCase() + recurringType.slice(1)}</p>
            </TooltipContent>
          </Tooltip>
        )}
        <DoTodaySwitch
          isOn={isDoToday}
          onToggle={handleToggleDoTodaySwitch}
          taskId={task.id}
          isDemo={isDemo}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-7 w-7 p-0"
              aria-label="More options"
              disabled={isOverlay || isDemo}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={() => onOpenOverview(task)}>
              <Edit className="mr-2 h-4 w-4" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAddSubtask(task.id, task.section_id)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Subtask
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setFocusTask(task.id)}>
              <Target className="mr-2 h-4 w-4" /> Set as Focus
            </DropdownMenuItem>
            {task.status === 'archived' && (
              <DropdownMenuItem onSelect={async () => { await onUpdate(task.id, { status: 'to-do' }); showSuccess('Task restored!'); }}>
                <Undo2 className="mr-2 h-4 w-4" /> Restore
              </DropdownMenuItem>
            )}
            {task.status !== 'archived' && (
              <>
                <DropdownMenuItem onSelect={async () => { await onUpdate(task.id, { status: 'to-do' }); showSuccess('Task marked as to-do!'); }}>
                  Mark as To-Do
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={async () => { await onUpdate(task.id, { status: 'completed' }); showSuccess('Task marked as completed!'); }}>
                  Mark as Completed
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={async () => { await onUpdate(task.id, { status: 'skipped' }); showSuccess('Task marked as skipped!'); }}>
                  Mark as Skipped
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={async () => { await onUpdate(task.id, { status: 'archived' }); showSuccess('Task archived!'); }}>
                  <Archive className="mr-2 h-4 w-4" /> Archive
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger onSelect={(e: React.SyntheticEvent) => e.preventDefault()}>
                <FolderOpen className="mr-2 h-4 w-4" /> Move to Section
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {sections.length === 0 ? (
                  <DropdownMenuItem disabled>No sections available</DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem
                      onSelect={async () => {
                        await onUpdate(task.id, { section_id: null });
                        showSuccess('Task moved to "No Section"!');
                      }}
                      disabled={task.section_id === null}
                    >
                      No Section
                    </DropdownMenuItem>
                    {sections.map(section => (
                      <DropdownMenuItem
                        key={section.id}
                        onSelect={async () => {
                          await onUpdate(task.id, { section_id: section.id });
                          showSuccess(`Task moved to "${section.name}"!`);
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
            <DropdownMenuItem onSelect={() => { onDelete(task.id); showError('Task deleted!'); }} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showCompletionEffect && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <CheckCircle2 className="h-16 w-16 text-primary animate-task-complete" />
        </div>
      )}
    </div>
  );
};

export default TaskItem;