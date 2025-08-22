"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MoreHorizontal, Archive, Undo2, Repeat, Link as LinkIcon, Calendar as CalendarIcon, Target, ClipboardCopy, CalendarClock, ChevronRight } from 'lucide-react';
import { format, parseISO, isSameDay, isPast, isValid } from 'date-fns';
import { cn } from "@/lib/utils";
import { useSound } from '@/context/SoundContext';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import DoTodaySwitch from '@/components/DoTodaySwitch';
import { showSuccess, showError } from '@/utils/toast';
import { Appointment } from '@/hooks/useAppointments';

// Fix 3: Correct the import path for Task type
interface Task {
  id: string;
  description: string | null;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  created_at: string;
  user_id: string;
  priority: string;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number | null;
  parent_task_id: string | null;
  recurring_type: string | null;
  original_task_id: string | null;
  category: string | null;
  link: string | null;
  image_url: string | null;
  updated_at: string | null;
}

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
  level: number; // New prop for indentation level
  isOverlay?: boolean; // New prop for drag overlay
  hasSubtasks?: boolean;
  isExpanded?: boolean;
  toggleTask?: (taskId: string) => void;
  setFocusTask: (taskId: string | null) => Promise<void>;
  isDoToday: boolean; // This is a prop, not internal state
  toggleDoToday: (task: Task) => void; // This is the function from useTasks
  scheduledTasksMap: Map<string, Appointment>;
  isDemo?: boolean;
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
  isDoToday, // Destructure prop
  toggleDoToday, // Destructure prop
  scheduledTasksMap,
  isDemo = false,
}) => {
  useAuth(); 
  const { playSound } = useSound();
  const [showCompletionEffect, setShowCompletionEffect] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.description || ''); // Initialize with empty string if null
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Log the isDoToday prop whenever it changes
  useEffect(() => {
    console.log(`TaskItem: Task ${task.id} (${task.description}) - isDoToday prop changed to: ${isDoToday}`);
  }, [isDoToday, task.id, task.description]);


  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOverlay || isDemo) return;
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (editText.trim() && editText.trim() !== (task.description || '')) { // Add null check for task.description
      await onUpdate(task.id, { description: editText.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(task.description || ''); // Reset to original description or empty string
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

  const handleCheckboxChange = (checked: boolean) => {
    if (isOverlay || isDemo) return;
    onStatusChange(task.id, checked ? 'completed' : 'to-do');
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

  const isOverdue = task.due_date && task.status !== 'completed' && isPast(parseISO(task.due_date)) && !isSameDay(parseISO(task.due_date), currentDate);
  const isDueToday = task.due_date && task.status !== 'completed' && isSameDay(parseISO(task.due_date), currentDate);

  const handleToggleDoTodaySwitch = (newCheckedState: boolean) => {
    console.log(`[Do Today Debug] TaskItem: handleToggleDoTodaySwitch called for task ${task.id}. New state from switch: ${newCheckedState}`);
    toggleDoToday(task); // Call the prop function from useTasks
  };

  // Handle menu toggle for mobile
  const toggleMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isOverlay || isDemo) return;
    setIsMenuOpen(!isMenuOpen);
  };

  // Handle menu item selection
  const handleMenuItemSelect = (action: () => void) => {
    return () => {
      action();
      setIsMenuOpen(false);
    };
  };

  return (
    <div
      className={cn(
        "relative flex items-center w-full rounded-lg transition-colors duration-200 py-2 pl-4",
        task.status === 'completed' ? "text-muted-foreground bg-task-completed-bg" : "bg-card text-foreground",
        !isDoToday && "opacity-40", // Apply opacity if NOT 'Do Today'
        "group hover:bg-muted/50"
      )}
    >
      {/* Priority Pill */}
      <div className={cn("absolute left-0 top-0 h-full w-1.5 rounded-l-lg", getPriorityDotColor(task.priority))} />

      <div className="flex-shrink-0 pr-1 flex items-center">
        {hasSubtasks && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              toggleTask?.(task.id);
            }}
            aria-label={isExpanded ? 'Collapse sub-tasks' : 'Expand sub-tasks'}
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded ? "rotate-90" : "rotate-0")} />
          </Button>
        )}
      </div>

      {/* Checkbox Area */}
      <div className="flex-shrink-0 pr-3">
        <Checkbox
          key={`${task.id}-${task.status}`}
          checked={task.status === 'completed'}
          onCheckedChange={handleCheckboxChange}
          id={`task-${task.id}`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="flex-shrink-0 h-5 w-5 checkbox-root"
          aria-label={`Mark task "${task.description}" as ${task.status === 'completed' ? 'to-do' : 'completed'}`}
          disabled={isOverlay || isDemo}
        />
      </div>

      {/* Clickable Content Area */}
      <div 
        className="flex-grow flex items-center space-x-2 min-w-0"
        onClick={() => !isOverlay && !isEditing && onOpenOverview(task)}
      >
        <div className="flex-grow min-w-0 w-full">
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editText || ''} // Ensure value is always a string
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditText(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleInputKeyDown}
              className="h-auto text-lg leading-tight p-0 border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
              onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
            />
          ) : (
            <>
              <span
                className={cn(
                  "text-lg leading-tight line-clamp-2",
                  task.status === 'completed' ? 'line-through' : '',
                  "inline-block cursor-text"
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

        <div className="flex-shrink-0 flex items-center space-x-2">
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
                    className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-primary"
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
                  "inline-flex items-center flex-shrink-0 text-xs font-medium px-1 py-0.5 rounded-sm",
                  "text-muted-foreground",
                  isOverdue && "text-status-overdue",
                  isDueToday && "text-status-due-today"
                )}>
                  <CalendarIcon className="h-3.5 w-3.5 mr-1" /> {getDueDateDisplay(task.due_date)}
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
      <div className="flex-shrink-0 flex items-center gap-1 pr-3">
        {/* Fix 1 & 2: Add null check for recurringType before using it */}
        {recurringType && recurringType !== 'none' && (
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
        
        {/* Custom mobile-friendly dropdown implementation */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label="More options"
            disabled={isOverlay || isDemo}
            onClick={toggleMenu}
            onTouchEnd={(e: React.TouchEvent) => {
              e.preventDefault();
              e.stopPropagation();
              toggleMenu(e);
            }}
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          
          {isMenuOpen && (
            <div 
              className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-popover border border-border z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-1" role="menu">
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center"
                  role="menuitem"
                  onClick={handleMenuItemSelect(() => onOpenOverview(task))}
                >
                  <Edit className="mr-2 h-4 w-4" /> View Details
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center"
                  role="menuitem"
                  onClick={handleMenuItemSelect(() => setFocusTask(task.id))}
                >
                  <Target className="mr-2 h-4 w-4" /> Set as Focus
                </button>
                
                {task.status === 'archived' ? (
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center"
                    role="menuitem"
                    onClick={handleMenuItemSelect(async () => { await onStatusChange(task.id, 'to-do'); playSound('success'); })}
                  >
                    <Undo2 className="mr-2 h-4 w-4" /> Restore
                  </button>
                ) : (
                  <>
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      role="menuitem"
                      onClick={handleMenuItemSelect(async () => { await onStatusChange(task.id, 'to-do'); playSound('success'); })}
                    >
                      Mark as To-Do
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      role="menuitem"
                      onClick={handleMenuItemSelect(async () => { await onStatusChange(task.id, 'completed'); playSound('success'); })}
                    >
                      Mark as Completed
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      role="menuitem"
                      onClick={handleMenuItemSelect(async () => { await onStatusChange(task.id, 'skipped'); playSound('success'); })}
                    >
                      Mark as Skipped
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center"
                      role="menuitem"
                      onClick={handleMenuItemSelect(async () => { await onStatusChange(task.id, 'archived'); playSound('success'); })}
                    >
                      <Archive className="mr-2 h-4 w-4" /> Archive
                    </button>
                  </>
                )}
                
                <div className="border-t border-border my-1"></div>
                
                <div className="px-4 py-2 text-sm font-medium">Move to Section</div>
                <button
                  className={`w-full text-left px-8 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${task.section_id === null ? 'bg-accent text-accent-foreground' : ''}`}
                  role="menuitem"
                  onClick={handleMenuItemSelect(async () => {
                    await onUpdate(task.id, { section_id: null });
                    playSound('success');
                  })}
                  disabled={task.section_id === null}
                >
                  No Section
                </button>
                {sections.map(section => (
                  <button
                    key={section.id}
                    className={`w-full text-left px-8 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${task.section_id === section.id ? 'bg-accent text-accent-foreground' : ''}`}
                    role="menuitem"
                    onClick={handleMenuItemSelect(async () => {
                      await onUpdate(task.id, { section_id: section.id });
                      playSound('success');
                    })}
                    disabled={task.section_id === section.id}
                  >
                    {section.name}
                  </button>
                ))}
                
                <div className="border-t border-border my-1"></div>
                
                <button
                  className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive hover:text-destructive-foreground flex items-center"
                  role="menuitem"
                  onClick={handleMenuItemSelect(() => { onDelete(task.id); playSound('alert'); })}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCompletionEffect && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <CheckCircle2 className="h-14 w-14 text-primary animate-fade-in-out-check" />
        </div>
      )}
    </div>
  );
};

export default TaskItem;