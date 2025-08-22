import React from 'react';
import { DraggableProvided } from '@hello-pangea/dnd'; // Import DraggableProvided
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Task } from '@/types';
import { cn } from '@/lib/utils'; // Assuming cn is available for class merging

export interface TaskCardProps { // Export the interface
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  provided: DraggableProvided; // Add provided prop
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, index, onEdit, onDelete, provided }) => {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      onTouchStart={(e) => e.preventDefault()} // Prevent default touch start behavior for dragging
      onTouchMove={(e) => e.preventDefault()} // Prevent default touch move behavior for dragging
      className={cn(
        "bg-white p-4 mb-2 rounded shadow touch-action-none", // Added touch-action-none
      )}
    >
      <div className="flex justify-between items-center">
        <label {...provided.dragHandleProps} className="flex-1">
          {task.description}
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation(); // Prevent drag from starting
                e.preventDefault(); // Prevent default browser behavior
              }}
              onTouchStart={(e) => {
                e.stopPropagation(); // Prevent drag from starting
                e.preventDefault(); // Prevent default browser behavior
              }}
              className="touch-action-manipulation" // Added touch-action-manipulation
            >
              ⋮
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent onClick={(e) => e.stopPropagation()}> {/* Stop propagation for dropdown content too */}
            <DropdownMenuItem onClick={() => onEdit(task)}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(task.id)}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};