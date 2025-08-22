"use client";

import React from 'react';
import { Task, TaskCategory } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, Calendar, StickyNote, FolderOpen, Repeat, Link as LinkIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useSound } from '@/context/SoundContext'; // Assuming SoundContext exists

interface TaskItemProps {
  task: Task;
  categories: TaskCategory[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  allTasks?: Task[]; // For subtasks, if needed
  isSubtask?: boolean;
  onStatusChange?: (taskId: string, newStatus: Task['status']) => void; // Added for Archive/Calendar pages
  onOpenOverview?: (task: Task) => void; // Added for DailyTasksV3
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  categories,
  onEdit,
  onDelete,
  onUpdate,
  allTasks = [],
  isSubtask = false,
  onStatusChange,
  onOpenOverview,
}) => {
  const { playSound } = useSound();
  const category = categories.find(cat => cat.id === task.category);
  const categoryColor = category?.color || 'gray';

  const handleToggleComplete = () => {
    const newStatus = task.status === 'completed' ? 'to-do' : 'completed';
    if (onStatusChange) {
      onStatusChange(task.id, newStatus);
    } else {
      onUpdate(task.id, { status: newStatus });
    }
    if (newStatus === 'completed') {
      playSound('complete');
    }
  };

  const subtasks = allTasks.filter(sub => sub.parent_task_id === task.id);

  return (
    <div className={cn(
      "flex items-start space-x-3 p-3 rounded-lg border bg-card transition-all duration-200 ease-in-out group",
      task.status === 'completed' && "opacity-60 line-through",
      isSubtask && "ml-6 border-l-2 border-muted-foreground/30"
    )}>
      <Checkbox
        checked={task.status === 'completed'}
        onCheckedChange={handleToggleComplete}
        className="flex-shrink-0 mt-1"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-base break-words">{task.description}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
          {category && (
            <span className={`px-2 py-0.5 rounded-full text-xs text-white`} style={{ backgroundColor: categoryColor }}>
              {category.name}
            </span>
          )}
          {task.due_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
          {task.notes && (
            <span className="flex items-center gap-1">
              <StickyNote className="h-3 w-3" /> Notes
            </span>
          )}
          {task.section_id && (
            <span className="flex items-center gap-1">
              <FolderOpen className="h-3 w-3" /> Section
            </span>
          )}
          {task.recurring_type && task.recurring_type !== 'none' && (
            <span className="flex items-center gap-1">
              <Repeat className="h-3 w-3" /> {task.recurring_type}
            </span>
          )}
          {task.link && (
            <a href={task.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
              <LinkIcon className="h-3 w-3" /> Link
            </a>
          )}
        </div>
        {subtasks.length > 0 && (
          <div className="mt-2 space-y-1">
            {subtasks.map(subtask => (
              <TaskItem
                key={subtask.id}
                task={subtask}
                categories={categories}
                onEdit={onEdit}
                onDelete={onDelete}
                onUpdate={onUpdate}
                allTasks={allTasks}
                isSubtask={true}
                onStatusChange={onStatusChange}
                onOpenOverview={onOpenOverview}
              />
            ))}
          </div>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(task)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
          {onOpenOverview && (
            <DropdownMenuItem onClick={() => onOpenOverview(task)}>
              <ListTodo className="mr-2 h-4 w-4" /> Overview
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default TaskItem;