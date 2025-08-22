"use client";

import React from 'react';
import { Task, TaskCategory } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  categories: TaskCategory[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, categories, onEdit, onDelete, onUpdate }) => {
  const category = categories.find(cat => cat.id === task.category);
  const categoryColor = category?.color || 'gray';

  const handleToggleComplete = () => {
    onUpdate(task.id, { status: task.status === 'completed' ? 'to-do' : 'completed' });
  };

  return (
    <Card className={cn(
      "relative group",
      task.status === 'completed' && "opacity-60 line-through"
    )}>
      <CardContent className="p-4 flex items-center space-x-3">
        <Checkbox
          checked={task.status === 'completed'}
          onCheckedChange={handleToggleComplete}
          className="flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-lg truncate">{task.description}</p>
          {category && (
            <span className={`px-2 py-1 rounded-full text-xs text-white`} style={{ backgroundColor: categoryColor }}>
              {category.name}
            </span>
          )}
          {task.due_date && (
            <span className="text-xs text-muted-foreground ml-2">
              Due: {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
};