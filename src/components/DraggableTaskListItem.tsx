import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface DraggableTaskListItemProps {
  task: Task;
}

const DraggableTaskListItem: React.FC<DraggableTaskListItemProps> = ({ task }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { type: 'task', task, duration: 30 }, // default duration 30 mins
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "p-2 rounded-md bg-card shadow-sm flex items-center gap-2",
        isDragging && "opacity-50"
      )}
    >
      <button {...listeners} {...attributes} className="cursor-grab touch-none">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <p className="font-semibold text-sm flex-1">{task.description}</p>
    </div>
  );
};

export default DraggableTaskListItem;