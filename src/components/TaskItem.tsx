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
import { Edit, Trash2, MoreHorizontal, Archive, FolderOpen, Undo2, Repeat, Link as LinkIcon, Calendar as CalendarIcon, Target, ClipboardCopy, CalendarClock, ChevronRight, GripVertical, CheckCircle2 } from 'lucide-react'; // Corrected CheckCircle2 import
import { format, parseISO, isSameDay, isPast, isValid } from 'date-fns';
import { cn } from "@/lib/utils";
import { Task } from '@/hooks/useTasks';
import { useSound } from '@/context/SoundContext';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from '@/components/ui/input';
import DoTodaySwitch from '@/components/DoTodaySwitch';
import { showSuccess, showError } from '@/utils/toast';
import { Appointment } from '@/hooks/useAppointments';


interface TaskItemProps {
  task: Task;
  allTasks: Task[];
  onStatusChange: (taskId: string, newStatus: Task['status']) => Promise<string | null>;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<string | null>;
  sections: { id: string; name: string }[];
  onOpenOverview: (task: Task) => void;
  currentDate: Date;
  onMoveUp: (taskId: string) => Promise<void>;
  onMoveDown: (taskId: string) => Promise<void>;
  level: number;
  isOverlay?: boolean;
  hasSubtasks?: boolean;
  isExpanded?: boolean;
  toggleTask?: (taskId: string) => void;
  setFocusTask: (taskId: string | null) => Promise<void>;
  isDoToday: boolean;
  toggleDoToday: (task: Task) => void;
  doTodayOffIds: Set<string>;
  scheduledTasksMap: Map<string, Appointment>;
  isDemo?: boolean;
  // Removed attributes and listeners from here
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  allTasks,
  onStatusChange,
  onDelete,
  onUpdate,
  sections,
  onOpenOverview,
  currentDate,
  isOverlay = false,
  hasSubtasks = false,
  isExpanded = true,
  toggleTask,
  setFocusTask,
  isDoToday,
  toggleDoToday,
  scheduledTasksMap,
  isDemo = false,
  // Removed attributes and listeners from here
}) => {
  const { playSound } = useSound();
  const [showCompletionEffect, setShowCompletionEffect] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.description || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const scheduledAppointment = useMemo(() => scheduledTasksMap.get(task.id), [scheduledTasksMap, task.id]);

  const originalTask = useMemo(() => {
    if (!task.original_task_id) return null;
    return allTasks.find(t => t.id === task.original_task_id);
  }, [allTasks, task.original_task_id]);

  const recurringType = originalTask ? originalTask.recurring_type : task?.recurring_type;

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
    await onStatusChange(task.id, checked ? 'completed' : 'to-do');
    if (checked) {
      playSound('success');
      setShowCompletionEffect(true);
      setTimeout(() => {
        setShowCompletionEffect(false);
      }, 600);
    }
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

  const isOverdue = task.due_date && task.status !== 'completed' && isPast(parseISO(task.due_date)) && !isSameDay(parseISO(task.due_date), currentDate);
  const isDueToday = task.due_date && task.status !== 'completed' && isSameDay(parseISO(task.due_date), currentDate);

  return (
    <div
      className={cn(
        "relative flex items-center w-full rounded-xl transition-all duration-300 py-2 pl-4 shadow-sm border", // Adjusted vertical padding and left padding
        task.status === 'completed' 
          ? "text-task-completed-text bg-task-completed-bg border-task-completed-text/20" 
          : "bg-card text-foreground border-border hover:shadow-md hover:scale-[1.005]", // Added hover scale and shadow
        !isDoToday && "opacity-60",
        "group"
      )}
    >
      {/* Priority Pill */}
      <div className={cn(
        "absolute left-0 top-0 h-full w-2 rounded-l-xl", // Increased width from w-1.5 to w-2
        getPriorityDotColor(task.priority)
      )} />

      {/* Drag Handle */}
      {!isOverlay && !task.parent_task_id && ( // Only show drag handle for top-level tasks
        <div className="flex-shrink-0 pr-2 -ml-3" onPointerDown={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-grab touch-none text-muted-foreground hover:bg-transparent">
            <GripVertical className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex-shrink-0 pr-3 flex items-center" onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}>
        {hasSubtasks && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              toggleTask?.(task.id);
            }}
            aria-label={isExpanded ? 'Collapse sub-tasks' : 'Expand sub-tasks'}
          >
            <ChevronRight className={cn(
              "h-5 w-5 transition-transform duration-200", 
              isExpanded ? "rotate-90" : "rotate-0"
            )} />
          </Button>
        )}
      </div>

      {/* Checkbox Area */}
      <div className="flex-shrink-0 pr-3" onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}>
        <Checkbox
          key={`${task.id}-${task.status}`}
          checked={task.status === 'completed'}
          onCheckedChange={handleCheckboxChange}
          id={`task-${task.id}`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="flex-shrink-0 h-5 w-5 checkbox-root rounded-full border-2"
          aria-label={`Mark task "${task.description}" as ${task.status === 'completed' ? 'to-do' : 'completed'}`}
          disabled={isOverlay || isDemo}
        />
      </div>

      {/* Clickable Content Area */}
      <div 
        className="flex-grow flex items-center space-x-3 min-w-0"
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
              className="h-auto text-base leading-tight p-0 border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full font-medium" // Adjusted text size
              onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
            />
          ) : (
            <>
              <span
                className={cn(
                  "block text-base leading-tight font-medium", // Changed to block, adjusted text size
                  task.status === 'completed' ? 'line-through opacity-75' : '',
                  "cursor-text"
                )}
                onClick={handleStartEdit}
              >
                {task.description}
              </span>
              {scheduledAppointment && (
                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1"> {/* Adjusted text size */}
                  <CalendarClock className="h-3 w-3" />
                  <span>
                    Scheduled: {format(parseISO(scheduledAppointment.date), 'dd/MM')} {format(parseISO(`1970-01-01T${scheduledAppointment.start_time}`), 'h:mm a')}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center space-x-2" onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}>
          {task.link && (
            isUrl(task.link) ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={task.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center flex-shrink-0 text-muted-foreground hover:text-primary"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <LinkIcon className="h-4 w-4" />
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
                    className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-primary"
                    onClick={(e: React.MouseEvent) => handleCopyPath(e, task.link!)}
                  >
                    <ClipboardCopy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy path: {task.link}</p>
                </TooltipContent>
              </Tooltip>
            )
          )}

          {task.due_date && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn(
                  "inline-flex items-center flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full",
                  "text-foreground bg-muted",
                  isOverdue && "text-status-overdue bg-status-overdue/10",
                  isDueToday && "text-status-due-today bg-status-due-today/10"
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
      <div className="flex-shrink-0 flex items-center gap-1 pr-3" onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}>
        {recurringType !== 'none' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-8 w-8 flex items-center justify-center" aria-label="Recurring task">
                <Repeat className="h-4 w-4 text-muted-foreground" />
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
              className="h-8 w-8 p-0"
              aria-label="More options"
              disabled={isOverlay || isDemo}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={() => onOpenOverview(task)}>
              <Edit className="mr-2 h-4 w-4" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setFocusTask(task.id)}>
              <Target className="mr-2 h-4 w-4" /> Set as Focus
            </DropdownMenuItem>
            {task.status === 'archived' && (
              <DropdownMenuItem onSelect={async () => { await onStatusChange(task.id, 'to-do'); playSound('success'); }}>
                <Undo2 className="mr-2 h-4 w-4" /> Restore
              </DropdownMenuItem>
            )}
            {task.status !== 'archived' && (
              <>
                <DropdownMenuItem onSelect={async () => { await onStatusChange(task.id, 'to-do'); playSound('success'); }}>
                  Mark as To-Do
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={async () => { await onStatusChange(task.id, 'completed'); playSound('success'); }}>
                  Mark as Completed
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={async () => { await onStatusChange(task.id, 'skipped'); playSound('success'); }}>
                  Mark as Skipped
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={async () => { await onStatusChange(task.id, 'archived'); playSound('success'); }}>
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
                        playSound('success');
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
                          playSound('success');
                        }}
                        disabled={task.section_id === section.id}
                      >
                        {section.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => { onDelete(task.id); playSound('alert'); }} className="text-destructive focus:text-destructive">
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