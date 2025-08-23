import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, MoreVertical, Plus, Link as LinkIcon, Image as ImageIcon, StickyNote, BellRing, Repeat, ListTodo, Eye, EyeOff, Archive, RotateCcw, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { cn } from "@/lib/utils";
import { Task, TaskCategory, TaskSection, UpdateTaskData, NewTaskData, Appointment, DoTodayOffLogEntry, TaskStatus } from '@/types'; // Corrected imports
import { useSound } from '@/context/SoundContext';
import { format, parseISO, isSameDay, isPast, startOfDay } from 'date-fns';
import { getCategoryColorProps, CategoryColorKey } from '@/lib/categoryColors';
import TaskOverviewDialog from '../TaskOverviewDialog';
import { toast } from 'react-hot-toast';
import { useDoTodayOffLog } from '@/hooks/useDoTodayOffLog'; // Import useDoTodayOffLog

interface TaskItemProps {
  task: Task;
  categories: TaskCategory[];
  sections: TaskSection[];
  onUpdateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (description: string, parentTaskId: string | null) => Promise<Task>;
  onToggleFocusMode: (taskId: string) => void;
  onLogDoTodayOff: (taskId: string) => void;
  onSelectForBulkAction?: (taskId: string, isSelected: boolean) => void;
  isSelectedForBulkAction?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  categories,
  sections,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
  onSelectForBulkAction,
  isSelectedForBulkAction,
}) => {
  const { playSound } = useSound();
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const { offLogEntries: doTodayOffLog, addDoTodayOffLogEntry, deleteDoTodayOffLogEntry } = useDoTodayOffLog();

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'completed';
  const isToday = task.due_date && isSameDay(parseISO(task.due_date), startOfDay(new Date()));

  const categoryProps = task.category
    ? getCategoryColorProps(categories.find(cat => cat.id === task.category)?.color as CategoryColorKey || 'gray')
    : { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200' };

  const handleToggleComplete = async (checked: boolean) => {
    try {
      await onUpdateTask(task.id, { status: checked ? 'completed' : 'to-do' });
      if (checked) {
        playSound('complete');
        toast.success('Task completed!');
      } else {
        toast('Task marked as to-do.');
      }
    } catch (error) {
      toast.error(`Failed to update task status: ${(error as Error).message}`);
    }
  };

  const handleUpdateStatus = async (newStatus: TaskStatus) => {
    try {
      await onUpdateTask(task.id, { status: newStatus });
      toast.success('Task status updated!');
    } catch (error) {
      toast.error(`Failed to update task status: ${(error as Error).message}`);
    }
  };

  const handleToggleDoTodayOff = async () => {
    const todayDate = format(startOfDay(new Date()), 'yyyy-MM-dd');
    const isAlreadyOffToday = doTodayOffLog?.some(
      (entry: DoTodayOffLogEntry) => entry.task_id === task.id && isSameDay(parseISO(entry.off_date), startOfDay(new Date()))
    );

    try {
      if (isAlreadyOffToday) {
        const entryToDelete = doTodayOffLog?.find(
          (entry: DoTodayOffLogEntry) => entry.task_id === task.id && isSameDay(parseISO(entry.off_date), startOfDay(new Date()))
        );
        if (entryToDelete) {
          await deleteDoTodayOffLogEntry(entryToDelete.id);
          toast.success('Task is now "Do Today On"!');
        }
      } else {
        await addDoTodayOffLogEntry({ task_id: task.id, off_date: todayDate });
        toast.success('Task is now "Do Today Off"!');
      }
      onLogDoTodayOff(task.id); // Trigger a refresh or state update in parent
    } catch (error) {
      toast.error(`Failed to update "Do Today Off" status: ${(error as Error).message}`);
    }
  };

  const isTaskOffToday = doTodayOffLog?.some(
    (entry: DoTodayOffLogEntry) => entry.task_id === task.id && isSameDay(parseISO(entry.off_date), startOfDay(new Date()))
  );

  return (
    <div className={cn(
      "flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 group",
      isOverdue && 'bg-red-50 dark:bg-red-950',
      task.status === 'completed' && 'opacity-70',
      isTaskOffToday && 'opacity-50 line-through'
    )}>
      {onSelectForBulkAction && (
        <Checkbox
          checked={isSelectedForBulkAction}
          onCheckedChange={(checked) => onSelectForBulkAction(task.id, checked as boolean)}
        />
      )}
      <Checkbox
        checked={task.status === 'completed'}
        onCheckedChange={handleToggleComplete}
        aria-label={`Mark task "${task.description}" as complete`}
      />
      <div className="flex-1">
        <p className={cn(
          "font-medium",
          task.status === 'completed' && 'line-through text-gray-500'
        )}>
          {task.description}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
          {task.category && (
            <span className={cn("px-2 py-0.5 rounded-full", categoryProps.bg, categoryProps.text)}>
              {categories.find(cat => cat.id === task.category)?.name || 'Uncategorized'}
            </span>
          )}
          {task.priority && task.priority !== 'none' && (
            <span className={cn("px-2 py-0.5 rounded-full", {
              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200': task.priority === 'urgent',
              'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200': task.priority === 'high',
              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200': task.priority === 'medium',
              'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200': task.priority === 'low',
            })}>
              {task.priority}
            </span>
          )}
          {task.due_date && (
            <span className={cn(
              "flex items-center gap-1",
              isOverdue && 'text-red-500 font-semibold',
              isToday && !isOverdue && 'text-blue-500 font-semibold'
            )}>
              <CalendarIcon className="h-3 w-3" />
              {format(parseISO(task.due_date), 'MMM d, yyyy')}
            </span>
          )}
          {task.recurring_type && task.recurring_type !== 'none' && (
            <span className="flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              {task.recurring_type}
            </span>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsTaskOverviewOpen(true)}>
            <ListTodo className="mr-2 h-4 w-4" /> Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddSubtask('New Subtask', task.id)}>
            <Plus className="mr-2 h-4 w-4" /> Add Subtask
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {task.status !== 'completed' && (
            <DropdownMenuItem onClick={() => handleUpdateStatus('completed')}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Completed
            </DropdownMenuItem>
          )}
          {task.status !== 'to-do' && (
            <DropdownMenuItem onClick={() => handleUpdateStatus('to-do')}>
              <RotateCcw className="mr-2 h-4 w-4" /> Mark To Do
            </DropdownMenuItem>
          )}
          {task.status !== 'archived' && (
            <DropdownMenuItem onClick={() => handleUpdateStatus('archived')}>
              <Archive className="mr-2 h-4 w-4" /> Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onToggleFocusMode(task.id)}>
            {sections.find(s => s.id === task.section_id)?.include_in_focus_mode ? (
              <EyeOff className="mr-2 h-4 w-4" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            Toggle Focus Mode
          </DropdownMenuItem>
          {isToday && (
            <DropdownMenuItem onClick={handleToggleDoTodayOff}>
              {isTaskOffToday ? (
                <RotateCcw className="mr-2 h-4 w-4" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              {isTaskOffToday ? 'Mark Do Today On' : 'Mark Do Today Off'}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onDeleteTask(task.id)} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TaskOverviewDialog
        isOpen={isTaskOverviewOpen}
        onOpenChange={setIsTaskOverviewOpen}
        task={task}
        categories={categories}
        sections={sections}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onAddSubtask={onAddSubtask}
        onToggleFocusMode={onToggleFocusMode}
        onLogDoTodayOff={onLogDoTodayOff}
      />
    </div>
  );
};

export default TaskItem;