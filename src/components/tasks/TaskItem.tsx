import React from 'react';
import { Task, TaskSection } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, MoreHorizontal, Edit, Trash2, Flag, Star } from 'lucide-react'; // Removed Check, X
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format, isToday, isPast, parseISO } from 'date-fns';

// Removed unused imports: Popover, PopoverContent, PopoverTrigger

interface TaskItemProps {
  task: Task;
  onToggleComplete: (taskId: string, newStatus: 'completed' | 'to-do') => void;
  onOpenOverview: (task: Task) => void;
  onOpenEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  sections: TaskSection[];
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onOpenOverview,
  onOpenEdit,
  onDelete,
  sections,
}) => {
  const isCompleted = task.status === 'completed';
  const section = sections.find(s => s.id === task.section_id);

  const dueDate = task.due_date ? parseISO(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !isCompleted;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-priority-urgent';
      case 'high': return 'text-priority-high';
      case 'medium': return 'text-priority-medium';
      case 'low': return 'text-priority-low';
      default: return 'text-gray-500';
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card shadow-sm transition-all hover:shadow-md",
        isCompleted && "opacity-70 line-through"
      )}
      style={{ borderLeft: `4px solid ${task.color || '#3b82f6'}` }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0 rounded-full"
        onClick={() => onToggleComplete(task.id, isCompleted ? 'to-do' : 'completed')}
        aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </Button>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpenOverview(task)}>
        <p className="font-medium truncate">{task.description}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          {section && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.color || '#3b82f6' }} />
                  {section.name}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Task in section: {section.name}
              </TooltipContent>
            </Tooltip>
          )}
          {task.priority !== 'medium' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Flag className={cn("h-4 w-4", getPriorityColor(task.priority))} />
              </TooltipTrigger>
              <TooltipContent>
                Priority: {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </TooltipContent>
            </Tooltip>
          )}
          {task.is_all_day && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Star className="h-4 w-4 text-yellow-500" />
              </TooltipTrigger>
              <TooltipContent>
                All Day Task
              </TooltipContent>
            </Tooltip>
          )}
          {dueDate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn("text-xs", isOverdue && "text-destructive font-semibold")}>
                  Due: {format(dueDate, 'MMM d')}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Due Date: {format(dueDate, 'PPP')}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onOpenEdit(task)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default TaskItem;