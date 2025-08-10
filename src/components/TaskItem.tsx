import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Trash2, MoreHorizontal, Archive, FolderOpen, Undo2, Repeat, Link as LinkIcon, Calendar as CalendarIcon, Target, ClipboardCopy, CalendarClock } from 'lucide-react';
import { format, parseISO, isSameDay, isPast, isValid } from 'date-fns';
import { cn } from "@/lib/utils";
import { Task } from '@/hooks/useTasks';
import { useSound } from '@/context/SoundContext';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Input } from './ui/input';
import { useSortable } from '@dnd-kit/sortable';
import DoTodaySwitch from './DoTodaySwitch';
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
  isOverlay?: boolean;
  dragListeners?: ReturnType<typeof useSortable>['listeners'];
  setFocusTask: (taskId: string | null) => Promise<void>;
  isDoToday: boolean;
  toggleDoToday: (task: Task) => void;
  scheduledTasksMap: Map<string, Appointment>;
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
  dragListeners,
  setFocusTask,
  isDoToday,
  toggleDoToday,
  scheduledTasksMap,
}) => {
  useAuth(); 
  const { playSound } = useSound();
  const [showCompletionEffect, setShowCompletionEffect] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.description);
  const inputRef = useRef<HTMLInputElement>(null);

  const scheduledAppointment = useMemo(() => scheduledTasksMap.get(task.id), [scheduledTasksMap, task.id]);

  const originalTask = useMemo(() => {
    if (!task.original_task_id) return null;
    return allTasks.find(t => t.id === task.original_task_id);
  }, [allTasks, task.original_task_id]);

  const recurringType = originalTask ? originalTask.recurring_type : task.recurring_type;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent onOpenOverview from firing
    if (isOverlay) return;
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (editText.trim() && editText.trim() !== task.description) {
      await onUpdate(task.id, { description: editText.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(task.description);
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
    if (isOverlay) return;
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
      showError('Failed to copy path.');
    }
  };

  const isOverdue = task.due_date && task.status !== 'completed' && isPast(parseISO(task.due_date)) && !isSameDay(parseISO(task.due_date), currentDate);
  const isDueToday = task.due_date && task.status !== 'completed' && isSameDay(parseISO(task.due_date), currentDate);

  return (
    <div
      className={cn(
        "relative flex items-start w-full rounded-lg transition-colors duration-200 py-2",
        task.status === 'completed' ? "text-muted-foreground bg-task-completed-bg" : "bg-card text-foreground",
        !isDoToday && task.recurring_type === 'none' && "opacity-40",
        "group hover:bg-muted/50"
      )}
      {...dragListeners}
    >
      {/* Priority Pill */}
      <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 h-3/4 w-1 rounded-r-full", getPriorityDotColor(task.priority))} />

      {/* Checkbox Area */}
      <div className="flex-shrink-0 pl-4 pr-3 pt-1" data-no-dnd="true">
        <Checkbox
          key={`${task.id}-${task.status}`}
          checked={task.status === 'completed'}
          onCheckedChange={handleCheckboxChange}
          id={`task-${task.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 h-5 w-5 checkbox-root"
          aria-label={`Mark task "${task.description}" as ${task.status === 'completed' ? 'to-do' : 'completed'}`}
          disabled={isOverlay}
        />
      </div>

      {/* Clickable Content Area */}
      <div 
        className="flex-grow flex items-center space-x-2 cursor-pointer min-w-0"
        onClick={() => !isOverlay && !isEditing && onOpenOverview(task)}
      >
        <div className="flex-grow min-w-0 w-full" data-no-dnd="true">
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleInputKeyDown}
              className="h-auto text-lg font-medium leading-tight p-0 border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <span
                className={cn(
                  "text-lg leading-tight line-clamp-2",
                  task.status === 'completed' ? 'line-through' : 'font-medium',
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

        <div className="flex-shrink-0 flex items-center space-x-2" data-no-dnd="true">
          {recurringType !== 'none' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center flex-shrink-0">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Recurring: {recurringType.charAt(0).toUpperCase() + recurringType.slice(1)}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {task.link && (
            isUrl(task.link) ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={task.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center flex-shrink-0 text-muted-foreground hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
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
                    onClick={(e) => handleCopyPath(e, task.link!)}
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
      <div className="flex-shrink-0 flex items-center space-x-1 pr-3" data-no-dnd="true">
        {recurringType === 'none' && (
          <DoTodaySwitch
            isOn={isDoToday}
            onToggle={() => toggleDoToday(task)}
            taskId={task.id}
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
              aria-label="More options"
              disabled={isOverlay}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
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
              <DropdownMenuSubTrigger onSelect={(e) => e.preventDefault()}>
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
                  </>
                )}
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
          <CheckCircle2 className="h-14 w-14 text-primary animate-fade-in-out-check" />
        </div>
      )}
    </div>
  );
};

export default TaskItem;