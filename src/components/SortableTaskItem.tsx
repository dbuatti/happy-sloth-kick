import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskItem from './TaskItem';
import { DraggableAttributes } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react'; // Import GripVertical for the drag handle
import { Button } from '@/components/ui/button'; // Import Button for the drag handle
import { cn } from '@/lib/utils'; // Import cn for class merging

// Define a local type for dnd-kit listeners
type DndListeners = Record<string, ((event: any) => void) | undefined>;

interface Task {
  id: string;
  description: string;
  status: 'to-do' | 'completed' | 'skipped' | 'archived';
  recurring_type: 'none' | 'daily' | 'weekly' | 'monthly';
  created_at: string;
  user_id: string;
  category: string;
  priority: string;
  due_date: string | null;
  notes: string | null;
  remind_at: string | null;
  section_id: string | null;
  order: number | null;
}

interface TaskSection {
  id: string;
  name: string;
  user_id: string;
  order: number | null;
}

interface SortableTaskItemProps {
  task: Task;
  userId: string | null;
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  isSelected: boolean;
  onToggleSelect: (taskId: string, checked: boolean) => void;
  sections: TaskSection[];
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  userId,
  onStatusChange,
  onDelete,
  onUpdate,
  isSelected,
  onToggleSelect,
  sections,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task' } }); // Add data.type for identification

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto', // Bring dragged item to front
    opacity: isDragging ? 0.8 : 1, // Make dragged item slightly transparent
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-lg p-3 transition-all duration-200 ease-in-out",
        "bg-card dark:bg-gray-800",
        task.status === 'completed' ? "border-green-300 dark:border-green-700" : "border-border", // Highlight completed
        "group relative", // Keep group for hover effects
        "hover:shadow-md", // Subtle shadow on hover
      )}
    >
      {/* Drag Handle */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners as DndListeners} // Cast to our local type
        onClick={(e) => e.stopPropagation()} // Prevent checkbox/edit from triggering on drag handle click
        aria-label="Drag task"
      >
        <GripVertical className="h-4 w-4" />
      </Button>
      <TaskItem 
        task={task} 
        userId={userId}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        onUpdate={onUpdate}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        sections={sections}
        // No longer passing dragAttributes or dragListeners to TaskItem
      />
    </li>
  );
};

export default SortableTaskItem;