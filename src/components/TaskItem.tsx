import React from 'react';
import { Task, TaskSection, UpdateTaskData, Category } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Archive, ListTodo, CheckCircle2, Clock, Calendar, Tag, Info, Repeat, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSound } from '@/context/SoundContext';
import { getPriorityDotColor } from '@/utils/taskHelpers';
import { getCategoryColorProps } from '@/utils/categoryHelpers';

interface TaskItemProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: Task['status']) => Promise<Task | null>;
  onDelete: (taskId: string) => Promise<boolean>;
  onUpdate: (taskId: string, updates: UpdateTaskData) => Promise<Task | null>;
  onOpenOverview: (task: Task) => void;
  sections: TaskSection[];
  allCategories: Category[];
  isSubtask?: boolean;
  isDraggable?: boolean;
  dragHandleProps?: any;
  listeners?: any;
  style?: React.CSSProperties;
  isDragging?: boolean;
  doTodayOffIds: string[];
  toggleDoToday: (taskId: string, isOff: boolean) => Promise<boolean>;
}

const TaskItem = React.forwardRef<HTMLDivElement, TaskItemProps>(({
  task,
  onStatusChange,
  onDelete,
  onUpdate,
  onOpenOverview,
  sections,
  allCategories,
  isSubtask = false,
  isDraggable = true,
  dragHandleProps,
  listeners,
  style,
  isDragging,
  doTodayOffIds,
  toggleDoToday,
}, ref) => {
  const { playSound } = useSound();

  const category = task.category ? allCategories.find(cat => cat.id === task.category) : undefined;
  const categoryColorProps = getCategoryColorProps(category?.color || ''); // Provide empty string if undefined

  const isDueToday = task.due_date && isValid(parseISO(task.due_date)) && format(parseISO(task.due_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isOverdue = task.due_date && isValid(parseISO(task.due_date)) && parseISO(task.due_date) < new Date() && task.status !== 'completed';
  const isDoTodayOff = doTodayOffIds.includes(task.id);

  const handleCheckboxChange = async (checked: boolean) => {
    const newStatus: Task['status'] = checked ? 'completed' : 'to-do';
    await onStatusChange(task.id, newStatus);
    if (checked) {
      playSound('complete');
    }
  };

  const recurringType = task.recurring_type;

  return (
    <div
      ref={ref}
      className={cn(
        "relative rounded-xl p-2 transition-all duration-200 ease-in-out group",
        "flex items-center gap-2 bg-card text-card-foreground shadow-sm",
        isSubtask ? "ml-6" : "",
        isDragging ? "opacity-50 ring-2 ring-primary" : "hover:shadow-md",
        task.status === 'completed' && "opacity-70 line-through",
        task.status === 'archived' && "opacity-50 italic",
        task.status === 'skipped' && "opacity-70 italic"
      )}
      style={style}
    >
      {/* Priority Pill */}
      <div className={cn("absolute left-0 top-0 h-full w-1.5 rounded-l-lg", getPriorityDotColor(task.priority || 'medium'))} />

      {isDraggable && (
        <div
          className="cursor-grab text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1.5"
          {...dragHandleProps}
          {...listeners}
        >
          <MoreHorizontal className="h-4 w-4 rotate-90" />
        </div>
      )}

      <Checkbox
        id={`task-${task.id}`}
        checked={task.status === 'completed'}
        onCheckedChange={handleCheckboxChange}
        className="flex-shrink-0"
        disabled={task.status === 'archived' || task.status === 'skipped'}
      />

      <label
        htmlFor={`task-${task.id}`}
        className="flex-grow text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        onClick={() => onOpenOverview(task)}
      >
        {task.description}
      </label>

      <div className="flex items-center gap-2 flex-shrink-0 text-muted-foreground text-xs">
        {task.notes && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold">{task.description}</p>
              <p className="text-sm">{task.notes}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {task.due_date && isValid(parseISO(task.due_date)) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn("flex items-center gap-1", isOverdue && "text-destructive")}>
                <Calendar className="h-4 w-4" />
                <span>{format(parseISO(task.due_date), 'MMM d')}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Due Date: {format(parseISO(task.due_date), 'PPP')}
              {isOverdue && <p className="text-destructive"> (Overdue)</p>}
            </TooltipContent>
          </Tooltip>
        )}

        {task.remind_at && isValid(parseISO(task.remind_at)) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{format(parseISO(task.remind_at), 'h:mm a')}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Reminder: {format(parseISO(task.remind_at), 'PPP p')}
            </TooltipContent>
          </Tooltip>
        )}

        {category && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1" style={{ color: categoryColorProps.textColor }}>
                <Tag className="h-4 w-4" style={{ color: categoryColorProps.bgColor }} />
                <span>{category.name}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Category: {category.name}
            </TooltipContent>
          </Tooltip>
        )}

        {recurringType && recurringType !== 'none' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Repeat className="h-4 w-4" />
                <span>{recurringType.charAt(0).toUpperCase() + recurringType.slice(1)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Recurring: {recurringType.charAt(0).toUpperCase() + recurringType.slice(1)}</p>
            </TooltipContent>
          </Tooltip>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onOpenOverview(task)}>
              <Edit className="mr-2 h-4 w-4" /> Details
            </DropdownMenuItem>
            {task.status === 'archived' ? (
              <DropdownMenuItem onSelect={async () => { await onStatusChange(task.id, 'to-do'); playSound('success'); }}>
                <ListTodo className="mr-2 h-4 w-4" /> Unarchive
              </DropdownMenuItem>
            ) : (
              <>
                {task.status !== 'completed' && (
                  <DropdownMenuItem onSelect={async () => { await onStatusChange(task.id, 'completed'); playSound('complete'); }}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Complete
                  </DropdownMenuItem>
                )}
                {task.status !== 'to-do' && (
                  <DropdownMenuItem onSelect={async () => { await onStatusChange(task.id, 'to-do'); playSound('success'); }}>
                    <ListTodo className="mr-2 h-4 w-4" /> Mark as To-Do
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={async () => { await onStatusChange(task.id, 'skipped'); playSound('success'); }}>
                  Mark as Skipped
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={async () => { await onStatusChange(task.id, 'archived'); playSound('success'); }}>
                  <Archive className="mr-2 h-4 w-4" /> Archive
                </DropdownMenuItem>
              </>
            )}
            {isDueToday && (
              <DropdownMenuItem onSelect={async () => { await toggleDoToday(task.id, isDoTodayOff); playSound('success'); }}>
                <X className="mr-2 h-4 w-4" /> {isDoTodayOff ? 'Add to Do Today' : 'Move off Do Today'}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={async () => {
              await onUpdate(task.id, { section_id: null });
              playSound('success');
            }}>
              Move to No Section
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive focus:text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

TaskItem.displayName = 'TaskItem';

export default TaskItem;