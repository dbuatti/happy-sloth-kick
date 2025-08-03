import React, { useState, useEffect, useRef } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Trash2, MoreHorizontal, Archive, FolderOpen, Undo2, Repeat, Link as LinkIcon, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO, isSameDay, isPast, isValid } from 'date-fns';
import { cn } from "@/lib/utils";
import { Task } from '@/hooks/useTasks';
import { useSound } from '@/context/SoundContext';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Input } from './ui/input';
import DragHandleIcon from './DragHandleIcon';
import { useSortable } from '@dnd-kit/sortable';

interface TaskItemProps {
  task: Task;
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
  dragListeners?: ReturnType<typeof useSortable>['listeners'];
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onStatusChange,
  onDelete,
  onUpdate,
  onToggleSelect,
  sections,
  onOpenOverview,
  currentDate,
  isOverlay = false,
  dragListeners,
}) => {
  useAuth(); 
  const { playSound } = useSound();
  const [showCompletionEffect, setShowCompletionEffect] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.description);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    if (isOverlay) return;
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText.trim() !== task.description) {
      onUpdate(task.id, { description: editText.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(task.description);
    setIsEditing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
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
        "relative flex items-center space-x-2 w-full py-3 pr-3",
        task.status === 'completed' ? "text-muted-foreground bg-task-completed-bg" : "text-foreground",
        "group",
        isOverdue && "border-l-4 border-status-overdue",
        isDueToday && "border-l-4 border-status-due-today",
      )}
      onClick={() => !isOverlay && !isEditing && onOpenOverview(task)}
    >
      <div {...dragListeners} className="cursor-grab p-2 opacity-0 group-hover:opacity-50 transition-opacity" data-no-dnd="true" onClick={(e) => e.stopPropagation()}>
        <DragHandleIcon className="h-4 w-4" />
      </div>

      <div data-no-dnd="true">
        <Checkbox
          key={`${task.id}-${task.status}`}
          checked={task.status === 'completed'}
          onCheckedChange={handleCheckboxChange}
          id={`task-${task.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 h-5 w-5"
          aria-label={`Mark task "${task.description}" as ${task.status === 'completed' ? 'to-do' : 'completed'}`}
          disabled={isOverlay}
        />
      </div>

      <div className={cn("w-3 h-3 rounded-full flex-shrink-0", getPriorityDotColor(task.priority))} />
      
      <div className="flex-grow" onClick={handleStartEdit} data-no-dnd={isEditing ? "true" : "false"}>
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleInputKeyDown}
            className="h-auto text-lg leading-tight p-0 border-none bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={cn(
              "text-lg leading-tight line-clamp-2",
              task.status === 'completed' ? 'line-through' : 'font-medium',
              "block"
            )}
          >
            {task.description}
          </span>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center space-x-2" data-no-dnd="true">
        {task.recurring_type !== 'none' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center flex-shrink-0">
                <Repeat className="h-4 w-4 text-muted-foreground" />
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
              >
                <LinkIcon className="h-4 w-4" />
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
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
              aria-label="More options"
              disabled={isOverlay}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={(e) => {
              e.preventDefault();
              onOpenOverview(task);
            }}>
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
              <DropdownMenuSubTrigger onSelect={(e) => e.preventDefault()}>
                <FolderOpen className="mr-2 h-4 w-4" /> Move to Section
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
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