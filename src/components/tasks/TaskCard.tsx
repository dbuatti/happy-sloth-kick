import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Edit, Trash2, MoreVertical, Plus, Link as LinkIcon, Image as ImageIcon, StickyNote, BellRing, Repeat, ListTodo, Eye, EyeOff, Archive, RotateCcw } from 'lucide-react';
import { format, parseISO, isSameDay, isPast, startOfDay, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Task, TaskCategory, TaskSection, NewTaskData, UpdateTaskData, DoTodayOffLogEntry, TaskStatus } from '@/types'; // Corrected imports
import { getCategoryColorProps, CategoryColorKey } from '@/lib/categoryColors';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import TaskOverviewDialog from '../TaskOverviewDialog';
import { useTaskSections } from '@/hooks/useTaskSections'; // Corrected import
import { useDoTodayOffLog } from '@/hooks/useDoTodayOffLog'; // Corrected import
import { toast } from 'react-hot-toast';
import { useTaskCategories } from '@/hooks/useTaskCategories'; // Assuming this hook exists

interface TaskCardProps {
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

const TaskCard: React.FC<TaskCardProps> = ({
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(task.description);
  const [editedNotes, setEditedNotes] = useState(task.notes || '');
  const [editedDueDate, setEditedDueDate] = useState<Date | undefined>(task.due_date ? parseISO(task.due_date) : undefined);
  const [editedCategory, setEditedCategory] = useState<string | null>(task.category || null);
  const [editedPriority, setEditedPriority] = useState<Task['priority']>(task.priority || 'medium');
  const [editedSectionId, setEditedSectionId] = useState<string | null>(task.section_id || null);
  const [editedLink, setEditedLink] = useState(task.link || '');
  const [editedImageUrl, setEditedImageUrl] = useState(task.image_url || '');
  const [editedRecurringType, setEditedRecurringType] = useState<Task['recurring_type']>(task.recurring_type || 'none');

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);

  const { sections: allSections } = useTaskSections(); // Renamed to allSections to avoid conflict
  const { offLogEntries: doTodayOffLog, addDoTodayOffLogEntry, deleteDoTodayOffLogEntry } = useDoTodayOffLog(); // Corrected data access

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'completed';
  const isToday = task.due_date && isSameDay(parseISO(task.due_date), startOfDay(new Date()));

  const categoryProps = task.category
    ? getCategoryColorProps(categories.find(cat => cat.id === task.category)?.color as CategoryColorKey || 'gray')
    : { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200' };

  const handleUpdateStatus = async (newStatus: TaskStatus) => {
    try {
      await onUpdateTask(task.id, { status: newStatus });
      toast.success('Task status updated!');
    } catch (error) {
      toast.error(`Failed to update task status: ${(error as Error).message}`);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const updates: UpdateTaskData = {
        description: editedDescription,
        notes: editedNotes || null,
        due_date: editedDueDate ? format(editedDueDate, 'yyyy-MM-dd') : null,
        category: editedCategory,
        priority: editedPriority,
        section_id: editedSectionId,
        link: editedLink || null,
        image_url: editedImageUrl || null,
        recurring_type: editedRecurringType,
      };
      await onUpdateTask(task.id, updates);
      setIsEditing(false);
      toast.success('Task updated!');
    } catch (error) {
      toast.error(`Failed to update task: ${(error as Error).message}`);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedDescription(task.description);
    setEditedNotes(task.notes || '');
    setEditedDueDate(task.due_date ? parseISO(task.due_date) : undefined);
    setEditedCategory(task.category || null);
    setEditedPriority(task.priority || 'medium');
    setEditedSectionId(task.section_id || null);
    setEditedLink(task.link || '');
    setEditedImageUrl(task.image_url || '');
    setEditedRecurringType(task.recurring_type || 'none');
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
    <Card className={cn(
      "relative group",
      isOverdue && 'border-red-500',
      task.status === 'completed' && 'opacity-70',
      isTaskOffToday && 'opacity-50 line-through'
    )}>
      <CardContent className="p-4 flex items-start space-x-3">
        {onSelectForBulkAction && (
          <Checkbox
            checked={isSelectedForBulkAction}
            onCheckedChange={(checked) => onSelectForBulkAction(task.id, checked as boolean)}
            className="mt-1"
          />
        )}
        <div className="flex-1">
          {isEditing ? (
            <Input
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
                if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
              autoFocus
              className="text-lg font-semibold"
            />
          ) : (
            <p
              className={cn(
                "text-lg font-semibold",
                task.status === 'completed' && 'line-through text-gray-500'
              )}
              onDoubleClick={() => setIsEditing(true)}
            >
              {task.description}
            </p>
          )}

          {editedNotes && !isEditing && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{editedNotes}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
            {task.category && (
              <span className={cn("px-2 py-1 rounded-full text-xs", categoryProps.bg, categoryProps.text)}>
                {categories.find(cat => cat.id === task.category)?.name || 'Uncategorized'}
              </span>
            )}
            {task.priority && task.priority !== 'none' && (
              <span className={cn("px-2 py-1 rounded-full text-xs", {
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
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddSubtask('New Subtask', task.id)}>
              <Plus className="mr-2 h-4 w-4" /> Add Subtask
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsTaskOverviewOpen(true)}>
              <ListTodo className="mr-2 h-4 w-4" /> Details
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
              {allSections?.find(s => s.id === task.section_id)?.include_in_focus_mode ? (
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
      </CardContent>

      {/* Subtasks */}
      {task.id && tasks.filter(sub => sub.parent_task_id === task.id).length > 0 && (
        <CardContent className="pt-0 pl-8">
          <div className="space-y-2 border-l-2 pl-4">
            {tasks.filter(sub => sub.parent_task_id === task.id).map(subtask => (
              <TaskCard
                key={subtask.id}
                task={subtask}
                categories={categories}
                sections={sections}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onAddSubtask={onAddSubtask}
                onToggleFocusMode={onToggleFocusMode}
                onLogDoTodayOff={onLogDoTodayOff}
              />
            ))}
          </div>
        </CardContent>
      )}

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
    </Card>
  );
};

export default TaskCard;