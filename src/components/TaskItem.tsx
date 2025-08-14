import React, { useMemo } from 'react'; // Removed useState as it's not used
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Task, Section, Category } from '@/hooks/useTasks'; // Import Section and Category
import { format, isValid, parseISO } from 'date-fns';
import { CalendarDays, StickyNote, BellRing, Link as LinkIcon, ClipboardCopy, Repeat, Undo2, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getPriorityColor, getPriorityDotColor, getCategoryColorProps } from '@/utils/taskUtils';
import { useSound } from '@/context/SoundContext';
import { isUrl } from '@/utils/url';
import { Button } from '@/components/ui/button';
import DoTodaySwitch from './DoTodaySwitch';

interface TaskItemProps {
  task: Task;
  allTasks: Task[]; // For subtask filtering and original task lookup
  sections: Section[]; // For section name lookup
  allCategories: Category[]; // For category name and color lookup
  onStatusChange: (taskId: string, newStatus: Task['status']) => Promise<boolean>; // Changed return type to boolean
  onUpdate: (taskId: string, updates: Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>) => Promise<boolean>; // Changed return type to boolean
  onDelete: (taskId: string) => Promise<boolean>; // Changed return type to boolean
  onOpenOverview: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
  isOverlay?: boolean;
  isDemo?: boolean;
  setFocusTask?: (task: Task | null) => void; // Optional, for focus mode
  isDoToday?: boolean; // For "Do Today" functionality
  toggleDoToday?: (task: Task) => void; // For "Do Today" functionality
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  allTasks,
  sections,
  allCategories,
  onStatusChange,
  onUpdate,
  onDelete,
  onOpenOverview,
  onOpenDetail,
  isOverlay = false,
  isDemo = false,
  setFocusTask,
  isDoToday = true,
  toggleDoToday,
}) => {
  const { playSound } = useSound();

  const category = useMemo(() => allCategories.find(cat => cat.id === task.category_id), [allCategories, task.category_id]);
  const section = useMemo(() => sections.find(sec => sec.id === task.section_id), [sections, task.section_id]);

  const originalTask = useMemo(() => {
    if (!task.original_task_id) return null;
    return allTasks.find(t => t.id === task.original_task_id);
  }, [allTasks, task.original_task_id]);

  const recurringType = originalTask ? originalTask.recurring_type : task?.recurring_type;

  const handleCheckboxChange = async (checked: boolean) => {
    if (isOverlay || isDemo) return;
    await onStatusChange(task.id, checked ? 'completed' : 'todo'); // Fixed 'to-do' to 'todo'
    if (checked) {
      playSound('success');
    }
  };

  const handleCopyPath = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(path);
    // Optionally show a toast notification
  };

  const handleRemoveFromSection = async () => {
    await onUpdate(task.id, { section_id: null });
    playSound('success');
  };

  const handleMoveToSection = async (sectionId: string) => {
    await onUpdate(task.id, { section_id: sectionId });
    playSound('success');
  };

  const handleMarkAsSkipped = async () => {
    await onStatusChange(task.id, 'skipped');
    playSound('success');
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative flex items-center gap-3 p-3 rounded-xl bg-card shadow-sm transition-all duration-200 ease-in-out group",
          task.status === 'completed' && "opacity-70 line-through",
          isOverlay && "ring-2 ring-primary ring-offset-2",
          getPriorityColor(task.priority ?? 'low') // Ensure getPriorityColor handles undefined
        )}
        onClick={() => onOpenOverview(task)}
      >
        {/* Priority Pill */}
        <div className={cn("absolute left-0 top-0 h-full w-1.5 rounded-l-lg", getPriorityDotColor(task.priority ?? 'low'))} /> {/* Added ?? 'low' for safety */}

        <Checkbox
          checked={task.status === 'completed'}
          onCheckedChange={handleCheckboxChange}
          className="flex-shrink-0"
          id={`task-${task.id}`}
          disabled={isOverlay || isDemo}
        />

        <div className="flex-grow min-w-0">
          <label
            htmlFor={`task-${task.id}`}
            className={cn(
              "font-medium text-base leading-tight cursor-pointer block",
              task.status === 'completed' && "text-muted-foreground"
            )}
          >
            {task.description}
          </label>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
            {task.due_date && isValid(parseISO(task.due_date)) && (
              <div className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                <span>{format(parseISO(task.due_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            {task.remind_at && isValid(parseISO(task.remind_at)) && (
              <div className="flex items-center gap-1">
                <BellRing className="h-3 w-3" />
                <span>{format(parseISO(task.remind_at), 'HH:mm')}</span>
              </div>
            )}
            {task.notes && (
              <div className="flex items-center gap-1">
                <StickyNote className="h-3 w-3" />
                <span>Notes</span>
              </div>
            )}
            {recurringType && recurringType !== 'none' && (
              <div className="flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                <span className="capitalize">{recurringType}</span>
              </div>
            )}
            {category && (
              <div className="flex items-center gap-1">
                <span className={cn("h-2 w-2 rounded-full", getCategoryColorProps(category.color ?? 'gray').bgColor)} /> {/* Added ?? 'gray' */}
                <span>{category.name}</span>
              </div>
            )}
            {section && (
              <div className="flex items-center gap-1">
                <span>{section.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center space-x-2" onPointerDown={(e) => e.stopPropagation()}>
          {task.link && (
            isUrl(task.link) ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={task.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-primary flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()} // Prevent opening overview when clicking link
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

          {toggleDoToday && (
            <DoTodaySwitch
              isOn={isDoToday}
              onToggle={() => toggleDoToday(task)}
              disabled={isOverlay || isDemo}
            />
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-primary">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onOpenDetail(task)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              {task.status === 'archived' && (
                <DropdownMenuItem onSelect={async () => { await onStatusChange(task.id, 'todo'); playSound('success'); }}> {/* Fixed 'to-do' to 'todo' */}
                  <Undo2 className="mr-2 h-4 w-4" /> Restore
                </DropdownMenuItem>
              )}
              {task.status !== 'archived' && (
                <>
                  <DropdownMenuItem onSelect={async () => { await onStatusChange(task.id, 'todo'); playSound('success'); }}> {/* Fixed 'to-do' to 'todo' */}
                    Mark as To-Do
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleMarkAsSkipped}> {/* Fixed 'skipped' status */}
                    Mark as Skipped
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={async () => { await onStatusChange(task.id, 'completed'); playSound('success'); }}>
                    Mark as Completed
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Move to Section</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onSelect={handleRemoveFromSection}>
                    No Section
                  </DropdownMenuItem>
                  {sections.map(sec => (
                    <DropdownMenuItem key={sec.id} onSelect={() => handleMoveToSection(sec.id)}>
                      {sec.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={async () => { await onDelete(task.id); playSound('delete'); }} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TaskItem;