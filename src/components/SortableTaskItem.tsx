import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskItem from './TaskItem';
import { DraggableAttributes } from '@dnd-kit/core'; // Keep DraggableAttributes

// Define SyntheticListeners type locally
type SyntheticListeners = {
  [key: string]: EventListener;
};

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
  ...props
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto', // Bring dragged item to front
    opacity: isDragging ? 0.8 : 1, // Make dragged item slightly transparent
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem 
        task={task} 
        dragAttributes={attributes} 
        dragListeners={listeners} 
        {...props} 
      />
    </div>
  );
};

export default SortableTaskItem;