import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Edit, Trash2, MoreVertical, Plus, Link as LinkIcon, Image as ImageIcon, StickyNote, BellRing, Repeat, ListTodo, Eye, EyeOff, Archive, RotateCcw, CheckCircle2, X } from 'lucide-react';
import { format, parseISO, isSameDay, isPast, startOfDay, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Task, TaskCategory, TaskSection, NewTaskData, UpdateTaskData, DoTodayOffLogEntry, TaskStatus, TaskCardProps } from '@/types';
import { getCategoryColorProps, CategoryColorKey } from '@/lib/categoryColors';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { toast } from 'react-hot-toast';
import { useDoTodayOffLog } from '@/hooks/useDoTodayOffLog';

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleFocusMode,
  onLogDoTodayOff,
  categories,
  sections,
  isDragging,
  tasks, // All tasks for subtask rendering
  doTodayOffLog,
}) => {
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);

  const categoryProps = task.category
    ? getCategoryColorProps(categories.find((cat: TaskCategory) => cat.id === task.category)?.color as CategoryColorKey)
    : { backgroundClass: 'bg-gray-100', textColor: 'text-gray-800' };

  const handleToggleComplete = async (checked: boolean) => {
    await onUpdateTask(task.id, { status: checked ? 'completed' : 'to-do' });
  };

  const handleUpdateStatus = async (newStatus: TaskStatus) => {
    await onUpdateTask(task.id, { status: newStatus });
  };

  const handleToggleDoTodayOff = async () => {
    await onLogDoTodayOff(task.id);
  };

  const isTaskOffToday = useMemo(() => {
    return doTodayOffLog?.some((entry: DoTodayOffLogEntry) => entry.task_id === task.id && isSameDay(parseISO(entry.off_date), startOfDay(new Date())));
  }, [doTodayOffLog, task.id]);

  const subtasks = useMemo(() => {
    return tasks.filter((sub: Task) => sub.parent_task_id === task.id);
  }, [tasks, task.id]);

  const section = useMemo(() => sections.find((sec: TaskSection) => sec.id === task.section_id), [sections, task.section_id]);

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isSameDay(parseISO(task.due_date), new Date());
  const isDueToday = task.due_date && isSameDay(parseISO(task.due_date), new Date());

  return (
    <>
      <Card
        className={cn(
          "relative group",
          isDragging && "opacity-50",
          task.status === 'completed' && "opacity-70 line-through text-muted-foreground",
          isOverdue && task.status !== 'completed' && "border-red-400 bg-red-50 ring-1 ring-red-200",
          isTaskOffToday && "bg-gray-50 opacity-80"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center">
            <Checkbox
              checked={task.status === 'completed'}
              onCheckedChange={handleToggleComplete}
              className="mr-2"
            />
            <CardTitle className="text-base font-medium">{task.description}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsTaskOverviewOpen(true)}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {task.status !== 'completed' && (
                <DropdownMenuItem onClick={() => handleUpdateStatus('completed')}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Completed
                </DropdownMenuItem>
              )}
              {task.status !== 'to-do' && (
                <DropdownMenuItem onClick={() => handleUpdateStatus('to-do')}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Mark To-Do
                </DropdownMenuItem>
              )}
              {task.status !== 'archived' && (
                <DropdownMenuItem onClick={() => handleUpdateStatus('archived')}>
                  <Archive className="mr-2 h-4 w-4" /> Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onToggleFocusMode(task.id, !(section?.include_in_focus_mode ?? true))}>
                {section?.include_in_focus_mode ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" /> Remove from Focus
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" /> Add to Focus
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleDoTodayOff}>
                {isTaskOffToday ? (
                  <>
                    <ListTodo className="mr-2 h-4 w-4" /> Mark "Do Today"
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" /> Mark "Do Today Off"
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDeleteTask(task.id)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {task.category && (
              <span className={cn("px-2 py-1 rounded-full text-xs", categoryProps.backgroundClass, categoryProps.textColor)}>
                {categories.find((cat: TaskCategory) => cat.id === task.category)?.name || 'Uncategorized'}
              </span>
            )}
            {task.priority && task.priority !== 'medium' && (
              <span className={cn(
                "px-2 py-1 rounded-full text-xs",
                task.priority === 'urgent' && "bg-red-100 text-red-800",
                task.priority === 'high' && "bg-orange-100 text-orange-800",
                task.priority === 'low' && "bg-blue-100 text-blue-800"
              )}>
                {task.priority}
              </span>
            )}
            {task.due_date && (
              <span className={cn(
                "flex items-center gap-1",
                isOverdue ? "text-red-500" : isDueToday ? "text-orange-500" : "text-muted-foreground"
              )}>
                <CalendarIcon className="h-3 w-3" />
                {format(parseISO(task.due_date), 'MMM d, yyyy')}
              </span>
            )}
          </div>

          {/* Subtasks */}
          {task.id && subtasks.length > 0 && (
            <CardContent className="pt-0 pl-8">
              <div className="space-y-2 border-l-2 pl-4">
                {subtasks.map((subtask: Task) => (
                  <TaskCard
                    key={subtask.id}
                    task={subtask}
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                    onAddSubtask={onAddSubtask}
                    onToggleFocusMode={onToggleFocusMode}
                    onLogDoTodayOff={onLogDoTodayOff}
                    categories={categories}
                    sections={sections}
                    tasks={tasks} // Pass all tasks for nested subtasks
                    doTodayOffLog={doTodayOffLog}
                  />
                ))}
              </div>
            </CardContent>
          )}
        </CardContent>
      </Card>

      <TaskOverviewDialog
        task={task}
        isOpen={isTaskOverviewOpen}
        onOpenChange={setIsTaskOverviewOpen}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onAddSubtask={onAddSubtask}
        onToggleFocusMode={onToggleFocusMode}
        onLogDoTodayOff={onLogDoTodayOff}
        categories={categories}
        sections={sections}
      />
    </>
  );
};

export default TaskCard;