import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Task } from '@/types/supabase';
import { TaskActionProps } from '@/types/props';
import { cn } from '@/lib/utils';

export interface TaskCardProps extends TaskActionProps {
  task: Task;
  onOpenTaskDetails: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate, onDelete, onToggleComplete, onOpenTaskDetails }) => {
  const handleCheckboxChange = (checked: boolean) => {
    onToggleComplete(task.id, checked);
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <div className={cn(
      "flex items-center justify-between p-2 border-b last:border-b-0 bg-background",
      isOverdue && "bg-red-50/50 dark:bg-red-950/20"
    )}>
      <div className="flex items-center flex-grow min-w-0">
        <Checkbox
          id={`task-${task.id}`}
          checked={task.status === 'completed'}
          onCheckedChange={handleCheckboxChange}
          className="mr-2"
        />
        <label
          htmlFor={`task-${task.id}`}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-grow truncate",
            task.status === 'completed' && "line-through text-muted-foreground"
          )}
        >
          {task.description}
        </label>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" data-dnd-kit-skip-click>
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onOpenTaskDetails(task)}>View/Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onUpdate(task.id, { status: task.status === 'completed' ? 'to-do' : 'completed' })}>
            Mark as {task.status === 'completed' ? 'To Do' : 'Completed'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(task.id)}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default TaskCard;